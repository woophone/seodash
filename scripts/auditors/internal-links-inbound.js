/**
 * Internal Links — Inbound Auditor
 *
 * Uses WP REST API to scan posts for links to the target page.
 * Detects orphan status, counts inbound links, extracts anchor text.
 */

const PAGES_ENDPOINT = '/wp-json/wp/v2/pages';
const POSTS_ENDPOINT = '/wp-json/wp/v2/posts';

function stripHtmlTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchWPResults(host, domain, user, pass, endpoint, searchTerm) {
  const searchUrl = `http://${host}${endpoint}?search=${encodeURIComponent(searchTerm)}&per_page=100&_fields=id,title,link,content`;

  const headers = {
    'Host': domain,
  };

  if (user && pass) {
    headers['Authorization'] = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  }

  const response = await fetch(searchUrl, { headers });

  if (!response.ok) {
    throw new Error(`WP REST API error (${endpoint}): ${response.status}`);
  }

  return await response.json();
}

function extractLinksToTarget(content, targetPath, domain) {
  const links = [];
  // Match all anchor tags
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1];
    const anchorHtml = match[2];
    const anchorText = stripHtmlTags(anchorHtml);

    // Check if this link points to the target page
    const normalizedHref = href.replace(/\/$/, '');
    const normalizedTarget = targetPath.replace(/\/$/, '');

    const isMatch =
      normalizedHref === normalizedTarget ||
      normalizedHref === `https://${domain}${normalizedTarget}` ||
      normalizedHref === `http://${domain}${normalizedTarget}` ||
      normalizedHref === `https://${domain}${normalizedTarget}/` ||
      normalizedHref === `http://${domain}${normalizedTarget}/` ||
      href.includes(normalizedTarget);

    if (isMatch) {
      links.push({ href, anchorText });
    }
  }

  return links;
}

export default async function audit(db, clientId, pageUrl, options = {}) {
  const domain = options.domain || 'compulsionsolutions.com';
  const host = process.env.CS_WP_HOST || '35.215.73.125';
  const user = process.env.CS_WP_USER;
  const pass = process.env.CS_WP_PASS;

  const url = new URL(pageUrl);
  const path = url.pathname;

  // Also search by slug (last path segment without slashes)
  const slug = path.replace(/^\/|\/$/g, '').split('/').pop();

  const linkingPosts = [];
  const errors = [];

  // Search posts and pages for the target path
  const searchTerms = [path, slug];
  const seenIds = new Set();

  for (const searchTerm of searchTerms) {
    for (const endpoint of [POSTS_ENDPOINT, PAGES_ENDPOINT]) {
      try {
        const results = await fetchWPResults(host, domain, user, pass, endpoint, searchTerm);

        for (const item of results) {
          if (seenIds.has(item.id)) continue;

          const content = item.content?.rendered || '';
          const links = extractLinksToTarget(content, path, domain);

          if (links.length > 0) {
            seenIds.add(item.id);
            linkingPosts.push({
              id: item.id,
              title: item.title?.rendered || `Post #${item.id}`,
              url: item.link,
              linksToTarget: links,
              linkCount: links.length,
              anchorTexts: links.map(l => l.anchorText),
            });
          }
        }
      } catch (err) {
        errors.push(`${endpoint} search "${searchTerm}": ${err.message}`);
      }
    }
  }

  // Exclude self-links (the target page linking to itself)
  const externalLinks = linkingPosts.filter(post => {
    const postPath = new URL(post.url).pathname.replace(/\/$/, '');
    return postPath !== path.replace(/\/$/, '');
  });

  const totalInboundLinks = externalLinks.reduce((sum, post) => sum + post.linkCount, 0);
  const uniqueSourcePages = externalLinks.length;

  // Orphan detection: < 3 inbound links = deficit
  const isOrphan = uniqueSourcePages < 3;

  // --- Scoring ---
  let score;
  if (uniqueSourcePages === 0) score = 0;
  else if (uniqueSourcePages <= 2) score = 20;
  else if (uniqueSourcePages <= 5) score = 50;
  else if (uniqueSourcePages <= 10) score = 70;
  else score = 90;

  // Collect all anchor texts
  const allAnchorTexts = externalLinks.flatMap(post => post.anchorTexts);
  const uniqueAnchorTexts = [...new Set(allAnchorTexts)];

  const summary = `${uniqueSourcePages} page(s) link to this URL with ${totalInboundLinks} total link(s). ${isOrphan ? 'ORPHAN PAGE — critical linking deficit.' : 'Adequate internal linking.'} Anchor texts: ${uniqueAnchorTexts.slice(0, 3).map(t => `"${t}"`).join(', ') || 'none'}.`;

  const findings = {
    totalInboundLinks,
    uniqueSourcePages,
    isOrphan,
    linkingPosts: externalLinks.map(post => ({
      id: post.id,
      title: stripHtmlTags(post.title),
      url: post.url,
      linkCount: post.linkCount,
      anchorTexts: post.anchorTexts,
    })),
    allAnchorTexts: uniqueAnchorTexts,
    errors: errors.length > 0 ? errors : undefined,
  };

  // --- Action items ---
  const actionItems = [];

  if (uniqueSourcePages === 0) {
    actionItems.push({
      severity: 'critical',
      title: 'Complete orphan page — zero inbound internal links',
      detail: 'No other page on the site links to this URL. Orphan pages are nearly invisible to search engines because they cannot be discovered through crawling.',
      currentState: '0 inbound internal links',
      targetState: 'At least 3-5 contextual internal links from related posts',
    });
  } else if (isOrphan) {
    actionItems.push({
      severity: 'high',
      title: `Near-orphan: only ${uniqueSourcePages} page(s) link here`,
      detail: `With only ${uniqueSourcePages} source page(s), this URL has a critical linking deficit. Google uses internal link signals for crawl priority and topic authority.`,
      currentState: `${uniqueSourcePages} linking page(s)`,
      targetState: 'At least 5 contextual internal links',
    });
  }

  // Check anchor text quality
  if (uniqueAnchorTexts.length > 0) {
    const genericAnchors = uniqueAnchorTexts.filter(t =>
      /^(click here|here|read more|learn more|link|this)$/i.test(t.trim())
    );
    if (genericAnchors.length > 0) {
      actionItems.push({
        severity: 'medium',
        title: `${genericAnchors.length} link(s) use generic anchor text`,
        detail: `Generic anchors like "${genericAnchors[0]}" provide no topical signal. Descriptive anchor text helps both users and search engines understand the linked page's topic.`,
        currentState: `Generic anchors: ${genericAnchors.join(', ')}`,
        targetState: 'Descriptive, keyword-relevant anchor text',
      });
    }
  }

  if (errors.length > 0) {
    actionItems.push({
      severity: 'low',
      title: 'Some WP REST API queries failed',
      detail: errors.join('; '),
      currentState: 'Partial scan — results may be incomplete',
      targetState: 'Full scan without errors',
    });
  }

  return { summary, score, findings, actionItems };
}
