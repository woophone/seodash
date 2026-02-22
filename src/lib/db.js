import Database from 'better-sqlite3';
import { join } from 'path';

// process.cwd() is reliable in both Node scripts and Astro build
const dbPath = join(process.cwd(), 'db', 'seodash.db');

let db;
function getDb() {
  if (!db) {
    db = new Database(dbPath, { readonly: true });
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Get daily page metrics over time for a specific page.
 * Returns array of { date, clicks, impressions, ctr, position }
 */
export function getPageTimeline(clientId, pageUrl, days = 0) {
  const d = getDb();
  if (days <= 0) {
    return d.prepare(`
      SELECT snapshot_date as date, clicks, impressions, ctr, position
      FROM page_snapshots
      WHERE client_id = ? AND page_url = ?
      ORDER BY snapshot_date
    `).all(clientId, pageUrl);
  }
  return d.prepare(`
    SELECT snapshot_date as date, clicks, impressions, ctr, position
    FROM page_snapshots
    WHERE client_id = ? AND page_url = ?
      AND snapshot_date >= date('now', '-' || ? || ' days')
    ORDER BY snapshot_date
  `).all(clientId, pageUrl, days);
}

/**
 * Get the latest date's snapshot for all pages of a client.
 * Returns array of { page_url, clicks, impressions, ctr, position }
 */
export function getLatestSnapshot(clientId) {
  const d = getDb();
  const latestDate = d.prepare(`
    SELECT MAX(snapshot_date) as d FROM page_snapshots WHERE client_id = ?
  `).get(clientId)?.d;

  if (!latestDate) return { date: null, pages: [] };

  const pages = d.prepare(`
    SELECT page_url, clicks, impressions, ctr, position
    FROM page_snapshots
    WHERE client_id = ? AND snapshot_date = ?
    ORDER BY clicks DESC
  `).all(clientId, latestDate);

  return { date: latestDate, pages };
}

/**
 * Get keywords for a specific page on a specific date (or latest).
 * Returns array of { query, clicks, impressions, ctr, position }
 */
export function getPageKeywords(clientId, pageUrl, date = null) {
  const d = getDb();

  const targetDate = date || d.prepare(`
    SELECT MAX(snapshot_date) as d FROM keyword_snapshots
    WHERE client_id = ? AND page_url = ?
  `).get(clientId, pageUrl)?.d;

  if (!targetDate) return [];

  return d.prepare(`
    SELECT query, clicks, impressions, ctr, position
    FROM keyword_snapshots
    WHERE client_id = ? AND page_url = ? AND snapshot_date = ?
    ORDER BY clicks DESC, impressions DESC
  `).all(clientId, pageUrl, targetDate);
}

/**
 * Get client overview: aggregate metrics for a recent period.
 * Returns { totalClicks, totalImpressions, avgPosition, pageCount, keywordCount, dateRange }
 */
export function getClientOverview(clientId, days = 28) {
  const d = getDb();

  const overview = d.prepare(`
    SELECT
      SUM(clicks) as totalClicks,
      SUM(impressions) as totalImpressions,
      ROUND(SUM(clicks) * 100.0 / NULLIF(SUM(impressions), 0), 2) as ctr,
      MIN(snapshot_date) as startDate,
      MAX(snapshot_date) as endDate
    FROM page_snapshots
    WHERE client_id = ? AND snapshot_date >= date('now', '-' || ? || ' days')
  `).get(clientId, days);

  const pageCount = d.prepare(`
    SELECT COUNT(DISTINCT page_url) as cnt
    FROM page_snapshots
    WHERE client_id = ? AND snapshot_date >= date('now', '-' || ? || ' days')
  `).get(clientId, days)?.cnt || 0;

  const keywordCount = d.prepare(`
    SELECT COUNT(DISTINCT query) as cnt
    FROM keyword_snapshots
    WHERE client_id = ? AND snapshot_date >= date('now', '-' || ? || ' days')
  `).get(clientId, days)?.cnt || 0;

  // Average position weighted by impressions
  const avgPos = d.prepare(`
    SELECT ROUND(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 1) as avgPosition
    FROM page_snapshots
    WHERE client_id = ? AND snapshot_date >= date('now', '-' || ? || ' days')
  `).get(clientId, days)?.avgPosition || 0;

  return {
    totalClicks: overview?.totalClicks || 0,
    totalImpressions: overview?.totalImpressions || 0,
    ctr: overview?.ctr || 0,
    avgPosition: avgPos,
    pageCount,
    keywordCount,
    startDate: overview?.startDate,
    endDate: overview?.endDate,
  };
}

/**
 * Get aggregate daily traffic (all pages combined) for trend chart.
 * Returns array of { date, clicks, impressions }
 */
export function getClientDailyTrend(clientId, days = 0) {
  const d = getDb();
  if (days <= 0) {
    // Return ALL historical data
    return d.prepare(`
      SELECT snapshot_date as date, SUM(clicks) as clicks, SUM(impressions) as impressions
      FROM page_snapshots
      WHERE client_id = ?
      GROUP BY snapshot_date
      ORDER BY snapshot_date
    `).all(clientId);
  }
  return d.prepare(`
    SELECT snapshot_date as date, SUM(clicks) as clicks, SUM(impressions) as impressions
    FROM page_snapshots
    WHERE client_id = ? AND snapshot_date >= date('now', '-' || ? || ' days')
    GROUP BY snapshot_date
    ORDER BY snapshot_date
  `).all(clientId, days);
}

/**
 * Get pages with biggest position changes (movers) in a period.
 * Compares avg position in recent 7 days vs previous 7 days.
 * Returns array of { page_url, currentPos, previousPos, change, currentClicks }
 */
export function getMovers(clientId, days = 30) {
  const d = getDb();
  const halfDays = Math.floor(days / 2);

  return d.prepare(`
    WITH recent AS (
      SELECT page_url,
        ROUND(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 1) as avgPos,
        SUM(clicks) as clicks,
        SUM(impressions) as impressions
      FROM page_snapshots
      WHERE client_id = ? AND snapshot_date >= date('now', '-' || ? || ' days')
      GROUP BY page_url
      HAVING SUM(impressions) >= 10
    ),
    previous AS (
      SELECT page_url,
        ROUND(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 1) as avgPos
      FROM page_snapshots
      WHERE client_id = ?
        AND snapshot_date >= date('now', '-' || ? || ' days')
        AND snapshot_date < date('now', '-' || ? || ' days')
      GROUP BY page_url
      HAVING SUM(impressions) >= 10
    )
    SELECT
      r.page_url,
      r.avgPos as currentPos,
      p.avgPos as previousPos,
      ROUND(p.avgPos - r.avgPos, 1) as change,
      r.clicks as currentClicks,
      r.impressions as currentImpressions
    FROM recent r
    JOIN previous p ON r.page_url = p.page_url
    WHERE ABS(p.avgPos - r.avgPos) >= 0.5
    ORDER BY ABS(p.avgPos - r.avgPos) DESC
    LIMIT 20
  `).all(clientId, halfDays, clientId, days, halfDays);
}

/**
 * Get all distinct page URLs for a client (for getStaticPaths).
 * Returns array of { page_url }
 */
export function getClientPages(clientId) {
  const d = getDb();
  return d.prepare(`
    SELECT DISTINCT page_url
    FROM page_snapshots
    WHERE client_id = ?
    ORDER BY page_url
  `).all(clientId);
}

/**
 * Get client info from the clients table.
 */
export function getClient(clientId) {
  const d = getDb();
  return d.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
}

// ─── Audit System ──────────────────────────────────────────

/**
 * Get all audit dimensions, ordered by sort_order.
 */
export function getAuditDimensions() {
  const d = getDb();
  return d.prepare('SELECT * FROM audit_dimensions ORDER BY sort_order').all();
}

/**
 * Get all audit runs for a specific page, joined with dimension info.
 * Returns array with dimension metadata + audit status.
 */
export function getPageAuditCards(clientId, pageUrl) {
  const d = getDb();
  return d.prepare(`
    SELECT
      ad.id as dimension_id,
      ad.name,
      ad.tier,
      ad.category,
      ad.sort_order,
      ad.card_description,
      ar.status as audit_status,
      ar.run_date,
      ar.summary,
      ar.score,
      ar.findings,
      (SELECT COUNT(*) FROM action_items ai
       WHERE ai.client_id = ? AND ai.page_url = ? AND ai.dimension_id = ad.id AND ai.status = 'pending') as pending_count,
      (SELECT COUNT(*) FROM action_items ai
       WHERE ai.client_id = ? AND ai.page_url = ? AND ai.dimension_id = ad.id AND ai.status = 'completed') as completed_count,
      (SELECT COUNT(*) FROM action_items ai
       WHERE ai.client_id = ? AND ai.page_url = ? AND ai.dimension_id = ad.id) as total_items
    FROM audit_dimensions ad
    LEFT JOIN audit_runs ar ON ar.dimension_id = ad.id AND ar.client_id = ? AND ar.page_url = ?
    ORDER BY ad.sort_order
  `).all(clientId, pageUrl, clientId, pageUrl, clientId, pageUrl, clientId, pageUrl);
}

/**
 * Get a single audit run with its action items.
 */
export function getAuditDetail(clientId, pageUrl, dimensionId) {
  const d = getDb();
  const run = d.prepare(`
    SELECT ar.*, ad.name, ad.tier, ad.category, ad.card_description
    FROM audit_runs ar
    JOIN audit_dimensions ad ON ad.id = ar.dimension_id
    WHERE ar.client_id = ? AND ar.page_url = ? AND ar.dimension_id = ?
  `).get(clientId, pageUrl, dimensionId);

  const items = d.prepare(`
    SELECT * FROM action_items
    WHERE client_id = ? AND page_url = ? AND dimension_id = ?
    ORDER BY
      CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
      created_at
  `).all(clientId, pageUrl, dimensionId);

  return { run, items };
}

/**
 * Get all action items for a page, across all dimensions.
 */
export function getPageActionItems(clientId, pageUrl, statusFilter = null) {
  const d = getDb();
  if (statusFilter) {
    return d.prepare(`
      SELECT ai.*, ad.name as dimension_name
      FROM action_items ai
      JOIN audit_dimensions ad ON ad.id = ai.dimension_id
      WHERE ai.client_id = ? AND ai.page_url = ? AND ai.status = ?
      ORDER BY
        CASE ai.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
    `).all(clientId, pageUrl, statusFilter);
  }
  return d.prepare(`
    SELECT ai.*, ad.name as dimension_name
    FROM action_items ai
    JOIN audit_dimensions ad ON ad.id = ai.dimension_id
    WHERE ai.client_id = ? AND ai.page_url = ?
    ORDER BY
      CASE ai.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END
  `).all(clientId, pageUrl);
}

/**
 * Get pending work count for all pages of a client.
 */
export function getClientPendingWork(clientId) {
  const d = getDb();
  return d.prepare(`
    SELECT page_url, COUNT(*) as pending_count
    FROM action_items
    WHERE client_id = ? AND status = 'pending'
    GROUP BY page_url
  `).all(clientId);
}

/**
 * Get page-level keyword summary for latest 28 days (for dashboard table).
 * Groups keywords per page, returns aggregated data.
 */
export function getPagesSummary(clientId, days = 28) {
  const d = getDb();

  // Get pages with their aggregate metrics over the period
  const pages = d.prepare(`
    SELECT
      page_url,
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      ROUND(SUM(clicks) * 100.0 / NULLIF(SUM(impressions), 0), 2) as ctr,
      ROUND(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 1) as position
    FROM page_snapshots
    WHERE client_id = ? AND snapshot_date >= date('now', '-' || ? || ' days')
    GROUP BY page_url
    ORDER BY impressions DESC
  `).all(clientId, days);

  // For each page, get top keywords from the period
  const getKeywords = d.prepare(`
    SELECT
      query,
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      ROUND(SUM(clicks) * 100.0 / NULLIF(SUM(impressions), 0), 2) as ctr,
      ROUND(SUM(position * impressions) / NULLIF(SUM(impressions), 0), 1) as position
    FROM keyword_snapshots
    WHERE client_id = ? AND page_url = ? AND snapshot_date >= date('now', '-' || ? || ' days')
    GROUP BY query
    ORDER BY clicks DESC, impressions DESC
  `);

  return pages.map(page => ({
    ...page,
    googlePage: page.position <= 10 ? 1 : page.position <= 20 ? 2 : 3,
    keywords: getKeywords.all(clientId, page.page_url, days),
  }));
}
