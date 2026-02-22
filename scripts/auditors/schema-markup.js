/**
 * Schema Markup Auditor
 *
 * Fetches page HTML, extracts JSON-LD blocks, validates schema types.
 */

import { fetchOriginHTML } from './lib/fetch-origin.js';

const RECOMMENDED_TYPES = [
  'Article',
  'Person',
  'Organization',
  'FAQPage',
  'BreadcrumbList',
];

function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      blocks.push(parsed);
    } catch (err) {
      blocks.push({ _parseError: err.message, _raw: match[1].trim().substring(0, 500) });
    }
  }

  return blocks;
}

function extractTypes(schema) {
  const types = new Set();

  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;

    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }

    if (obj['@type']) {
      const t = obj['@type'];
      if (Array.isArray(t)) {
        t.forEach(type => types.add(type));
      } else {
        types.add(t);
      }
    }

    // Walk nested objects (e.g., @graph)
    if (obj['@graph'] && Array.isArray(obj['@graph'])) {
      obj['@graph'].forEach(walk);
    }

    // Walk all values
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        walk(value);
      }
    }
  }

  walk(schema);
  return [...types];
}

function findDateModified(blocks) {
  for (const block of blocks) {
    if (block._parseError) continue;

    const items = block['@graph'] || [block];
    for (const item of Array.isArray(items) ? items : [items]) {
      if (item.dateModified) return item.dateModified;
    }
  }
  return null;
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

  const blocks = extractJsonLdBlocks(html);
  const parseErrors = blocks.filter(b => b._parseError);
  const validBlocks = blocks.filter(b => !b._parseError);

  // Extract all schema types
  const allTypes = [];
  for (const block of validBlocks) {
    allTypes.push(...extractTypes(block));
  }
  const uniqueTypes = [...new Set(allTypes)];

  // Check dateModified
  const dateModified = findDateModified(validBlocks);
  let dateModifiedAge = null;
  let dateModifiedRecent = false;

  if (dateModified) {
    const modDate = new Date(dateModified);
    if (!isNaN(modDate.getTime())) {
      dateModifiedAge = Math.floor((Date.now() - modDate.getTime()) / (1000 * 60 * 60 * 24));
      dateModifiedRecent = dateModifiedAge <= 365;
    }
  }

  // Check which recommended types are present/missing
  const presentRecommended = RECOMMENDED_TYPES.filter(t => uniqueTypes.includes(t));
  const missingRecommended = RECOMMENDED_TYPES.filter(t => !uniqueTypes.includes(t));

  // --- Scoring ---
  // Base 30 for having any schema
  let score = 0;
  if (validBlocks.length > 0) {
    score = 30;
  }

  // +10 per useful/recommended type found
  score += presentRecommended.length * 10;

  // Bonus for dateModified being recent
  if (dateModifiedRecent) {
    score += 5;
  }

  // Penalty for parse errors
  if (parseErrors.length > 0) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  const summary = validBlocks.length > 0
    ? `${validBlocks.length} JSON-LD block(s) with types: ${uniqueTypes.join(', ')}. ${missingRecommended.length > 0 ? `Missing recommended: ${missingRecommended.join(', ')}.` : 'All recommended types present.'}`
    : 'No JSON-LD schema markup found on the page.';

  const findings = {
    blockCount: validBlocks.length,
    parseErrors: parseErrors.length,
    types: uniqueTypes,
    recommendedPresent: presentRecommended,
    recommendedMissing: missingRecommended,
    dateModified,
    dateModifiedAgeDays: dateModifiedAge,
    dateModifiedRecent,
    blocks: validBlocks.map((block, i) => ({
      index: i,
      types: extractTypes(block),
      hasGraph: !!block['@graph'],
    })),
  };

  // --- Action items ---
  const actionItems = [];

  if (validBlocks.length === 0) {
    actionItems.push({
      severity: 'high',
      title: 'No JSON-LD schema markup found',
      detail: 'The page has no structured data. Schema markup helps search engines understand page content and can enable rich results in SERPs.',
      currentState: 'No JSON-LD blocks',
      targetState: 'At least WebPage/Article + Person/Organization schema',
    });
  }

  for (const type of missingRecommended) {
    let severity = 'medium';
    let detail = '';

    switch (type) {
      case 'Article':
        detail = 'Article schema enables rich results and helps Google understand the content type, author, and publication date.';
        severity = 'high';
        break;
      case 'Person':
        detail = 'Person schema for the author strengthens E-E-A-T signals, especially important for YMYL content.';
        severity = 'high';
        break;
      case 'Organization':
        detail = 'Organization schema helps Google associate the page with the business entity.';
        severity = 'medium';
        break;
      case 'FAQPage':
        detail = 'FAQPage schema can enable FAQ rich results in SERPs, increasing visibility and click-through rates.';
        severity = 'low';
        break;
      case 'BreadcrumbList':
        detail = 'BreadcrumbList schema enables breadcrumb display in search results, improving navigation context.';
        severity = 'low';
        break;
      default:
        detail = `${type} schema is recommended for this type of content.`;
    }

    actionItems.push({
      severity,
      title: `Missing ${type} schema`,
      detail,
      currentState: `No ${type} schema found`,
      targetState: `Add ${type} JSON-LD schema`,
    });
  }

  if (parseErrors.length > 0) {
    actionItems.push({
      severity: 'high',
      title: `${parseErrors.length} JSON-LD block(s) have parse errors`,
      detail: `${parseErrors.length} script blocks with type="application/ld+json" contain invalid JSON. Search engines will ignore malformed schema.`,
      currentState: `${parseErrors.length} invalid JSON-LD block(s)`,
      targetState: 'All JSON-LD blocks valid',
      metadata: { errors: parseErrors.map(e => e._parseError) },
    });
  }

  if (dateModified && !dateModifiedRecent) {
    actionItems.push({
      severity: 'medium',
      title: `dateModified is ${dateModifiedAge} days old`,
      detail: `The schema dateModified (${dateModified}) is over a year old. Updating it signals content freshness to search engines.`,
      currentState: `dateModified: ${dateModified} (${dateModifiedAge} days ago)`,
      targetState: 'dateModified within last 12 months',
    });
  } else if (!dateModified && validBlocks.length > 0) {
    actionItems.push({
      severity: 'low',
      title: 'No dateModified in schema',
      detail: 'Adding dateModified to the schema helps search engines assess content freshness.',
      currentState: 'No dateModified property',
      targetState: 'dateModified reflecting last content update',
    });
  }

  return { summary, score, findings, actionItems };
}
