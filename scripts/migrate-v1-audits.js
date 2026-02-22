// Migration script: Import v1 report data into SQLite audit tables
// Sources: cs-quiz-report.js, cs-is-looking-report.js, quiz-work.js, is-looking-work.js
// Run: node scripts/migrate-v1-audits.js

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db', 'seodash.db');

console.log(`Opening database at ${dbPath}`);
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// --- Import source data files ---
const { quizReport } = await import('../src/data/cs-quiz-report.js');
const { isLookingReport } = await import('../src/data/cs-is-looking-report.js');
const { workLog: quizWorkLog } = await import('../src/data/work-logs/quiz-work.js');
const { workLog: isLookingWorkLog } = await import('../src/data/work-logs/is-looking-work.js');

// --- Constants ---
const CLIENT_ID = 'cs';
const RUN_DATE = '2026-02-21';
const QUIZ_URL = 'https://compulsionsolutions.com/sex-and-porn-addiction-quizes/';
const IS_LOOKING_URL = 'https://compulsionsolutions.com/can-looking-be-a-symptom-of-sex-addiction-by-james-gallegos-m-a/';

// --- Prepared statements ---
const insertAuditRun = db.prepare(`
  INSERT OR REPLACE INTO audit_runs (client_id, page_url, dimension_id, status, run_date, summary, score, findings, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const insertActionItem = db.prepare(`
  INSERT INTO action_items (client_id, page_url, dimension_id, severity, title, detail, current_state, target_state, status, metadata)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const deleteActionItems = db.prepare(`
  DELETE FROM action_items WHERE client_id = ? AND page_url = ?
`);

// --- Helper: map on-page fix id to dimension ---
const quizFixDimensionMap = {
  'content': 'content-eeat',
  'ymyl-disclaimer': 'content-eeat',
  'author': 'content-eeat',
  'freshness': 'content-freshness',
  'title': 'on-page-seo',
  'meta-desc': 'on-page-seo',
  'og-image': 'on-page-seo',
};

const isLookingFixDimensionMap = {
  'headings': 'on-page-seo',
  'author-byline': 'content-eeat',
  'schema': 'schema-markup',
  'image-alt': 'images-media',
  'ymyl-disclaimer': 'content-eeat',
  'outbound-links': 'topical-cluster',
};

// --- Helper: map fit to severity ---
function fitToSeverity(fit) {
  if (fit === 'strong') return 'high';
  if (fit === 'moderate') return 'medium';
  return 'medium';
}

// --- Run everything in a transaction ---
const migrate = db.transaction(() => {
  // ============================================================
  // QUIZ PAGE
  // ============================================================
  console.log('\n--- Quiz page: /sex-and-porn-addiction-quizes/ ---');

  // Delete existing action items for idempotency
  const quizDeleted = deleteActionItems.run(CLIENT_ID, QUIZ_URL);
  console.log(`  Deleted ${quizDeleted.changes} existing action_items`);

  // Audit run: content-eeat
  insertAuditRun.run(
    CLIENT_ID, QUIZ_URL, 'content-eeat', 'audited', RUN_DATE,
    'Zero editorial content — 3 navigation buttons with no supporting text. 0 words in content area.',
    15,
    JSON.stringify(quizReport.contentAudit)
  );

  // Audit run: schema-markup
  insertAuditRun.run(
    CLIENT_ID, QUIZ_URL, 'schema-markup', 'audited', RUN_DATE,
    'Has WebPage, BreadcrumbList, WebSite schema. Missing Person, MedicalWebPage, Quiz types. Typo in description.',
    40,
    JSON.stringify(quizReport.contentAudit.schema)
  );

  // Audit run: on-page-seo
  insertAuditRun.run(
    CLIENT_ID, QUIZ_URL, 'on-page-seo', 'audited', RUN_DATE,
    "Title 87 chars (truncated). Meta desc has typo + 201 chars. No og:image. URL misspells 'quizzes'.",
    35,
    JSON.stringify(quizReport.contentAudit.meta)
  );

  // Audit run: core-web-vitals
  insertAuditRun.run(
    CLIENT_ID, QUIZ_URL, 'core-web-vitals', 'audited', RUN_DATE,
    'Mobile: 92 perf, Desktop: 97. TTFB 930ms on mobile (over 600ms threshold).',
    90,
    JSON.stringify(quizReport.lighthouse)
  );

  // Audit run: serp-features
  insertAuditRun.run(
    CLIENT_ID, QUIZ_URL, 'serp-features', 'audited', RUN_DATE,
    quizReport.serpFeatures.summary,
    null,
    JSON.stringify(quizReport.serpFeatures)
  );

  // Audit run: internal-links-inbound
  const quizNewLinks = quizWorkLog.links.filter(l => l.type === 'new');
  const quizVerifyLinks = quizWorkLog.links.filter(l => l.type === 'verify');
  insertAuditRun.run(
    CLIENT_ID, QUIZ_URL, 'internal-links-inbound', 'audited', RUN_DATE,
    '9 new link opportunities identified, 7 existing links need verification. Critical linking deficit.',
    20,
    JSON.stringify({ newLinks: quizNewLinks.length, verifyLinks: quizVerifyLinks.length, postsScanned: quizWorkLog.meta.postsScanned })
  );

  console.log('  Inserted 6 audit_runs');

  // Action items: new internal links
  let quizActionCount = 0;
  for (const link of quizNewLinks) {
    insertActionItem.run(
      CLIENT_ID, QUIZ_URL, 'internal-links-inbound',
      fitToSeverity(link.fit),
      `Add internal link from "${link.sourceTitle}"`,
      link.reason,
      'No link to quiz page',
      `Add link with anchor "${link.anchorText}"`,
      'pending',
      JSON.stringify({ sourcePostId: link.sourcePostId, sourceUrl: link.sourceUrl, anchorText: link.anchorText, fit: link.fit })
    );
    quizActionCount++;
  }

  // Action items: verify existing links
  for (const link of quizVerifyLinks) {
    insertActionItem.run(
      CLIENT_ID, QUIZ_URL, 'internal-links-inbound',
      'high',
      `Verify/fix link in "${link.sourceTitle}"`,
      link.reason,
      null,
      null,
      'pending',
      JSON.stringify({ sourcePostId: link.sourcePostId, sourceUrl: link.sourceUrl })
    );
    quizActionCount++;
  }

  // Action items: on-page fixes
  for (const fix of quizWorkLog.onPageFixes) {
    const dimensionId = quizFixDimensionMap[fix.id];
    if (!dimensionId) {
      console.warn(`  WARNING: No dimension mapping for quiz fix id "${fix.id}" — skipping`);
      continue;
    }
    insertActionItem.run(
      CLIENT_ID, QUIZ_URL, dimensionId,
      fix.severity,
      fix.action,
      fix.detail || null,
      fix.current || null,
      fix.target || null,
      'pending',
      null
    );
    quizActionCount++;
  }

  console.log(`  Inserted ${quizActionCount} action_items`);

  // ============================================================
  // IS LOOKING PAGE
  // ============================================================
  console.log('\n--- Is Looking page: /can-looking-be-a-symptom-of-sex-addiction-by-james-gallegos-m-a/ ---');

  // Delete existing action items for idempotency
  const isLookingDeleted = deleteActionItems.run(CLIENT_ID, IS_LOOKING_URL);
  console.log(`  Deleted ${isLookingDeleted.changes} existing action_items`);

  // Audit run: content-eeat
  insertAuditRun.run(
    CLIENT_ID, IS_LOOKING_URL, 'content-eeat', 'audited', RUN_DATE,
    '959 words of expert content by James Gallegos, M.A. Strong E-E-A-T signals but author not visible in content area.',
    65,
    JSON.stringify(isLookingReport.contentAudit)
  );

  // Audit run: schema-markup
  insertAuditRun.run(
    CLIENT_ID, IS_LOOKING_URL, 'schema-markup', 'audited', RUN_DATE,
    'Has WebPage, BreadcrumbList, WebSite. Missing Article and Person schema for authored content.',
    30,
    JSON.stringify(isLookingReport.contentAudit.schema)
  );

  // Audit run: on-page-seo
  insertAuditRun.run(
    CLIENT_ID, IS_LOOKING_URL, 'on-page-seo', 'audited', RUN_DATE,
    'Title 64 chars (acceptable). No meta description verified. Very long URL but includes author name.',
    55,
    JSON.stringify(isLookingReport.contentAudit.meta)
  );

  // Audit run: internal-links-inbound
  const isLookingLinks = isLookingWorkLog.links;
  insertAuditRun.run(
    CLIENT_ID, IS_LOOKING_URL, 'internal-links-inbound', 'audited', RUN_DATE,
    '10 link opportunities identified. Critical orphan page — only 1 inbound link from 333 posts.',
    10,
    JSON.stringify({ newLinks: isLookingLinks.length, verifyLinks: 0, postsScanned: isLookingWorkLog.meta.postsScanned })
  );

  console.log('  Inserted 4 audit_runs');

  // Action items: internal links
  let isLookingActionCount = 0;
  for (const link of isLookingLinks) {
    insertActionItem.run(
      CLIENT_ID, IS_LOOKING_URL, 'internal-links-inbound',
      fitToSeverity(link.fit),
      `Add internal link from "${link.sourceTitle}"`,
      link.reason,
      'No link to is-looking page',
      `Add link with anchor "${link.anchorText}"`,
      'pending',
      JSON.stringify({ sourcePostId: link.sourcePostId, sourceUrl: link.sourceUrl, anchorText: link.anchorText, fit: link.fit })
    );
    isLookingActionCount++;
  }

  // Action items: on-page fixes
  for (const fix of isLookingWorkLog.onPageFixes) {
    const dimensionId = isLookingFixDimensionMap[fix.id];
    if (!dimensionId) {
      console.warn(`  WARNING: No dimension mapping for is-looking fix id "${fix.id}" — skipping`);
      continue;
    }
    insertActionItem.run(
      CLIENT_ID, IS_LOOKING_URL, dimensionId,
      fix.severity,
      fix.action,
      fix.detail || null,
      fix.current || null,
      fix.target || null,
      'pending',
      null
    );
    isLookingActionCount++;
  }

  console.log(`  Inserted ${isLookingActionCount} action_items`);
});

// Execute the transaction
migrate();

// --- Print final row counts ---
console.log('\n--- Final row counts ---');
const auditRunCount = db.prepare('SELECT COUNT(*) as cnt FROM audit_runs').get();
const actionItemCount = db.prepare('SELECT COUNT(*) as cnt FROM action_items').get();
console.log(`  audit_runs: ${auditRunCount.cnt} rows`);
console.log(`  action_items: ${actionItemCount.cnt} rows`);

// Show breakdown by page
const auditByPage = db.prepare('SELECT page_url, COUNT(*) as cnt FROM audit_runs WHERE client_id = ? GROUP BY page_url').all(CLIENT_ID);
console.log('\n  audit_runs by page:');
for (const row of auditByPage) {
  console.log(`    ${row.page_url}: ${row.cnt}`);
}

const actionByPage = db.prepare('SELECT page_url, COUNT(*) as cnt FROM action_items WHERE client_id = ? GROUP BY page_url').all(CLIENT_ID);
console.log('\n  action_items by page:');
for (const row of actionByPage) {
  console.log(`    ${row.page_url}: ${row.cnt}`);
}

db.close();
console.log('\nMigration complete.');
