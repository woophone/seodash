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

console.log('Database initialized.');

// Show table counts
const tables = ['clients', 'page_snapshots', 'keyword_snapshots'];
for (const t of tables) {
  const row = db.prepare(`SELECT COUNT(*) as cnt FROM ${t}`).get();
  console.log(`  ${t}: ${row.cnt} rows`);
}

db.close();
