/**
 * Fetch HTML from WordPress origin IP, bypassing Cloudflare.
 * Uses curl with --resolve to handle SNI correctly.
 */
import { execSync } from 'child_process';

const ORIGIN_IP = '35.215.73.125';

export function fetchOriginHTML(pageUrl, domain = 'compulsionsolutions.com') {
  const url = new URL(pageUrl);
  const fullUrl = `https://${domain}${url.pathname}${url.search}`;

  try {
    const html = execSync(
      `curl -s --max-time 15 --resolve "${domain}:443:${ORIGIN_IP}" "${fullUrl}"`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return { html, statusCode: 200 };
  } catch (err) {
    throw new Error(`Failed to fetch ${fullUrl}: ${err.message}`);
  }
}

export function fetchOriginRobotsTxt(domain = 'compulsionsolutions.com') {
  try {
    const txt = execSync(
      `curl -s --max-time 10 --resolve "${domain}:443:${ORIGIN_IP}" "https://${domain}/robots.txt"`,
      { encoding: 'utf-8' }
    );
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
    return xml;
  } catch {
    return null;
  }
}
