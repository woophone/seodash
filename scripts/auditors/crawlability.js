/**
 * Crawlability & Indexability Auditor
 *
 * Checks robots.txt, meta robots, canonical, response status, and sitemap inclusion.
 */

import { fetchOriginHTML, fetchOriginRobotsTxt, fetchOriginSitemap } from './lib/fetch-origin.js';

function parseRobotsTxt(robotsTxt) {
  const rules = [];
  let currentAgent = '*';

  for (const rawLine of robotsTxt.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const agentMatch = line.match(/^User-agent:\s*(.+)/i);
    if (agentMatch) {
      currentAgent = agentMatch[1].trim();
      continue;
    }

    const disallowMatch = line.match(/^Disallow:\s*(.*)/i);
    if (disallowMatch) {
      rules.push({
        agent: currentAgent,
        type: 'disallow',
        path: disallowMatch[1].trim(),
      });
      continue;
    }

    const allowMatch = line.match(/^Allow:\s*(.*)/i);
    if (allowMatch) {
      rules.push({
        agent: currentAgent,
        type: 'allow',
        path: allowMatch[1].trim(),
      });
    }
  }

  return rules;
}

function isPathBlocked(rules, path) {
  // Check both wildcard agent and Googlebot specifically
  const relevantRules = rules.filter(r =>
    r.agent === '*' || r.agent.toLowerCase() === 'googlebot'
  );

  // Sort by specificity (longer paths first)
  const sorted = relevantRules.sort((a, b) => b.path.length - a.path.length);

  for (const rule of sorted) {
    if (!rule.path) continue;

    // Simple path prefix matching (not full glob support)
    if (rule.path === '/' && rule.type === 'disallow') {
      // Disallow: / blocks everything unless there's a more specific Allow
      const hasAllow = sorted.some(r =>
        r.type === 'allow' && path.startsWith(r.path) && r.path.length > 1
      );
      if (!hasAllow) return true;
    }

    if (path.startsWith(rule.path)) {
      return rule.type === 'disallow';
    }
  }

  return false;
}

