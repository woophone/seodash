# SEO Dashboard (seodash)

## What This Is
A multi-client SEO dashboard framework. Each client gets their own route (e.g., `/cs/` for Compulsion Solutions). The root `/` is an owner-only dashboard (password protected). Built with Astro (static output) deployed via Coolify on Hetzner.

## Architecture
- **Astro** static site generator (`output: 'static'` in astro.config)
- **Docker** multi-stage build: node:18-alpine (build) → nginx:alpine (serve)
- **Nginx** with custom config: basic auth on root, X-Robots-Tag, try_files
- **Coolify** for deployment at `seo.ihostwp.com`

## V2 Client Framework Pattern
Each client uses SQLite as source of truth, with automated audit runners and static Astro builds.

### Data layer:
- **SQLite database**: `db/seodash.db` — all GSC data, audit runs, action items
- **Schema**: `db/schema.sql` — clients, page_snapshots, keyword_snapshots, audit_dimensions, audit_runs, action_items
- **GSC fetch**: `scripts/fetch-gsc.js` — pulls daily snapshots into SQLite
- **Audit runners**: `scripts/audit-page.js` — runs 12 automated auditors per page, writes to SQLite

### Presentation layer:
- **V2 dashboard**: `src/pages/v2/{slug}/index.astro` — time range selectors, sortable columns, per-page links
- **V2 per-page reports**: `src/pages/v2/{slug}/pages/[slug].astro` — metrics, charts, tiered audit cards, keywords
- **V2 components**: `src/components/v2/` — AuditCard, AuditDetail, ActionItemList, MetricsGrid, KeywordsTable, etc.

### Per-page report layout:
1. Page header + URL + GSC metrics
2. Time series charts (clicks, impressions, position)
3. Tiered audit cards (16 dimensions across 6 tiers — see `memory/v2-system.md`)
4. Action items list (pending / completed)
5. Keywords table (all GSC keywords for that page)

### V1 pages (legacy):
V1 pages at `/cs/` still exist using `src/data/cs-data.js`. They are NOT deleted — V2 at `/v2/cs/` will replace them when ready.

## Data Integrity Rules
- **ONLY use GSC-verified data** for rankings, positions, clicks, impressions
- **NEVER use Semrush estimates** — they were wrong and removed
- **Verify ALL claims** against source (Wayback Machine, GSC API, schema inspection)
- **If data can't be verified, don't display it**
- Position data: GSC avgPosition (NOT Semrush estimated rank)
- Competitor data: removed entirely — client doesn't need it

## Security / Anti-Discovery
- `robots.txt`: `Disallow: /` for all user agents
- Meta tags: `noindex, nofollow, noarchive, nosnippet` + googlebot-specific
- Nginx header: `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`
- Root `/` protected with basic auth (admin:seodash2026 in `.htpasswd`)
- Client pages (`/cs/`, etc.) are public but non-discoverable
- No breadcrumbs (removed for cleanliness + prevents accidental linking)

## Deployment
```bash
# Build & deploy via Coolify API
curl -s -X POST "http://89.167.46.71:8000/api/v1/applications/lw44s8gkos84wgggog8okw08/restart" \
  -H "Authorization: Bearer ..." -H "Content-Type: application/json"
```
Git push to `main` on `github.com/woophone/seodash` triggers Coolify auto-deploy.

## API Access

### Google Search Console (GSC)
- OAuth2 with refresh token
- Env vars in `~/.bashrc`:
  - `GOOGLE_CLIENT_ID` — OAuth client ID
  - `GOOGLE_CLIENT_SECRET` — OAuth client secret
  - `GOOGLE_REFRESH_TOKEN` — long-lived refresh token
- Token exchange: `POST https://oauth2.googleapis.com/token` with client_id, client_secret, refresh_token, grant_type=refresh_token
- GSC endpoint: `https://www.googleapis.com/webmasters/v3/sites/sc-domain%3A{domain}/searchAnalytics/query`
- **Important**: Use `sc-domain:` prefix for domain properties (NOT `https://`)
- Dimensions: `date`, `query`, `page`, `device`, `country`
- Cache token to `/tmp/gsc_token.txt`
- Quick token refresh: `source ~/.bashrc && curl -s -X POST "https://oauth2.googleapis.com/token" -d "client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${GOOGLE_REFRESH_TOKEN}&grant_type=refresh_token" | jq -r '.access_token' > /tmp/gsc_token.txt`

### Google PageSpeed Insights
- API key in `~/.bashrc`: `GOOGLE_CLOUD_API_KEY`
- Endpoint: `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url={url}&key=${GOOGLE_CLOUD_API_KEY}&strategy={mobile|desktop}`
- Categories: `performance`, `seo`, `accessibility`, `best-practices`
- Alternative: Use Lighthouse CLI directly (`npx lighthouse {url}`)
- Fallback: Web UI at `https://pagespeed.web.dev/`

### Coolify Deployment
- API: `http://89.167.46.71:8000/api/v1/applications/lw44s8gkos84wgggog8okw08/restart`
- Auth token in env: `COOLIFY_API_TOKEN`
- Or use: `curl -s -X POST "http://89.167.46.71:8000/api/v1/applications/lw44s8gkos84wgggog8okw08/restart" -H "Authorization: Bearer ${COOLIFY_API_TOKEN}" -H "Content-Type: application/json"`

## Per-Page Workflow (V2 — Three Phases)

Full details in `memory/v2-system.md` and `memory/page-audit-framework.md`.

### Phase 1: Diagnosis (automated)
Run `npx tsx scripts/audit-page.js --client cs --url "/path/" --all`. Writes findings to `audit_runs` — NO action items. Client-facing audit cards show what was found and why it matters. They do NOT show instructions, recommendations, or to-do items. We report and educate — we don't prescribe.

### Phase 2: Remedy Planning (per dimension, admin-only)
Pick a specific dimension to work on. Translate the Phase 1 finding into specific, executable action items in `action_items` table. Items appear on the remedy page (`/v2/cs/pages/{slug}/remedy/`) — visible only via `?user=admin`. Each item has exact details: WP post IDs, anchor text, new copy, JSON-LD code, etc.

### Phase 3: Execution
Execute pending items from the remedy page. Mark completed in SQLite. Rebuild and deploy. The remedy page becomes proof-of-work showing what was done.

### Key rules:
- Phase 1 auditors write findings only — they do NOT create action items (TODO: auditor code needs updating)
- Phase 2 runs per dimension, not all at once
- The remedy page shows ALL dimensions with status (clean / pending / planned / complete)
- SEO methodology in `memory/page-audit-framework.md` governs interpretation throughout
- SEO skills (`seo-page`, `seo-content`, `seo-schema`) are supplementary, not the primary workflow

## Key Decisions
- Stripped Semrush data, competitor battle cards — chaotic, unverified
- On-page issues belong in per-page reports, NOT on main dashboard
- Dashboard = global overview only (YMYL site-wide issues, considerations, action plan)
- Always push back on user requests that don't serve the client's interest
- This framework will be reused for future clients
- **V2**: SQLite is the single source of truth — no more JS data files for new work
- **V2**: 12 automated auditors for diagnosis — but they produce findings, not action items
- **V2**: Action items created only in Phase 2 (remedy planning), live in SQLite `action_items` table
- **V2**: Remedy page (admin-only) is the work-order — one per page, all dimensions, status tracking
- **V2**: Client sees findings + education, never instructions or to-do items
- **V2**: Origin IP (curl --resolve) bypasses Cloudflare — Wayback Machine no longer needed
