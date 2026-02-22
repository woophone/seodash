/**
 * Ranking Stability Auditor
 *
 * Analyzes position volatility from GSC daily snapshots.
 * Detects yo-yo patterns and calculates stability score.
 */

export default async function audit(db, clientId, pageUrl, options = {}) {
  // Get all daily position data for this page, ordered by date
  const rows = db.prepare(`
    SELECT snapshot_date, position
    FROM page_snapshots
    WHERE client_id = ? AND page_url = ?
    ORDER BY snapshot_date ASC
  `).all(clientId, pageUrl);

  if (rows.length < 2) {
    return {
      summary: `Insufficient data: only ${rows.length} data point(s). Need at least 2 days of position data.`,
      score: null,
      findings: { error: 'insufficient_data', dataPoints: rows.length },
      actionItems: [],
    };
  }

  const positions = rows.map(r => r.position);
  const dates = rows.map(r => r.snapshot_date);

  // Calculate average position
  const avgPosition = positions.reduce((sum, p) => sum + p, 0) / positions.length;

  // Calculate standard deviation (volatility)
  const variance = positions.reduce((sum, p) => sum + Math.pow(p - avgPosition, 2), 0) / positions.length;
  const volatility = Math.sqrt(variance);

  // Detect yo-yo days: position changed >10 in a single day
  let yoyoDays = 0;
  let maxSwing = 0;
  const dailyChanges = [];

  for (let i = 1; i < positions.length; i++) {
    const change = Math.abs(positions[i] - positions[i - 1]);
    dailyChanges.push({
      date: dates[i],
      from: positions[i - 1],
      to: positions[i],
      change,
    });
    if (change > 10) {
      yoyoDays++;
    }
    if (change > maxSwing) {
      maxSwing = change;
    }
  }

  // Last 30 days of daily positions
  const last30 = rows.slice(-30).map(r => ({
    date: r.snapshot_date,
    position: r.position,
  }));

  // Score: lower volatility = higher score
  // Score = max(0, 100 - (volatility * 10))
  const score = Math.max(0, Math.round(100 - (volatility * 10)));

  const summary = `Position volatility: ${volatility.toFixed(1)} (std dev). ${yoyoDays} yo-yo day(s) (>10 pos change). Avg position: ${avgPosition.toFixed(1)}`;

  const findings = {
    volatility: Math.round(volatility * 100) / 100,
    yoyoDays,
    maxSwing: Math.round(maxSwing * 10) / 10,
    avgPosition: Math.round(avgPosition * 10) / 10,
    dataPoints: rows.length,
    dailyPositions: last30,
  };

  // Action items
  const actionItems = [];

  if (volatility > 5) {
    actionItems.push({
      severity: 'high',
      title: 'High ranking volatility detected',
      detail: `Standard deviation of ${volatility.toFixed(1)} indicates unstable rankings. This page's position fluctuates significantly day-to-day.`,
      currentState: `Volatility: ${volatility.toFixed(1)} std dev`,
      targetState: 'Volatility < 3.0 std dev',
    });
  } else if (volatility > 3) {
    actionItems.push({
      severity: 'medium',
      title: 'Moderate ranking volatility',
      detail: `Standard deviation of ${volatility.toFixed(1)} shows some instability. Monitor for patterns.`,
      currentState: `Volatility: ${volatility.toFixed(1)} std dev`,
      targetState: 'Volatility < 3.0 std dev',
    });
  }

  if (yoyoDays > 3) {
    actionItems.push({
      severity: 'high',
      title: `${yoyoDays} yo-yo days detected`,
      detail: `Position swung more than 10 places in a single day ${yoyoDays} time(s). Max swing: ${maxSwing.toFixed(1)} positions. This suggests Google is uncertain about this page's ranking.`,
      currentState: `${yoyoDays} yo-yo days, max swing ${maxSwing.toFixed(1)}`,
      targetState: '0 yo-yo days',
    });
  } else if (yoyoDays > 0) {
    actionItems.push({
      severity: 'medium',
      title: `${yoyoDays} yo-yo day(s) detected`,
      detail: `Position swung more than 10 places ${yoyoDays} time(s). Max swing: ${maxSwing.toFixed(1)} positions.`,
      currentState: `${yoyoDays} yo-yo day(s)`,
      targetState: '0 yo-yo days',
    });
  }

  if (avgPosition > 20) {
    actionItems.push({
      severity: 'low',
      title: 'Average position beyond page 2',
      detail: `Average position ${avgPosition.toFixed(1)} means this page typically appears beyond the second page of results.`,
      currentState: `Avg position: ${avgPosition.toFixed(1)}`,
      targetState: 'Avg position < 20',
    });
  }

  return { summary, score, findings, actionItems };
}