function extractSitemapUrls(sitemapXml) {
  const urls = [];
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  let match;
  while ((match = locRegex.exec(sitemapXml)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

export default function audit(db, clientId, pageUrl, options = {}) {
  const domain = options.domain || 'compulsionsolutions.com';
  const url = new URL(pageUrl);
  const path = url.pathname;

  let score = 100;
  const checks = [];

  // --- 1. Fetch robots.txt ---
  let robotsTxt = null;
  let robotsRules = [];
  let robotsBlocked = false;

  try {
    const txt = fetchOriginRobotsTxt(domain);
    if (txt) {
      robotsTxt = txt;
      robotsRules = parseRobotsTxt(robotsTxt);
      robotsBlocked = isPathBlocked(robotsRules, path);

      checks.push({
        name: 'robots.txt',
        status: robotsBlocked ? 'blocked' : 'allowed',
        detail: robotsBlocked
          ? `Page is BLOCKED by robots.txt rules`
          : 'Page is allowed by robots.txt',
      });

      if (robotsBlocked) {
        score -= 30;
      }
    } else {
      checks.push({
        name: 'robots.txt',
        status: 'not_found',
        detail: `robots.txt not available`,
      });
    }
  } catch (err) {
    checks.push({
      name: 'robots.txt',
      status: 'error',
      detail: `Failed to fetch: ${err.message}`,
    });
  }

  // --- 2. Fetch the page itself ---
  let html = null;
  let statusCode = null;

  try {
    const result = fetchOriginHTML(pageUrl, domain);
    statusCode = result.statusCode;
    html = result.html;

    checks.push({
      name: 'status_code',
      status: statusCode === 200 ? 'ok' : 'issue',
      detail: `HTTP ${statusCode}`,
    });

    if (statusCode !== 200) {
      score -= 20;
    }
  } catch (err) {
    checks.push({
      name: 'status_code',
      status: 'error',
      detail: `Failed to fetch page: ${err.message}`,
    });
    score -= 30;
  }

  // --- 3. Check meta robots ---
  let metaRobots = null;
  let hasNoindex = false;

  if (html) {
    const metaMatch = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']robots["']/i);

    if (metaMatch) {
      metaRobots = metaMatch[1].toLowerCase();
      hasNoindex = metaRobots.includes('noindex');

      checks.push({
        name: 'meta_robots',
        status: hasNoindex ? 'noindex' : 'ok',
        detail: `meta robots: "${metaRobots}"`,
      });

      if (hasNoindex) {
        score -= 40;
      }
    } else {
      checks.push({
        name: 'meta_robots',
        status: 'not_found',
        detail: 'No meta robots tag found (defaults to index,follow)',
      });
    }

    // Also check Googlebot-specific meta
    const googlebotMeta = html.match(/<meta\s+name=["']googlebot["']\s+content=["']([^"']+)["']/i);
    if (googlebotMeta) {
      const gbContent = googlebotMeta[1].toLowerCase();
      if (gbContent.includes('noindex')) {
        checks.push({
          name: 'googlebot_meta',
          status: 'noindex',
          detail: `Googlebot meta: "${gbContent}"`,
        });
        if (!hasNoindex) {
          score -= 40;
        }
      }
    }

    // --- 4. Check canonical ---
    const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)
      || html.match(/<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i);

    if (canonical) {
      const canonicalUrl = canonical[1];
      const canonicalNorm = canonicalUrl.replace(/\/$/, '');
      const pageNorm = pageUrl.replace(/\/$/, '');
      const isCorrect = canonicalNorm === pageNorm;

      checks.push({
        name: 'canonical',
        status: isCorrect ? 'ok' : 'mismatch',
        detail: `Canonical: ${canonicalUrl} ${isCorrect ? '(matches)' : '(MISMATCH)'}`,
      });

      if (!isCorrect) {
        score -= 10;
      }
    } else {
      checks.push({
        name: 'canonical',
        status: 'missing',
        detail: 'No canonical link tag found',
      });
      score -= 10;
    }
  }

  // --- 5. Check sitemap ---
  let inSitemap = false;

  try {
    const sitemapXml = fetchOriginSitemap(domain);
    if (sitemapXml) {
      const sitemapUrls = extractSitemapUrls(sitemapXml);

      // Check if page URL (or variants) is in sitemap
      inSitemap = sitemapUrls.some(sUrl => {
        const norm = sUrl.replace(/\/$/, '');
        return norm === pageUrl.replace(/\/$/, '') ||
               norm === `https://${domain}${path}`.replace(/\/$/, '') ||
               norm === `http://${domain}${path}`.replace(/\/$/, '');
      });

      checks.push({
        name: 'sitemap',
        status: inSitemap ? 'included' : 'missing',
        detail: inSitemap
          ? 'Page found in sitemap.xml'
          : `Page NOT found in sitemap.xml (${sitemapUrls.length} URLs in sitemap)`,
      });

      if (!inSitemap) {
        score -= 10;
      }
    } else {
      checks.push({
        name: 'sitemap',
        status: 'not_found',
        detail: `sitemap.xml not available`,
      });
    }
  } catch (err) {
    checks.push({
      name: 'sitemap',
      status: 'error',
      detail: `Failed to check sitemap: ${err.message}`,
    });
  }

  score = Math.max(0, Math.min(100, score));

  const criticalChecks = checks.filter(c => c.status === 'blocked' || c.status === 'noindex');
  const passedChecks = checks.filter(c => c.status === 'ok' || c.status === 'allowed' || c.status === 'included');
  const summary = criticalChecks.length > 0
    ? `CRITICAL: ${criticalChecks.map(c => c.detail).join('; ')}. ${passedChecks.length}/${checks.length} checks passed.`
    : `${checks.filter(c => c.status === 'ok' || c.status === 'allowed' || c.status === 'included' || c.status === 'not_found').length}/${checks.length} crawlability checks passed. No issues.`;

  const findings = {
    checks,
    statusCode,
    robotsBlocked,
    metaRobots,
    hasNoindex,
    inSitemap,
  };

  return { summary, score, findings };
}
