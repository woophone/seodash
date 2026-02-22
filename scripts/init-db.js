import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db', 'seodash.db');
const schemaPath = join(__dirname, '..', 'db', 'schema.sql');

console.log(`Initializing database at ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);

// Seed Compulsion Solutions client
const insert = db.prepare(`
  INSERT OR IGNORE INTO clients (id, name, domain, industry, primary_contact)
  VALUES (?, ?, ?, ?, ?)
`);
insert.run('cs', 'Compulsion Solutions', 'compulsionsolutions.com', 'Mental Health / Addiction Treatment', 'Ginger');

// Seed audit dimensions
const insertDim = db.prepare(`
  INSERT OR IGNORE INTO audit_dimensions (id, name, tier, category, sort_order, card_description)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const dimensions = [
  // Tier 1 — Foundational
  ['crawlability', 'Crawlability & Indexability', 1, 'automated', 1, 'robots.txt, meta robots, canonical, sitemap, noindex flags'],
  ['search-intent', 'Search Intent Alignment', 1, 'automated', 2, 'Keyword cluster coherence — does Google know what this page is about?'],
  ['content-eeat', 'Content Quality & E-E-A-T', 1, 'automated', 3, 'Word count, heading structure, author info, credentials, trust signals'],
  // Tier 2 — High-Impact On-Page
  ['on-page-seo', 'On-Page SEO', 2, 'automated', 4, 'Title tag, meta description, URL structure, headings, canonical, og tags'],
  ['internal-links-inbound', 'Internal Links — Inbound', 2, 'automated', 5, 'How many posts link to this page, anchor text, orphan detection'],
  ['backlinks', 'Backlink Profile', 2, 'placeholder', 6, 'Requires external link data (Ahrefs/Semrush)'],
  // Tier 3 — Technical Performance
  ['core-web-vitals', 'Core Web Vitals & Performance', 3, 'automated', 7, 'LCP, CLS, INP scores (mobile + desktop), speed metrics'],
  // Tier 4 — Content Enrichment
  ['schema-markup', 'Schema Markup', 4, 'automated', 8, 'JSON-LD detection, validation, missing types'],
  ['content-freshness', 'Content Freshness', 4, 'automated', 9, 'dateModified age, staleness correlation with rankings'],
  ['images-media', 'Images & Media', 4, 'automated', 10, 'Alt text, file sizes, formats, lazy loading, og:image'],
  // Tier 5 — Topical Authority & Stability
  ['topical-cluster', 'Topical Cluster', 5, 'automated', 11, 'Content hub around this topic, supporting articles, outbound links'],
  ['ranking-stability', 'Ranking Stability', 5, 'automated', 12, 'Yo-yo detection, daily volatility, biggest swings'],
  ['algorithm-correlation', 'Algorithm Correlation', 5, 'automated', 13, 'Position changes vs confirmed Google core updates'],
  // Tier 6 — Advanced (Placeholder)
  ['serp-features', 'SERP Features', 6, 'placeholder', 14, 'Requires SERP API — competitive landscape audit'],
  ['competitor-analysis', 'Competitor Analysis', 6, 'placeholder', 15, 'Requires SERP + competitor data — competitive audit'],
  ['content-duplication', 'Content Duplication', 6, 'placeholder', 16, 'Requires crawl data or Copyscape — duplication check'],
];

for (const d of dimensions) {
  insertDim.run(...d);
}

console.log('Database initialized.');

// Show table counts
const tables = ['clients', 'page_snapshots', 'keyword_snapshots', 'audit_dimensions', 'audit_runs', 'action_items'];
for (const t of tables) {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${t}`).get();
  console.log(`  ${t}: ${row.cnt} rows`);
}

db.close();
