-- Client registry
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  industry TEXT,
  primary_contact TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Daily GSC snapshots per page
CREATE TABLE IF NOT EXISTS page_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL REFERENCES clients(id),
  snapshot_date TEXT NOT NULL,
  page_url TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  UNIQUE(client_id, snapshot_date, page_url)
);

-- Daily GSC snapshots per keyword per page
CREATE TABLE IF NOT EXISTS keyword_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL REFERENCES clients(id),
  snapshot_date TEXT NOT NULL,
  page_url TEXT NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr REAL DEFAULT 0,
  position REAL DEFAULT 0,
  UNIQUE(client_id, snapshot_date, page_url, query)
);

-- Indexes for the queries we'll run
CREATE INDEX IF NOT EXISTS idx_page_snap_client_date ON page_snapshots(client_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_page_snap_client_url ON page_snapshots(client_id, page_url);
CREATE INDEX IF NOT EXISTS idx_kw_snap_client_page ON keyword_snapshots(client_id, page_url, snapshot_date);
