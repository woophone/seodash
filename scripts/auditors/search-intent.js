/**
 * Search Intent Alignment Auditor
 *
 * Clusters keywords by intent type and measures coherence.
 */

// Intent classification patterns
const INTENT_PATTERNS = {
  informational: [
    /\bhow\b/i,
    /\bwhat\b/i,
    /\bwhy\b/i,
    /\bwhen\b/i,
    /\bwho\b/i,
    /\bguide\b/i,
    /\btips\b/i,
    /\bexplain/i,
    /\bmeaning\b/i,
    /\bdefinition\b/i,
    /\bsymptoms?\b/i,
    /\bsigns?\s+of\b/i,
    /\bcauses?\b/i,
    /\beffects?\b/i,
    /\btypes?\s+of\b/i,
    /\bdifference\b/i,
    /\bexample/i,
    /\bcan\s+\w+\s+be\b/i,
    /\bis\s+\w+\s+a\b/i,
    /\bdo\s+i\b/i,
  ],
  transactional: [
    /\bbuy\b/i,
    /\bget\b/i,
    /\btake\b/i,
    /\bquiz\b/i,
    /\btest\b/i,
    /\bassessment\b/i,
    /\bscreening\b/i,
    /\bfind\s+(a|the)\b/i,
    /\bhire\b/i,
    /\bbook\b/i,
    /\bschedule\b/i,
    /\bcost\b/i,
    /\bprice\b/i,
    /\bfree\b/i,
    /\bonline\b/i,
    /\bnear\s+me\b/i,
    /\bdownload\b/i,
    /\btool\b/i,
    /\bcalculator\b/i,
    /\bself[\s-]?test\b/i,
    /\bself[\s-]?assessment\b/i,
  ],
  navigational: [
    /compulsion\s*solutions?/i,
    /james\s*gallegos/i,
    // Add more brand terms as needed
  ],
};

function classifyIntent(query) {
  // Check each intent type; return all matching intents
  const intents = [];

  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        intents.push(intentType);
        break; // One match per intent type is enough
      }
    }
  }

  // If no patterns match, classify as informational (default for most queries)
  if (intents.length === 0) {
    intents.push('informational');
  }

  // Return primary intent (first match priority: navigational > transactional > informational)
  if (intents.includes('navigational')) return 'navigational';
  if (intents.includes('transactional')) return 'transactional';
  return 'informational';
}

export default async function audit(db, clientId, pageUrl, options = {}) {
  // Get all keywords for this page from keyword_snapshots
  // Aggregate across all dates for total impressions/clicks
  const keywords = db.prepare(`
    SELECT
      query,
      SUM(clicks) as total_clicks,
      SUM(impressions) as total_impressions,
      AVG(position) as avg_position
    FROM keyword_snapshots
    WHERE client_id = ? AND page_url = ?
    GROUP BY query
    ORDER BY total_impressions DESC
  `).all(clientId, pageUrl);

  if (keywords.length === 0) {
    return {
      summary: 'No keyword data found for this page in the database.',
      score: null,
      findings: { error: 'no_keyword_data', keywordCount: 0 },
    };
  }

  // Classify each keyword
  const classified = keywords.map(kw => ({
    query: kw.query,
    intent: classifyIntent(kw.query),
    clicks: kw.total_clicks,
    impressions: kw.total_impressions,
    avgPosition: Math.round(kw.avg_position * 10) / 10,
  }));

  // Build clusters
  const clusters = {
    informational: { keywords: [], impressions: 0, clicks: 0 },
    transactional: { keywords: [], impressions: 0, clicks: 0 },
    navigational: { keywords: [], impressions: 0, clicks: 0 },
  };

  for (const kw of classified) {
    const cluster = clusters[kw.intent];
    cluster.keywords.push(kw);
    cluster.impressions += kw.impressions;
    cluster.clicks += kw.clicks;
  }

  // Calculate total impressions
  const totalImpressions = classified.reduce((sum, kw) => sum + kw.impressions, 0);
  const totalClicks = classified.reduce((sum, kw) => sum + kw.clicks, 0);

  // Find dominant intent
  let dominantIntent = 'informational';
  let dominantImpressions = 0;

  for (const [intent, cluster] of Object.entries(clusters)) {
    if (cluster.impressions > dominantImpressions) {
      dominantImpressions = cluster.impressions;
      dominantIntent = intent;
    }
  }

  // Coherence: % of impressions from dominant intent
  const coherence = totalImpressions > 0
    ? Math.round((dominantImpressions / totalImpressions) * 100)
    : 0;

  // --- Scoring ---
  let score;
  let coherenceLabel;

  if (coherence >= 80) {
    score = 90;
    coherenceLabel = 'tight';
  } else if (coherence >= 60) {
    score = 70;
    coherenceLabel = 'moderate';
  } else if (coherence >= 40) {
    score = 50;
    coherenceLabel = 'scattered';
  } else {
    score = 30;
    coherenceLabel = 'very scattered';
  }

  const summary = `Dominant intent: ${dominantIntent} (${coherence}% of impressions). Keyword cluster is ${coherenceLabel}. ${classified.length} keyword(s) analyzed.`;

  const findings = {
    totalKeywords: classified.length,
    totalImpressions,
    totalClicks,
    dominantIntent,
    coherence,
    coherenceLabel,
    clusters: Object.fromEntries(
      Object.entries(clusters).map(([intent, data]) => [
        intent,
        {
          keywordCount: data.keywords.length,
          impressions: data.impressions,
          clicks: data.clicks,
          percentage: totalImpressions > 0 ? Math.round((data.impressions / totalImpressions) * 100) : 0,
          topKeywords: data.keywords
            .sort((a, b) => b.impressions - a.impressions)
            .slice(0, 10)
            .map(kw => ({
              query: kw.query,
              impressions: kw.impressions,
              clicks: kw.clicks,
              avgPosition: kw.avgPosition,
            })),
        },
      ])
    ),
  };

  return { summary, score, findings };
}
