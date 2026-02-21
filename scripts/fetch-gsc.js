import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db', 'seodash.db');
const tokenPath = '/tmp/gsc_token.txt';

// --- CLI args ---
const args = process.argv.slice(2);
const clientFlag = args.indexOf('--client');
const clientId = clientFlag !== -1 ? args[clientFlag + 1] : null;
const isBackfill = args.includes('--backfill');

if (!clientId) {
  console.error('Usage: tsx scripts/fetch-gsc.js --client <id> [--backfill]');
  process.exit(1);
}

// --- DB setup ---
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
if (!client) {
  console.error(`Client "${clientId}" not found in database.`);
  process.exit(1);
}

console.log(`Fetching GSC data for ${client.name} (${client.domain})`);
console.log(`Mode: ${isBackfill ? 'BACKFILL (~16 months)' : 'DAILY (last 3 days)'}`);

// --- OAuth token ---
async function refreshToken() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN env vars');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  writeFileSync(tokenPath, data.access_token);
  console.log('OAuth token refreshed.');
  return data.access_token;
}

async function getToken() {
  // Try cached token first (less than 50 min old)
  if (existsSync(tokenPath)) {
    const stat = await import('fs').then(fs => fs.statSync(tokenPath));
    const ageMin = (Date.now() - stat.mtimeMs) / 60000;
    if (ageMin < 50) {
      return readFileSync(tokenPath, 'utf-8').trim();
    }
  }
  return refreshToken();
}

// --- GSC API ---
async function queryGSC(token, domain, startDate, endDate, startRow = 0) {
  const siteUrl = `sc-domain:${domain}`;
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;

  const body = {
    startDate,
    endDate,
    dimensions: ['date', 'page', 'query'],
    rowLimit: 25000,
    startRow,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.rows || [];
}

// --- Date helpers ---
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function addDays(d, n) {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

function getDateWindows(startDate, endDate, windowDays = 30) {
  const windows = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const windowEnd = new Date(Math.min(addDays(current, windowDays - 1).getTime(), end.getTime()));
    windows.push({
      start: formatDate(current),
      end: formatDate(windowEnd),
    });
    current = addDays(windowEnd, 1);
  }

  return windows;
}

// --- Upsert into DB ---
const upsertPage = db.prepare(`
  INSERT INTO page_snapshots (client_id, snapshot_date, page_url, clicks, impressions, ctr, position)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(client_id, snapshot_date, page_url) DO UPDATE SET
    clicks = excluded.clicks,
    impressions = excluded.impressions,
    ctr = excluded.ctr,
    position = excluded.position
`);

const upsertKeyword = db.prepare(`
  INSERT INTO keyword_snapshots (client_id, snapshot_date, page_url, query, clicks, impressions, ctr, position)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(client_id, snapshot_date, page_url, query) DO UPDATE SET
    clicks = excluded.clicks,
    impressions = excluded.impressions,
    ctr = excluded.ctr,
    position = excluded.position
`);

function processRows(rows) {
  let pageCount = 0;
  let kwCount = 0;

  // GSC returns rows with dimensions: [date, page, query]
  // We need to:
  // 1. Insert keyword-level data directly
  // 2. Aggregate page-level data per (date, page)

  const pageAgg = new Map(); // key: "date|page" -> {clicks, impressions, ctrSum, posSum, count}

  const insertKw = db.transaction((rows) => {
    for (const row of rows) {
      const [date, page, query] = row.keys;
      const { clicks, impressions, ctr, position } = row;

      // Keyword snapshot
      upsertKeyword.run(clientId, date, page, query, clicks, impressions, ctr, position);
      kwCount++;

      // Aggregate for page-level
      const key = `${date}|${page}`;
      if (!pageAgg.has(key)) {
        pageAgg.set(key, { date, page, clicks: 0, impressions: 0, positions: [], ctrs: [] });
      }
      const agg = pageAgg.get(key);
      agg.clicks += clicks;
      agg.impressions += impressions;
      agg.positions.push({ position, impressions });
      agg.ctrs.push({ ctr, impressions });
    }
  });

  insertKw(rows);

  // Now insert page-level aggregates
  const insertPages = db.transaction(() => {
    for (const agg of pageAgg.values()) {
      // Weighted average position (by impressions, same as GSC)
      const totalImp = agg.impressions || 1;
      const weightedPos = agg.positions.reduce((sum, p) => sum + p.position * p.impressions, 0) / totalImp;
      const pageCtr = agg.impressions > 0 ? (agg.clicks / agg.impressions) * 100 : 0;

      upsertPage.run(clientId, agg.date, agg.page, agg.clicks, agg.impressions, Math.round(pageCtr * 100) / 100, Math.round(weightedPos * 10) / 10);
      pageCount++;
    }
  });

  insertPages();

  return { pageCount, kwCount };
}

// --- Main ---
async function main() {
  const token = await getToken();

  const now = new Date();
  let startDate, endDate;

  if (isBackfill) {
    // GSC keeps ~16 months of data
    startDate = formatDate(addDays(now, -480));
    endDate = formatDate(addDays(now, -2)); // GSC data lags ~2 days
  } else {
    // Daily: last 3 days (GSC data lags)
    startDate = formatDate(addDays(now, -4));
    endDate = formatDate(addDays(now, -2));
  }

  console.log(`Date range: ${startDate} to ${endDate}`);

  const windows = getDateWindows(startDate, endDate);
  console.log(`Processing ${windows.length} date window(s)...`);

  let totalPages = 0;
  let totalKw = 0;

  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    process.stdout.write(`  Window ${i + 1}/${windows.length}: ${w.start} → ${w.end} ... `);

    // Paginate through all results (25k per request)
    let allRows = [];
    let startRow = 0;

    while (true) {
      const rows = await queryGSC(token, client.domain, w.start, w.end, startRow);
      if (rows.length === 0) break;
      allRows = allRows.concat(rows);
      if (rows.length < 25000) break;
      startRow += rows.length;
    }

    if (allRows.length > 0) {
      const { pageCount, kwCount } = processRows(allRows);
      totalPages += pageCount;
      totalKw += kwCount;
      console.log(`${allRows.length} rows → ${pageCount} page snapshots, ${kwCount} keyword snapshots`);
    } else {
      console.log('no data');
    }

    // Small delay between windows to be nice to the API
    if (i < windows.length - 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\nDone! Totals: ${totalPages} page snapshots, ${totalKw} keyword snapshots`);

  // Show DB stats
  const pageRows = db.prepare('SELECT COUNT(*) as cnt FROM page_snapshots WHERE client_id = ?').get(clientId);
  const kwRows = db.prepare('SELECT COUNT(*) as cnt FROM keyword_snapshots WHERE client_id = ?').get(clientId);
  console.log(`Database totals for ${clientId}: ${pageRows.cnt} page snapshots, ${kwRows.cnt} keyword snapshots`);

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
