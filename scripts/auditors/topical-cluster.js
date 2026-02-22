/**
 * Topical Cluster Auditor
 *
 * Checks outbound internal links in the content area.
 * Assesses whether the page is connected to a topical cluster.
 */

import { fetchOriginHTML } from './lib/fetch-origin.js';

function stripHtmlTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractContentArea(html) {
  // Oxygen Builder content
  const oxygenMatch = html.match(/<div[^>]*class="[^"]*ct-section-inner-wrap[^"]*"[^>]*>([\s\S]*)/i);
  if (oxygenMatch) {
    let content = oxygenMatch[1];
    const footerIdx = content.search(/<footer/i);
    if (footerIdx !== -1) content = content.substring(0, footerIdx);
    return content;
  }

  // Standard patterns
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];

  // H1-based extraction
  const h1Match = html.match(/<h1[^>]*>/i);
  if (h1Match) {
    const h1Idx = html.indexOf(h1Match[0]);
    let content = html.substring(h1Idx);
    const endPatterns = [/<footer/i, /<div[^>]*class="[^"]*sidebar[^"]*"/i];
    for (const pattern of endPatterns) {
      const endIdx = content.search(pattern);
      if (endIdx !== -1) {
        content = content.substring(0, endIdx);
        break;
      }
    }
    return content;
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

export default function audit(db, clientId, pageUrl, options = {}) {
  const domain = options.domain || 'compulsionsolutions.com';

  let html;
  try {
    ({ html } = fetchOriginHTML(pageUrl, domain));
  } catch (err) {
    return {
      summary: `Failed to fetch page: ${err.message}`,
      score: null,
      findings: { error: err.message },
    };
  }

  const contentArea = extractContentArea(html);
  const contentText = stripHtmlTags(contentArea);
  const wordCount = contentText.split(/\s+/).filter(w => w.length > 0).length;

  // --- Extract links from content area ---
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const internalLinks = [];
  const externalLinks = [];
  let linkMatch;

  while ((linkMatch = linkRegex.exec(contentArea)) !== null) {
    const href = linkMatch[1];
    const anchorText = stripHtmlTags(linkMatch[2]);

    // Skip anchors, javascript, mailto, tel
    if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      continue;
    }

    if (href.startsWith('/') || href.includes(domain)) {
      // Internal link
      let linkPath;
      try {
        if (href.startsWith('/')) {
          linkPath = href;
        } else {
          linkPath = new URL(href).pathname;
        }
      } catch {
        linkPath = href;
      }

      // Skip self-links
      const selfPath = new URL(pageUrl).pathname.replace(/\/$/, '');
      if (linkPath.replace(/\/$/, '') === selfPath) continue;

      internalLinks.push({
        href,
        path: linkPath,
        anchorText,
        isContextual: anchorText.length > 3, // Not just an icon or single char
      });
    } else if (href.startsWith('http')) {
      externalLinks.push({
        href,
        anchorText,
        domain: (() => { try { return new URL(href).hostname; } catch { return href; } })(),
      });
    }
  }

  // Count contextual internal links (non-trivial anchor text)
  const contextualInternalLinks = internalLinks.filter(l => l.isContextual);

  // --- Check for links to known site pages (from DB) ---
  const sitePages = db.prepare(`
    SELECT DISTINCT page_url FROM page_snapshots WHERE client_id = ?
  `).all(clientId).map(r => new URL(r.page_url).pathname.replace(/\/$/, ''));

  const linksToTrackedPages = internalLinks.filter(l => {
    const linkPath = l.path.replace(/\/$/, '');
    return sitePages.includes(linkPath);
  });

  // --- Scoring based on outbound internal link count ---
  const outboundCount = contextualInternalLinks.length;
  let score;

  if (outboundCount === 0) score = 20;
  else if (outboundCount <= 2) score = 50;
  else if (outboundCount <= 5) score = 75;
  else score = 90;

  // Links per 1000 words ratio
  const linksPer1000 = wordCount > 0 ? (contextualInternalLinks.length / wordCount) * 1000 : 0;

  const summary = `${contextualInternalLinks.length} contextual internal link(s) in content area (${wordCount} words). ${linksPer1000.toFixed(1)} links per 1000 words. ${linksToTrackedPages.length} link(s) to tracked pages. ${externalLinks.length} external link(s).`;

  const findings = {
    wordCount,
    internalLinks: {
      total: internalLinks.length,
      contextual: contextualInternalLinks.length,
      linksPer1000Words: Math.round(linksPer1000 * 10) / 10,
      toTrackedPages: linksToTrackedPages.length,
      details: internalLinks.map(l => ({
        href: l.href,
        anchorText: l.anchorText,
        isContextual: l.isContextual,
      })),
    },
    externalLinks: {
      total: externalLinks.length,
      domains: [...new Set(externalLinks.map(l => l.domain))],
      details: externalLinks.map(l => ({
        href: l.href,
        anchorText: l.anchorText,
        domain: l.domain,
      })),
    },
  };

  return { summary, score, findings };
}
