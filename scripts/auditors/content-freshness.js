/**
 * Content Freshness Auditor
 *
 * Checks when content was last modified via schema markup and meta tags.
 * Scores based on recency.
 */

import { fetchOriginHTML } from './lib/fetch-origin.js';

function extractDates(html) {
  const dates = {};

  // 1. JSON-LD schema dates
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      const items = data['@graph'] || [data];
      for (const item of Array.isArray(items) ? items : [items]) {
        if (item.dateModified && !dates.schemaModified) {
          dates.schemaModified = item.dateModified;
        }
        if (item.datePublished && !dates.schemaPublished) {
          dates.schemaPublished = item.datePublished;
        }
      }
    } catch (e) { /* skip parse errors */ }
  }

  // 2. Meta tags
  const metaModified = html.match(/<meta\s+property=["']article:modified_time["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']article:modified_time["']/i);
  if (metaModified) dates.metaModified = metaModified[1];

  const metaPublished = html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']article:published_time["']/i);
  if (metaPublished) dates.metaPublished = metaPublished[1];

  // 3. Look for visible dates in text (common patterns)
  const visibleDatePatterns = [
    /(?:last\s+)?(?:updated|modified)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
    /(?:published|posted)\s*:?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of visibleDatePatterns) {
    const m = html.match(pattern);
    if (m && !dates.visibleDate) {
      dates.visibleDate = m[1];
    }
  }

  return dates;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function daysSince(date) {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
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

  const dates = extractDates(html);

  // Determine the most recent modification date
  const candidates = [
    { source: 'schema_modified', raw: dates.schemaModified, parsed: parseDate(dates.schemaModified) },
    { source: 'meta_modified', raw: dates.metaModified, parsed: parseDate(dates.metaModified) },
    { source: 'schema_published', raw: dates.schemaPublished, parsed: parseDate(dates.schemaPublished) },
    { source: 'meta_published', raw: dates.metaPublished, parsed: parseDate(dates.metaPublished) },
    { source: 'visible_date', raw: dates.visibleDate, parsed: parseDate(dates.visibleDate) },
  ].filter(c => c.parsed !== null);

  // Sort by date descending to find most recent
  candidates.sort((a, b) => b.parsed.getTime() - a.parsed.getTime());

  const mostRecent = candidates.length > 0 ? candidates[0] : null;
  const ageDays = mostRecent ? daysSince(mostRecent.parsed) : null;

  // --- Scoring based on freshness ---
  let score;
  if (ageDays === null) {
    score = 10; // No date info at all is very bad
  } else if (ageDays <= 30) {
    score = 100;
  } else if (ageDays <= 90) {
    score = 80;
  } else if (ageDays <= 180) {
    score = 60;
  } else if (ageDays <= 365) {
    score = 40;
  } else if (ageDays <= 730) {
    score = 20;
  } else {
    score = 10;
  }

  // Build summary
  let summary;
  if (mostRecent) {
    const dateStr = mostRecent.parsed.toISOString().split('T')[0];
    summary = `Last modification: ${dateStr} (${ageDays} days ago, source: ${mostRecent.source}). `;
    if (ageDays <= 90) {
      summary += 'Content is fresh.';
    } else if (ageDays <= 180) {
      summary += 'Content is moderately fresh.';
    } else if (ageDays <= 365) {
      summary += 'Content is aging — consider updating.';
    } else {
      summary += 'Content is stale — update recommended.';
    }
  } else {
    summary = 'No modification or publication date found. Cannot assess content freshness.';
  }

  const findings = {
    dates,
    mostRecentDate: mostRecent ? {
      source: mostRecent.source,
      raw: mostRecent.raw,
      iso: mostRecent.parsed.toISOString(),
      ageDays,
    } : null,
    allDatesFound: candidates.map(c => ({
      source: c.source,
      raw: c.raw,
      iso: c.parsed.toISOString(),
      ageDays: daysSince(c.parsed),
    })),
  };

  // --- Action items ---
  const actionItems = [];

  if (!mostRecent) {
    actionItems.push({
      severity: 'high',
      title: 'No content dates found',
      detail: 'No dateModified, datePublished, or visible dates were found on the page. Content freshness signals are missing entirely.',
      currentState: 'No dates detected',
      targetState: 'dateModified in schema + visible "Last updated" date on page',
    });
  } else if (ageDays > 365) {
    actionItems.push({
      severity: 'high',
      title: `Content is ${ageDays > 730 ? 'very ' : ''}stale (${ageDays} days old)`,
      detail: `Last modification was ${Math.round(ageDays / 30)} months ago. For YMYL health content, Google expects regular updates to ensure accuracy.`,
      currentState: `Last modified ${ageDays} days ago`,
      targetState: 'Updated within last 6 months',
    });
  } else if (ageDays > 180) {
    actionItems.push({
      severity: 'medium',
      title: `Content aging (${ageDays} days since last update)`,
      detail: `Content was last modified ${Math.round(ageDays / 30)} months ago. Consider reviewing and updating to maintain freshness signals.`,
      currentState: `Last modified ${ageDays} days ago`,
      targetState: 'Updated within last 6 months',
    });
  }

  // Check if dateModified is in schema
  if (!dates.schemaModified) {
    actionItems.push({
      severity: 'medium',
      title: 'No dateModified in schema markup',
      detail: 'Adding dateModified to JSON-LD schema signals content freshness to search engines in a machine-readable format.',
      currentState: 'No dateModified in JSON-LD',
      targetState: 'dateModified in Article/WebPage schema, updated on each content edit',
    });
  }

  // Check if there is a visible date on the page
  if (!dates.visibleDate && !dates.metaModified && !dates.metaPublished) {
    actionItems.push({
      severity: 'low',
      title: 'No visible date displayed to users',
      detail: 'Displaying a "Last updated" date on YMYL content builds user trust and signals freshness.',
      currentState: 'No visible date on page',
      targetState: 'Visible "Last updated: [date]" near content',
    });
  }

  return { summary, score, findings, actionItems };
}
