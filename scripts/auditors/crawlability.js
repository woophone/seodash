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
  const actionItems = [];

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
        actionItems.push({
          severity: 'critical',
          title: 'Page blocked by robots.txt',
          detail: `The path "${path}" is disallowed by robots.txt rules. Search engines will not crawl this page.`,
          currentState: 'Blocked by robots.txt',
          targetState: 'Allowed by robots.txt (or intentionally blocked)',
        });
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
      actionItems.push({
        severity: 'critical',
        title: `Page returns HTTP ${statusCode}`,
        detail: `Expected HTTP 200 but got ${statusCode}. ${statusCode === 301 || statusCode === 302 ? 'The page redirects elsewhere.' : statusCode === 404 ? 'Page not found.' : 'Unexpected status code.'}`,
        currentState: `HTTP ${statusCode}`,
        targetState: 'HTTP 200',
      });
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
        actionItems.push({
          severity: 'critical',
          title: 'Page has noindex meta tag',
          detail: `The page has <meta name="robots" content="${metaRobots}">. This tells search engines NOT to index this page. It will not appear in search results.`,
          currentState: `meta robots: ${metaRobots}`,
          targetState: 'Remove noindex (if page should be indexed)',
        });
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
          actionItems.push({
            severity: 'critical',
            title: 'Googlebot-specific noindex tag',
            detail: `A <meta name="googlebot" content="${gbContent}"> tag blocks Google specifically from indexing this page.`,
            currentState: `Googlebot meta: ${gbContent}`,
            targetState: 'Remove Googlebot noindex',
          });
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
        actionItems.push({
          severity: 'medium',
          title: 'Canonical URL mismatch',
          detail: `Canonical points to "${canonicalUrl}" instead of "${pageUrl}". This may cause Google to index the wrong URL or consolidate signals away from this page.`,
          currentState: `Canonical: ${canonicalUrl}`,
          targetState: `Canonical: ${pageUrl}`,
        });
      }
    } else {
      checks.push({
        name: 'canonical',
        status: 'missing',
        detail: 'No canonical link tag found',
      });
      score -= 10;
      actionItems.push({
        severity: 'medium',
        title: 'Missing canonical tag',
        detail: 'No self-referencing canonical URL found. This leaves the page vulnerable to duplicate content issues.',
        currentState: 'No canonical tag',
        targetState: 'Self-referencing canonical URL',
      });
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
        actionItems.push({
          severity: 'medium',
          title: 'Page not in sitemap.xml',
          detail: `The page URL was not found in the sitemap. While not required, sitemap inclusion helps search engines discover and crawl pages.`,
          currentState: 'Not in sitemap',
          targetState: 'Listed in sitemap.xml',
        });
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

  const criticalIssues = actionItems.filter(a => a.severity === 'critical');
  const summary = criticalIssues.length > 0
    ? `CRITICAL: ${criticalIssues.map(a => a.title).join('; ')}. ${checks.filter(c => c.status === 'ok' || c.status === 'allowed' || c.status === 'included').length}/${checks.length} checks passed.`
    : `${checks.filter(c => c.status === 'ok' || c.status === 'allowed' || c.status === 'included' || c.status === 'not_found').length}/${checks.length} crawlability checks passed. ${actionItems.length > 0 ? `${actionItems.length} issue(s) found.` : 'No issues.'}`;

  const findings = {
    checks,
    statusCode,
    robotsBlocked,
    metaRobots,
    hasNoindex,
    inSitemap,
  };

  return { summary, score, findings, actionItems };
}
