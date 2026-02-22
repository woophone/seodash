/**
 * Images & Media Auditor
 *
 * Fetches page HTML, finds all <img> tags, checks:
 * alt text, width/height attributes, lazy loading, og:image.
 */

import { fetchOriginHTML } from './lib/fetch-origin.js';

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

  // --- Extract all <img> tags ---
  const imgRegex = /<img\s[^>]*>/gi;
  const images = [];
  let imgMatch;

  while ((imgMatch = imgRegex.exec(html)) !== null) {
    const tag = imgMatch[0];

    const src = tag.match(/src=["']([^"']+)["']/i);
    const alt = tag.match(/alt=["']([^"']*?)["']/i);
    const width = tag.match(/width=["']([^"']+)["']/i);
    const height = tag.match(/height=["']([^"']+)["']/i);
    const loading = tag.match(/loading=["']([^"']+)["']/i);
    const srcset = tag.match(/srcset=["']([^"']+)["']/i);
    const decoding = tag.match(/decoding=["']([^"']+)["']/i);

    // Skip tiny tracking pixels and data URIs
    const srcVal = src ? src[1] : '';
    if (srcVal.startsWith('data:') && srcVal.length < 200) continue;
    if (width && height && parseInt(width[1]) <= 1 && parseInt(height[1]) <= 1) continue;

    images.push({
      src: srcVal,
      alt: alt ? alt[1] : null,
      hasAlt: alt !== null,
      altIsEmpty: alt !== null && alt[1].trim() === '',
      altIsDescriptive: alt !== null && alt[1].trim().length > 3,
      hasWidth: width !== null,
      hasHeight: height !== null,
      width: width ? width[1] : null,
      height: height ? height[1] : null,
      hasLazyLoading: loading !== null && loading[1] === 'lazy',
      hasSrcset: srcset !== null,
      hasDecoding: decoding !== null,
    });
  }

  // --- Check for og:image ---
  const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
  const hasOgImage = ogImage !== null;

  // --- Tally issues ---
  const missingAlt = images.filter(img => !img.hasAlt);
  const emptyAlt = images.filter(img => img.altIsEmpty);
  const missingDimensions = images.filter(img => !img.hasWidth || !img.hasHeight);
  const noLazyLoading = images.filter(img => !img.hasLazyLoading);
  const withSrcset = images.filter(img => img.hasSrcset);

  // --- Scoring ---
  let score = 100;

  if (images.length === 0) {
    // No images — not necessarily bad, but not ideal
    score = 50;
  } else {
    // Deduct per image issue
    const altIssues = missingAlt.length + emptyAlt.length;
    score -= altIssues * 10; // -10 per missing/empty alt

    const dimIssues = missingDimensions.length;
    score -= dimIssues * 5; // -5 per missing dimensions (causes CLS)

    if (!hasOgImage) {
      score -= 10;
    }

    // Small bonus for responsive images
    if (withSrcset.length > 0 && withSrcset.length >= images.length * 0.5) {
      score = Math.min(100, score + 5);
    }
  }

  score = Math.max(0, Math.min(100, score));

  const summary = images.length > 0
    ? `${images.length} image(s) found. ${missingAlt.length + emptyAlt.length} alt text issue(s). ${missingDimensions.length} missing dimensions. ${hasOgImage ? 'og:image present.' : 'No og:image.'}`
    : `No images found on page. ${hasOgImage ? 'og:image present.' : 'No og:image.'}`;

  const findings = {
    totalImages: images.length,
    images: images.map(img => ({
      src: img.src.substring(0, 200),
      alt: img.alt,
      hasAlt: img.hasAlt,
      altIsEmpty: img.altIsEmpty,
      hasDimensions: img.hasWidth && img.hasHeight,
      hasLazyLoading: img.hasLazyLoading,
      hasSrcset: img.hasSrcset,
    })),
    issues: {
      missingAlt: missingAlt.length,
      emptyAlt: emptyAlt.length,
      missingDimensions: missingDimensions.length,
      noLazyLoading: noLazyLoading.length,
    },
    ogImage: {
      present: hasOgImage,
      url: ogImage ? ogImage[1] : null,
    },
    responsiveImages: withSrcset.length,
  };

  return { summary, score, findings };
}
