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

-- Each audit dimension registered here
CREATE TABLE IF NOT EXISTS audit_dimensions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL,       -- 'automated' | 'placeholder'
  sort_order INTEGER DEFAULT 0,
  card_description TEXT          -- shown when not yet audited
);

-- One row per audit run (a specific dimension for a specific page)
CREATE TABLE IF NOT EXISTS audit_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  dimension_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started',
  run_date TEXT,
  summary TEXT,                  -- 1-2 sentence card summary
  score INTEGER,                 -- optional 0-100
  findings TEXT,                 -- JSON blob with full audit data
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(client_id, page_url, dimension_id)
);

-- Action items generated from audit findings
CREATE TABLE IF NOT EXISTS action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL,
  page_url TEXT NOT NULL,
  dimension_id TEXT NOT NULL,
  severity TEXT NOT NULL,        -- 'critical' | 'high' | 'medium' | 'low'
  title TEXT NOT NULL,
  detail TEXT,
  current_state TEXT,
  target_state TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata TEXT,                 -- JSON: sourcePostId, anchorText, etc.
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_runs_page ON audit_runs(client_id, page_url);
CREATE INDEX IF NOT EXISTS idx_action_items_page ON action_items(client_id, page_url, dimension_id);
CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(client_id, status);
