# SEO Dashboard (seodash)

## What This Is
A multi-client SEO dashboard framework. Each client gets their own route (e.g., `/cs/` for Compulsion Solutions). The root `/` is an owner-only dashboard (password protected). Built with Astro (static output) deployed via Coolify on Hetzner.

## Architecture
- **Astro** static site generator (`output: 'static'` in astro.config)
- **Docker** multi-stage build: node:18-alpine (build) → nginx:alpine (serve)
- **Nginx** with custom config: basic auth on root, X-Robots-Tag, try_files
- **Coolify** for deployment at `seo.ihostwp.com`

## Client Framework Pattern
Each client follows this structure:
- **Data file**: `src/data/{client-slug}-data.js` — all client data, GSC-verified
- **Dashboard page**: `src/pages/{slug}.astro` — client-facing rankings overview
- **Per-page reports**: `src/pages/{slug}/pages/{page-slug}.astro` — detailed page-level SEO reports
- **Client index**: `src/data/clients-index.js` — registry for owner dashboard

### Dashboard sections (client-facing):
1. Client header + data source attribution
2. Key metrics (clicks, impressions, page 1 count, page 2 count)
3. Rankings table with "Report" column (links to per-page reports, green check / red X)
4. Site-wide issues (YMYL critical only — things affecting ALL pages)
5. Considerations (expandable strategic findings)
6. Action plan (phased)

### Per-page report sections:
1. Page header + URL + GSC metrics
2. Keywords table (all GSC keywords for that page)
3. PageSpeed / Core Web Vitals (desktop + mobile)
4. Content audit (word count, heading structure, internal links)
5. On-page issues (specific to THIS page only)
6. Recommendations

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
curl -s -X POST "http://localhost:8000/api/v1/applications/lw44s8gkos84wgggog8okw08/restart" \
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
- API: `http://localhost:8000/api/v1/applications/lw44s8gkos84wgggog8okw08/restart`
- Auth token in env: `COOLIFY_API_TOKEN`
- Or use: `curl -s -X POST "http://localhost:8000/api/v1/applications/lw44s8gkos84wgggog8okw08/restart" -H "Authorization: Bearer ${COOLIFY_API_TOKEN}" -H "Content-Type: application/json"`

## Per-Page Report Workflow (PROJECT RULE)
For every page report, ALWAYS follow this two-layer process:

### Layer 1: claude-seo skill audit
Run `/seo page` (or `seo-page` skill) on the live HTML first. This provides:
- Standardized on-page SEO scoring
- Content quality assessment
- Schema detection and validation with ready-to-use JSON-LD
- Image audit
- Technical meta tag analysis
- GEO (AI search readiness) assessment

### Layer 2: GSC data overlay (YOU own this)
Layer GSC API data on top of the skill output. This is what makes our reports unique:
- Real keyword data (queries, clicks, impressions, CTR, position)
- Time series trends (impression/click history)
- SERP feature landscape (from Semrush where available)
- Content area vs template distinction (apply page-audit-framework.md)
- Narrative framing (strength-first, opportunity-focused)

### The final report is OURS
The claude-seo skill provides a starting checklist. The GSC data, SERP context, content area scoping, and client narrative are what make the report actionable. Always cross-validate skill findings against our framework in `memory/page-audit-framework.md`.

## Key Decisions
- Stripped Semrush data, competitor battle cards — chaotic, unverified
- On-page issues belong in per-page reports, NOT on main dashboard
- Dashboard = global overview only (YMYL site-wide issues, considerations, action plan)
- Always push back on user requests that don't serve the client's interest
- This framework will be reused for future clients

## Hetzner/Cloudflare Issue
Hetzner IPs are blocked by Cloudflare. Cannot directly fetch client sites.
Workaround: Use Wayback Machine archives or GSC API data.
TODO: Set up user's home laptop as residential IP proxy.
