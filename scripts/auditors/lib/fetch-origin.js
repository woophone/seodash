/**
 * Fetch HTML from WordPress origin IP, bypassing Cloudflare.
 * Uses curl with --resolve to handle SNI correctly.
 * Falls back to SSH + wp-cli if origin fetch fails (Cloudflare challenge).
 */
import { execSync } from 'child_process';

const ORIGIN_IP = '35.215.73.125';

/**
 * Detect Cloudflare challenge or block in HTML response.
 */
function isCloudflareBlocked(html) {
  if (!html || html.length < 100) return false;
  return html.includes('cf-browser-verification') ||
    html.includes('cf-challenge') ||
    html.includes('Attention Required! | Cloudflare') ||
    html.includes('Just a moment...') ||
    (html.includes('cloudflare') && html.includes('challenge-platform'));
}

/**
 * Build the SSH command prefix using CS_SSH_* env vars.
 */
function sshCommand(remoteCmd) {
  const { CS_SSH_HOST, CS_SSH_USER, CS_SSH_PORT, CS_SSH_KEY, CS_SSH_PASS } = process.env;
  if (!CS_SSH_HOST || !CS_SSH_USER || !CS_SSH_PORT || !CS_SSH_KEY || !CS_SSH_PASS) {
    return null; // SSH not configured
  }
  return `sshpass -P "passphrase" -p "${CS_SSH_PASS}" ssh -i "${CS_SSH_KEY}" -p ${CS_SSH_PORT} -o StrictHostKeyChecking=no -o ConnectTimeout=15 ${CS_SSH_USER}@${CS_SSH_HOST} "${remoteCmd}"`;
}

/**
 * Fetch page HTML via SSH + wp-cli (fallback).
 * Uses wp post list to find the post/page by URL path, then gets its content.
 */
function fetchViaSSH(pageUrl, domain) {
  const url = new URL(pageUrl);
  const path = url.pathname.replace(/^\/|\/$/g, '');
  const wpRoot = '~/www/compulsionsolutions.com/public_html';

  // Try fetching the full rendered page via curl on the remote server (localhost)
  const remoteCmd = `cd ${wpRoot} && curl -s --max-time 15 -H 'Host: ${domain}' http://localhost${url.pathname}`;
  const cmd = sshCommand(remoteCmd);
  if (!cmd) throw new Error('SSH not configured — set CS_SSH_* env vars');

  try {
    const html = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 30000 });
    if (html && html.includes('<html')) {
      console.log(`  [fetch-origin] SSH fallback successful for ${url.pathname}`);
      return { html, statusCode: 200, method: 'ssh' };
    }
  } catch {
    // localhost curl failed, try wp-cli eval
  }

  // Fallback: use wp-cli to get post content by slug
  const wpCmd = `cd ${wpRoot} && wp post list --post_type=post,page --name=${path} --field=ID 2>/dev/null`;
  const idCmd = sshCommand(wpCmd);
  if (!idCmd) throw new Error('SSH not configured');

  try {
    const postId = execSync(idCmd, { encoding: 'utf-8', timeout: 15000 }).trim();
    if (postId) {
      const contentCmd = sshCommand(`cd ${wpRoot} && wp post get ${postId} --field=post_content 2>/dev/null`);
      const content = execSync(contentCmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 15000 });
      // Wrap in minimal HTML so auditors can parse it
      const html = `<html><head><title></title></head><body><article>${content}</article></body></html>`;
      console.log(`  [fetch-origin] SSH wp-cli fallback for ${url.pathname} (post ID: ${postId})`);
      return { html, statusCode: 200, method: 'ssh-wpcli' };
    }
  } catch {
    // wp-cli failed too
  }

  throw new Error(`SSH fallback failed for ${pageUrl}`);
}

export function fetchOriginHTML(pageUrl, domain = 'compulsionsolutions.com') {
  const url = new URL(pageUrl);
  const fullUrl = `https://${domain}${url.pathname}${url.search}`;

  try {
    const html = execSync(
      `curl -s --max-time 15 --resolve "${domain}:443:${ORIGIN_IP}" "${fullUrl}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    // Check for Cloudflare challenge
    if (isCloudflareBlocked(html)) {
      console.log(`  [fetch-origin] Cloudflare challenge detected for ${url.pathname}, falling back to SSH`);
      return fetchViaSSH(pageUrl, domain);
    }

    return { html, statusCode: 200, method: 'origin-ip' };
  } catch (err) {
    // Origin fetch failed entirely — try SSH fallback
    console.log(`  [fetch-origin] Origin fetch failed for ${url.pathname}: ${err.message}, trying SSH fallback`);
    try {
      return fetchViaSSH(pageUrl, domain);
    } catch (sshErr) {
      throw new Error(`Failed to fetch ${fullUrl}: origin (${err.message}), SSH (${sshErr.message})`);
    }
  }
}

export function fetchOriginRobotsTxt(domain = 'compulsionsolutions.com') {
  try {
    const txt = execSync(
      `curl -s --max-time 10 --resolve "${domain}:443:${ORIGIN_IP}" "https://${domain}/robots.txt"`,
      { encoding: 'utf-8' }
    );
    if (isCloudflareBlocked(txt)) {
      // Fallback: get robots.txt via SSH
      const cmd = sshCommand(`cat ~/www/compulsionsolutions.com/public_html/robots.txt 2>/dev/null`);
      if (cmd) return execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    }
    return txt;
  } catch {
    return null;
  }
}

export function fetchOriginSitemap(domain = 'compulsionsolutions.com') {
  try {
    const xml = execSync(
      `curl -s --max-time 10 --resolve "${domain}:443:${ORIGIN_IP}" "https://${domain}/sitemap.xml"`,
      { encoding: 'utf-8' }
    );
    if (isCloudflareBlocked(xml)) {
      const cmd = sshCommand(`cat ~/www/compulsionsolutions.com/public_html/sitemap.xml 2>/dev/null`);
      if (cmd) return execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
    }
    return xml;
  } catch {
    return null;
  }
}
