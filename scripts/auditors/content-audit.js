/**
 * Content Audit Auditor
 *
 * Fetches page HTML via origin IP and analyzes content area:
 * word count, images, links, heading structure.
 */

import { fetchOriginHTML } from './lib/fetch-origin.js';

function stripHtmlTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractContentArea(html) {
  // Strategy 1: Look for Oxygen Builder content sections
  const oxygenMatch = html.match(/<div[^>]*class="[^"]*ct-section-inner-wrap[^"]*"[^>]*>([\s\S]*)/i);
  if (oxygenMatch) {
    // Take content until footer or end of main sections
    let content = oxygenMatch[1];
    const footerIdx = content.search(/<footer/i);
    if (footerIdx !== -1) content = content.substring(0, footerIdx);
    return content;
  }

  // Strategy 2: Look for article or main tag
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];

  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];

  // Strategy 3: H1-based extraction — from H1 to footer/sidebar
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

  // Fallback: return body content
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
      actionItems: [],
    };
  }

  const contentArea = extractContentArea(html);
  const contentText = stripHtmlTags(contentArea);
  const words = contentText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // --- Images in content area ---
  const imgRegex = /<img\s[^>]*>/gi;
  const images = [];
  let imgMatch;
  while ((imgMatch = imgRegex.exec(contentArea)) !== null) {
    const imgTag = imgMatch[0];
    const src = imgTag.match(/src=["']([^"']+)["']/i);
    const alt = imgTag.match(/alt=["']([^"']*?)["']/i);
    const width = imgTag.match(/width=["']([^"']+)["']/i);
    const height = imgTag.match(/height=["']([^"']+)["']/i);
    const loading = imgTag.match(/loading=["']([^"']+)["']/i);

    images.push({
      src: src ? src[1] : null,
      alt: alt ? alt[1] : null,
      hasAlt: alt !== null && alt[1].length > 0,
      hasWidth: width !== null,
      hasHeight: height !== null,
      lazyLoading: loading ? loading[1] === 'lazy' : false,
    });
  }

  const imagesWithAlt = images.filter(img => img.hasAlt).length;
  const imagesMissingAlt = images.filter(img => !img.hasAlt).length;

  // --- Links in content area ---
  const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const internalLinks = [];
  const externalLinks = [];
  let linkMatch;

  while ((linkMatch = linkRegex.exec(contentArea)) !== null) {
    const href = linkMatch[1];
    const anchorHtml = linkMatch[2];
    const anchorText = stripHtmlTags(anchorHtml);

    if (href.startsWith('/') || href.includes(domain)) {
      internalLinks.push({ href, anchorText });
    } else if (href.startsWith('http')) {
      externalLinks.push({ href, anchorText });
    }
  }

  // --- Heading structure in content area ---
  const headings = [];
  const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let hMatch;
  while ((hMatch = headingRegex.exec(contentArea)) !== null) {
    const level = parseInt(hMatch[1][1]);
    const text = stripHtmlTags(hMatch[2]);
    headings.push({ level, text });
  }

  // --- Scoring ---
  let score;
  if (wordCount < 100) score = 15;
  else if (wordCount < 300) score = 35;
  else if (wordCount < 500) score = 55;
  else if (wordCount < 800) score = 70;
  else score = 85;

  // Bonus for images with alt text
  if (images.length > 0 && imagesWithAlt === images.length) {
    score = Math.min(100, score + 5);
  }

  // Bonus for good heading structure (has H2s)
  const h2Count = headings.filter(h => h.level === 2).length;
  if (h2Count >= 2) {
    score = Math.min(100, score + 5);
  }

  // Bonus for internal links
  if (internalLinks.length >= 2) {
    score = Math.min(100, score + 5);
  }

  score = Math.max(0, Math.min(100, score));

  const summary = `${wordCount} words in content area. ${images.length} image(s) (${imagesWithAlt} with alt text). ${internalLinks.length} internal link(s), ${externalLinks.length} external link(s). ${headings.length} heading(s).`;

  const findings = {
    wordCount,
    images: {
      total: images.length,
      withAlt: imagesWithAlt,
      missingAlt: imagesMissingAlt,
      details: images,
    },
    links: {
      internal: { count: internalLinks.length, details: internalLinks },
      external: { count: externalLinks.length, details: externalLinks },
    },
    headings,
    headingSummary: {
      h1: headings.filter(h => h.level === 1).length,
      h2: h2Count,
      h3: headings.filter(h => h.level === 3).length,
      h4: headings.filter(h => h.level === 4).length,
      h5: headings.filter(h => h.level === 5).length,
      h6: headings.filter(h => h.level === 6).length,
    },
  };

  // --- Action items ---
  const actionItems = [];

  if (wordCount < 300) {
    actionItems.push({
      severity: 'critical',
      title: `Very thin content (${wordCount} words)`,
      detail: `Only ${wordCount} words in the content area. For YMYL topics, Google expects comprehensive, authoritative content. Most ranking pages have 800+ words.`,
      currentState: `${wordCount} words`,
      targetState: '800+ words of expert content',
    });
  } else if (wordCount < 500) {
    actionItems.push({
      severity: 'high',
      title: `Below-average content length (${wordCount} words)`,
      detail: `${wordCount} words is below the typical threshold for competitive YMYL content. Consider expanding with expert insights.`,
      currentState: `${wordCount} words`,
      targetState: '800+ words',
    });
  }

  if (imagesMissingAlt > 0) {
    actionItems.push({
      severity: 'medium',
      title: `${imagesMissingAlt} image(s) missing alt text`,
      detail: `${imagesMissingAlt} of ${images.length} images lack descriptive alt text. Alt text is important for accessibility and image SEO.`,
      currentState: `${imagesMissingAlt} images without alt text`,
      targetState: 'All images have descriptive alt text',
    });
  }

  if (internalLinks.length === 0) {
    actionItems.push({
      severity: 'high',
      title: 'No internal links in content area',
      detail: 'The content area contains no internal links. Internal links help distribute page authority and guide users to related content.',
      currentState: '0 internal links',
      targetState: '2-4 contextual internal links',
    });
  } else if (wordCount > 500 && internalLinks.length < 2) {
    actionItems.push({
      severity: 'medium',
      title: 'Few internal links for content length',
      detail: `Only ${internalLinks.length} internal link(s) for ${wordCount} words. Aim for 2-4 links per 1000 words.`,
      currentState: `${internalLinks.length} internal link(s)`,
      targetState: `${Math.max(2, Math.round(wordCount / 500))} internal links`,
    });
  }

  if (h2Count === 0 && wordCount > 300) {
    actionItems.push({
      severity: 'medium',
      title: 'No H2 headings in content',
      detail: 'Content over 300 words should be structured with H2 subheadings for readability and SEO.',
      currentState: 'No H2 headings',
      targetState: '2-4 H2 subheadings breaking up content',
    });
  }

  if (externalLinks.length === 0 && wordCount > 500) {
    actionItems.push({
      severity: 'low',
      title: 'No external links/citations',
      detail: 'For YMYL content, citing authoritative external sources (medical journals, government sites) strengthens E-E-A-T signals.',
      currentState: '0 external links',
      targetState: '1-3 citations to authoritative sources',
    });
  }

  return { summary, score, findings, actionItems };
}
