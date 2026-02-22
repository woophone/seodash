/**
 * Algorithm Correlation Auditor
 *
 * Checks for position changes correlated with known Google algorithm updates.
 */

const GOOGLE_UPDATES = [
  { date: '2025-12-12', name: 'December 2025 Core Update', type: 'core' },
  { date: '2025-11-11', name: 'November 2025 Core Update', type: 'core' },
  { date: '2025-08-15', name: 'August 2025 Core Update', type: 'core' },
  { date: '2025-06-05', name: 'June 2025 Spam Update', type: 'spam' },
  { date: '2025-03-13', name: 'March 2025 Core Update', type: 'core' },
  { date: '2024-11-11', name: 'November 2024 Core Update', type: 'core' },
  { date: '2024-08-15', name: 'August 2024 Core Update', type: 'core' },
  { date: '2024-03-05', name: 'March 2024 Core Update', type: 'core' },
];

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export default async function audit(db, clientId, pageUrl, options = {}) {
  // Get all position data for this page
  const rows = db.prepare(`
    SELECT snapshot_date, position
    FROM page_snapshots
    WHERE client_id = ? AND page_url = ?
    ORDER BY snapshot_date ASC
  `).all(clientId, pageUrl);

  if (rows.length < 7) {
    return {
      summary: `Insufficient data: only ${rows.length} data point(s). Need at least 7 days for correlation analysis.`,
      score: null,
      findings: { error: 'insufficient_data', dataPoints: rows.length },
      actionItems: [],
    };
  }

  // Build a date->position lookup
  const positionMap = new Map();
  for (const row of rows) {
    positionMap.set(row.snapshot_date, row.position);
  }

  const dateRange = {
    earliest: rows[0].snapshot_date,
    latest: rows[rows.length - 1].snapshot_date,
  };

  // Analyze each update
  const updates = [];
  let correlatedCount = 0;
  let biggestImpact = null;

  for (const update of GOOGLE_UPDATES) {
    // Skip updates outside our data range (with some buffer)
    if (update.date < addDays(dateRange.earliest, 7) || update.date > addDays(dateRange.latest, -7)) {
      continue;
    }

    // Collect positions in the 7 days before and after the update
    const beforePositions = [];
    const afterPositions = [];

    for (let d = -7; d < 0; d++) {
      const dateStr = addDays(update.date, d);
      if (positionMap.has(dateStr)) {
        beforePositions.push(positionMap.get(dateStr));
      }
    }

    for (let d = 0; d <= 7; d++) {
      const dateStr = addDays(update.date, d);
      if (positionMap.has(dateStr)) {
        afterPositions.push(positionMap.get(dateStr));
      }
    }

    // Need data on both sides to compare
    if (beforePositions.length === 0 || afterPositions.length === 0) {
      updates.push({
        ...update,
        avgBefore: null,
        avgAfter: null,
        delta: null,
        correlated: false,
        dataAvailable: false,
      });
      continue;
    }

    const avgBefore = beforePositions.reduce((s, p) => s + p, 0) / beforePositions.length;
    const avgAfter = afterPositions.reduce((s, p) => s + p, 0) / afterPositions.length;
    const delta = avgAfter - avgBefore; // positive = position worsened (higher number)
    const absDelta = Math.abs(delta);
    const correlated = absDelta > 3;

    if (correlated) {
      correlatedCount++;
    }

    const updateResult = {
      ...update,
      avgBefore: Math.round(avgBefore * 10) / 10,
      avgAfter: Math.round(avgAfter * 10) / 10,
      delta: Math.round(delta * 10) / 10,
      correlated,
      dataAvailable: true,
      beforeDataPoints: beforePositions.length,
      afterDataPoints: afterPositions.length,
    };

    updates.push(updateResult);

    if (!biggestImpact || absDelta > Math.abs(biggestImpact.delta)) {
      biggestImpact = updateResult;
    }
  }

  const totalUpdates = updates.filter(u => u.dataAvailable).length;

  // Score: 100 minus (10 * number of correlated updates)
  const score = Math.max(0, 100 - (10 * correlatedCount));

  let summary;
  if (totalUpdates === 0) {
    summary = 'No Google updates fall within the available data range for correlation analysis.';
  } else if (biggestImpact && biggestImpact.delta !== null) {
    const direction = biggestImpact.delta > 0 ? '+' : '';
    summary = `${correlatedCount} of ${totalUpdates} updates show correlated position changes. Biggest impact: ${biggestImpact.name} (${direction}${biggestImpact.delta} positions).`;
  } else {
    summary = `${correlatedCount} of ${totalUpdates} updates show correlated position changes.`;
  }

  const findings = {
    updates,
    correlatedCount,
    totalUpdates,
    dateRange,
  };

  // Action items
  const actionItems = [];

  const correlatedUpdates = updates.filter(u => u.correlated);

  if (correlatedCount >= 3) {
    actionItems.push({
      severity: 'critical',
      title: 'Page affected by multiple Google algorithm updates',
      detail: `${correlatedCount} confirmed algorithm updates caused >3 position changes. This page may have fundamental quality/compliance issues that make it vulnerable to core updates.`,
      currentState: `${correlatedCount} correlated updates`,
      targetState: 'Stable through algorithm updates',
      metadata: { correlatedUpdates: correlatedUpdates.map(u => u.name) },
    });
  } else if (correlatedCount >= 1) {
    actionItems.push({
      severity: 'medium',
      title: `Position changes correlated with ${correlatedCount} algorithm update(s)`,
      detail: correlatedUpdates.map(u => {
        const dir = u.delta > 0 ? 'worsened' : 'improved';
        return `${u.name}: position ${dir} by ${Math.abs(u.delta)} places`;
      }).join('. '),
      currentState: `${correlatedCount} correlated update(s)`,
      targetState: 'Stable through algorithm updates',
    });
  }

  // Check for negative trend across updates
  const negativeUpdates = correlatedUpdates.filter(u => u.delta > 0);
  if (negativeUpdates.length >= 2) {
    actionItems.push({
      severity: 'high',
      title: 'Consistent negative impact from algorithm updates',
      detail: `${negativeUpdates.length} updates caused position drops. This suggests a pattern — the page may need content quality or E-E-A-T improvements to withstand future updates.`,
      currentState: `${negativeUpdates.length} negative correlations`,
      targetState: 'Neutral or positive response to updates',
    });
  }

  return { summary, score, findings, actionItems };
}
