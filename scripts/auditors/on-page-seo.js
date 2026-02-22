/**
 * On-Page SEO Auditor
 *
 * Fetches page HTML via WordPress origin IP and checks:
 * title, meta description, canonical, robots, og tags, headings.
 */

import { fetchOriginHTML } from './lib/fetch-origin.js';

function extractTag(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllMatches(html, regex) {
  const matches = [];
  let match;
  const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
  while ((match = globalRegex.exec(html)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function countMatches(html, regex) {
  const matches = html.match(regex);
  return matches ? matches.length : 0;
}

export default async function audit(db, clientId, pageUrl, options = {}) {
  const domain = options.domain || 'compulsionsolutions.com';

  let html, statusCode;
  try {
    const result = fetchOriginHTML(pageUrl, domain);
    html = result.html;
    statusCode = result.statusCode;
  } catch (err) {
    return {
      summary: `Failed to fetch page: ${err.message}`,
      score: null,
      findings: { error: err.message },
    };
  }

  let score = 100;
  const issues = [];

  // --- Title tag ---
  const title = extractTag(html, /<title[^>]*>([^<]+)<\/title>/i);
  const titleLength = title ? title.length : 0;

  if (!title) {
    score -= 20;
    issues.push('Missing title tag');
  } else if (titleLength > 60) {
    score -= 10;
    issues.push(`Title too long: ${titleLength} chars`);
  }

  // --- Meta description ---
  const metaDesc = extractTag(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    || extractTag(html, /<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  const metaDescLength = metaDesc ? metaDesc.length : 0;

  if (!metaDesc) {
    score -= 15;
    issues.push('Missing meta description');
  } else if (metaDescLength > 160) {
    score -= 5;
    issues.push(`Meta description too long: ${metaDescLength} chars`);
  }

  // --- H1 ---
  const h1s = extractAllMatches(html, /<h1[^>]*>([^<]+)<\/h1>/i);
  const h1Count = h1s.length;

  if (h1Count === 0) {
    // Also try H1 with inner tags
    const h1Alt = countMatches(html, /<h1[^>]*>/gi);
    if (h1Alt === 0) {
      score -= 15;
      issues.push('Missing H1 tag');
    }
  } else if (h1Count > 1) {
    score -= 10;
    issues.push(`Multiple H1 tags: ${h1Count}`);
  }

  // --- Canonical ---
  const canonical = extractTag(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i)
    || extractTag(html, /<link\s+href=["']([^"']+)["']\s+rel=["']canonical["']/i);

  if (!canonical) {
    score -= 10;
    issues.push('Missing canonical tag');
  } else {
    // Check if canonical matches page URL
    const canonicalUrl = canonical.replace(/\/$/, '');
    const pageUrlNorm = pageUrl.replace(/\/$/, '');
    if (canonicalUrl !== pageUrlNorm) {
      score -= 5;
      issues.push('Canonical mismatch');
    }
  }

  // --- Meta robots ---
  const metaRobots = extractTag(html, /<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i)
    || extractTag(html, /<meta\s+content=["']([^"']+)["']\s+name=["']robots["']/i);

  // --- Open Graph tags ---
  const ogTitle = extractTag(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
    || extractTag(html, /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
  const ogDesc = extractTag(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)
    || extractTag(html, /<meta\s+content=["']([^"']+)["']\s+property=["']og:description["']/i);
  const ogImage = extractTag(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    || extractTag(html, /<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  const ogType = extractTag(html, /<meta\s+property=["']og:type["']\s+content=["']([^"']+)["']/i)
    || extractTag(html, /<meta\s+content=["']([^"']+)["']\s+property=["']og:type["']/i);

  if (!ogImage) {
    score -= 10;
    issues.push('Missing og:image');
  }

  // --- Heading counts ---
  const h2Count = countMatches(html, /<h2[^>]*>/gi);
  const h3Count = countMatches(html, /<h3[^>]*>/gi);
  const h4Count = countMatches(html, /<h4[^>]*>/gi);
  const h5Count = countMatches(html, /<h5[^>]*>/gi);
  const h6Count = countMatches(html, /<h6[^>]*>/gi);

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  const summary = [
    title ? `Title: ${titleLength} chars` : 'No title',
    metaDesc ? `Meta desc: ${metaDescLength} chars` : 'No meta desc',
    `H1: ${h1Count}`,
    canonical ? 'Canonical: yes' : 'No canonical',
    ogImage ? 'og:image: yes' : 'No og:image',
    issues.length > 0 ? `${issues.length} issue(s)` : 'No issues',
  ].join('. ') + '.';

  const findings = {
    statusCode,
    title: { content: title, length: titleLength },
    metaDescription: { content: metaDesc, length: metaDescLength },
    h1: { count: h1Count, content: h1s },
    canonical: { url: canonical, matchesPage: canonical ? canonical.replace(/\/$/, '') === pageUrl.replace(/\/$/, '') : false },
    metaRobots,
    openGraph: {
      title: ogTitle,
      description: ogDesc,
      image: ogImage,
      type: ogType,
    },
    headings: {
      h1: h1Count,
      h2: h2Count,
      h3: h3Count,
      h4: h4Count,
      h5: h5Count,
      h6: h6Count,
    },
    issues,
  };

  return { summary, score, findings };
}
