/**
 * Audit Runner Entry Point
 *
 * Usage:
 *   tsx scripts/audit-page.js --client cs --url "/sex-and-porn-addiction-quizes/" --dimension ranking-stability
 *   tsx scripts/audit-page.js --client cs --url "/sex-and-porn-addiction-quizes/" --all
 */

// Allow HTTPS connections to origin IP (self-signed/mismatched cert is expected)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db', 'seodash.db');

// --- Client domain map ---
const CLIENT_DOMAINS = {
  cs: 'compulsionsolutions.com',
};

// --- All automated auditor dimension IDs (run order) ---
const ALL_DIMENSIONS = [
  'crawlability',
  'search-intent',
  'content-eeat',
  'on-page-seo',
  'internal-links-inbound',
  'core-web-vitals',
  'schema-markup',
  'content-freshness',
  'images-media',
  'topical-cluster',
  'ranking-stability',
  'algorithm-correlation',
];

// --- Parse CLI args ---
function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = { client: null, url: null, dimension: null, all: false };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--client':
        parsed.client = args[++i];
        break;
      case '--url':
        parsed.url = args[++i];
        break;
      case '--dimension':
        parsed.dimension = args[++i];
        break;
      case '--all':
        parsed.all = true;
        break;
    }
  }

  return parsed;
}

// --- Auditor module loader ---
async function loadAuditor(dimensionId) {
  const modulePath = join(__dirname, 'auditors', `${dimensionId}.js`);
  try {
    const mod = await import(modulePath);
    return mod.default;
  } catch (err) {
    throw new Error(`Failed to load auditor "${dimensionId}": ${err.message}`);
  }
}

// --- DB operations ---
function upsertAuditRun(db, clientId, pageUrl, dimensionId, result) {
  const stmt = db.prepare(`
    INSERT INTO audit_runs (client_id, page_url, dimension_id, status, run_date, summary, score, findings, updated_at)
    VALUES (?, ?, ?, 'audited', date('now'), ?, ?, ?, datetime('now'))
    ON CONFLICT(client_id, page_url, dimension_id) DO UPDATE SET
      status = 'audited',
      run_date = date('now'),
      summary = excluded.summary,
      score = excluded.score,
      findings = excluded.findings,
      updated_at = datetime('now')
  `);

  stmt.run(
    clientId,
    pageUrl,
    dimensionId,
    result.summary,
    result.score,
    JSON.stringify(result.findings)
  );
}

function replaceActionItems(db, clientId, pageUrl, dimensionId, actionItems) {
  // Delete existing action items for this dimension
  db.prepare(
    'DELETE FROM action_items WHERE client_id = ? AND page_url = ? AND dimension_id = ?'
  ).run(clientId, pageUrl, dimensionId);

  if (!actionItems || actionItems.length === 0) return 0;

  const insert = db.prepare(`
    INSERT INTO action_items (client_id, page_url, dimension_id, severity, title, detail, current_state, target_state, status, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `);

  const insertAll = db.transaction((items) => {
    for (const item of items) {
      insert.run(
        clientId,
        pageUrl,
        dimensionId,
        item.severity || 'medium',
        item.title,
        item.detail || null,
        item.currentState || null,
        item.targetState || null,
        item.metadata ? JSON.stringify(item.metadata) : null
      );
    }
  });

  insertAll(actionItems);
  return actionItems.length;
}

// --- Run a single auditor ---
async function runAuditor(db, clientId, pageUrl, dimensionId, options) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Auditor: ${dimensionId}`);
  console.log(`  Page:    ${pageUrl}`);
  console.log(`${'='.repeat(60)}`);

  const auditFn = await loadAuditor(dimensionId);
  const startTime = Date.now();

  let result;
  try {
    result = await auditFn(db, clientId, pageUrl, options);
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    result = {
      summary: `Audit failed: ${err.message}`,
      score: null,
      findings: { error: err.message },
      actionItems: [],
    };
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Persist results
  upsertAuditRun(db, clientId, pageUrl, dimensionId, result);
  const actionCount = replaceActionItems(db, clientId, pageUrl, dimensionId, result.actionItems || []);

  // Print summary
  console.log(`  Score:   ${result.score !== null && result.score !== undefined ? result.score : 'N/A'}`);
  console.log(`  Summary: ${result.summary}`);
  console.log(`  Actions: ${actionCount} action item(s)`);
  console.log(`  Time:    ${elapsed}s`);

  if (result.actionItems && result.actionItems.length > 0) {
    console.log('  Action items:');
    for (const item of result.actionItems) {
      const icon = item.severity === 'critical' ? '!!' : item.severity === 'high' ? '!' : '-';
      console.log(`    [${icon}] (${item.severity}) ${item.title}`);
    }
  }

  return result;
}

// --- Main ---
async function main() {
  const parsed = parseArgs(process.argv);

  if (!parsed.client || !parsed.url) {
    console.error('Usage:');
    console.error('  tsx scripts/audit-page.js --client cs --url "/path/" --dimension ranking-stability');
    console.error('  tsx scripts/audit-page.js --client cs --url "/path/" --all');
    console.error('\nAvailable dimensions:');
    for (const d of ALL_DIMENSIONS) {
      console.error(`  - ${d}`);
    }
    process.exit(1);
  }

  if (!parsed.dimension && !parsed.all) {
    console.error('Error: specify --dimension <name> or --all');
    process.exit(1);
  }

  const domain = CLIENT_DOMAINS[parsed.client];
  if (!domain) {
    console.error(`Unknown client: "${parsed.client}". Known clients: ${Object.keys(CLIENT_DOMAINS).join(', ')}`);
    process.exit(1);
  }

  // Expand path to full URL
  const pageUrl = `https://${domain}${parsed.url}`;

  // Open database
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  // Verify client exists in DB
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(parsed.client);
  if (!client) {
    console.error(`Client "${parsed.client}" not found in database. Run "tsx scripts/init-db.js" first.`);
    db.close();
    process.exit(1);
  }

  const options = { domain, clientId: parsed.client };

  // Determine which dimensions to run
  const dimensions = parsed.all ? ALL_DIMENSIONS : [parsed.dimension];

  // Validate dimension names
  for (const d of dimensions) {
    if (!ALL_DIMENSIONS.includes(d)) {
      console.error(`Unknown dimension: "${d}". Available: ${ALL_DIMENSIONS.join(', ')}`);
      db.close();
      process.exit(1);
    }
  }

  console.log(`Audit runner started`);
  console.log(`  Client:     ${client.name} (${parsed.client})`);
  console.log(`  Page URL:   ${pageUrl}`);
  console.log(`  Dimensions: ${dimensions.length === ALL_DIMENSIONS.length ? 'ALL' : dimensions.join(', ')}`);

  const results = {};
  let passed = 0;
  let failed = 0;

  for (const dimensionId of dimensions) {
    try {
      results[dimensionId] = await runAuditor(db, parsed.client, pageUrl, dimensionId, options);
      passed++;
    } catch (err) {
      console.error(`\nFATAL error in ${dimensionId}: ${err.message}`);
      failed++;
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('  AUDIT COMPLETE');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Dimensions run: ${passed + failed} (${passed} ok, ${failed} failed)`);

  if (Object.keys(results).length > 0) {
    console.log('\n  Scores:');
    for (const [dim, result] of Object.entries(results)) {
      const scoreStr = result.score !== null && result.score !== undefined
        ? String(result.score).padStart(3)
        : 'N/A';
      console.log(`    ${dim.padEnd(28)} ${scoreStr}`);
    }
  }

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
