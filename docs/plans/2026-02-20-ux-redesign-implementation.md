# Dashboard UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the CS dashboard from flat disconnected sections into keyword-centric battle cards with nested competitors, designed as a sales audit tool.

**Architecture:** Rewrite the data model to nest competitors inside keywords, then rewrite `cs.astro` to render expandable keyword battle cards with your-page-vs-theirs comparisons. Simplify recovery plan. Remove modals (replaced by in-page expandable cards). Update Layout.astro to replace modal JS with toggle JS.

**Tech Stack:** Astro 4.x, Tailwind CSS, vanilla JS for expand/collapse

---

### Task 1: Rewrite the data model

**Files:**
- Modify: `src/data/compulsionsolutions-data.js`

**Step 1: Rewrite the `keywords` and `competitors` sections**

Replace the current flat `keywords.primary` array and `competitors.topThreats` array with a keyword-centric structure. Each keyword gets a `yourPage` object (with signal checklist), a `competitors` array (with per-competitor signals, URL, edge, weakness), and a `fix` summary.

Remove the top-level `competitors` object entirely.

Simplify `actionPlan.phases[].tasks` — remove `description`, `time`, and `impact` fields (too detailed for a sales audit). Keep only task name.

The new data structure:

```js
export const clientData = {
  // client, overview, performance — UNCHANGED

  keywords: {
    primary: [
      {
        keyword: "hypersexuality test",
        volume: 1900,
        currentPosition: 6,
        previousPosition: "1-2",
        currentClicks: 57,
        lostClicks: 45,
        status: "MAJOR DROP",
        yourPage: {
          url: "/sex-and-porn-addiction-quizes/",
          signals: [
            { label: "Medical disclaimer", present: false },
            { label: "Author credentials (LMFT, CSAT)", present: false },
            { label: "Research citations", present: false },
            { label: "Content updated recently", present: false },
            { label: "'Seek professional help' warning", present: false }
          ]
        },
        competitors: [
          {
            domain: "wikihow.com",
            position: 1,
            pageUrl: "https://www.wikihow.com/Know-if-You-Are-Hypersexual",
            traffic: 1017,
            signals: [
              { label: "Brand authority", present: true },
              { label: "Structured step-by-step content", present: true },
              { label: "Professional credentials", present: false },
              { label: "Specialist focus", present: false }
            ],
            edge: "Massive brand trust — Google defaults to recognizable domains",
            weakness: "No medical authority. Generic content, not clinically valid."
          },
          {
            domain: "sagebrushcounseling.com",
            position: 2,
            pageUrl: "https://sagebrushcounseling.com/hypersexual-quiz/",
            traffic: 922,
            signals: [
              { label: "Licensed therapist byline", present: true },
              { label: "Medical disclaimers", present: true },
              { label: "Research citations", present: true },
              { label: "Specialist focus", present: false }
            ],
            edge: "Full YMYL compliance — exactly what Google requires for health content",
            weakness: "General counseling practice, not addiction specialist. Single quiz page with no depth."
          }
        ],
        fix: {
          summary: "YMYL compliance + credential display",
          targetPosition: "2-3",
          expectedClickGain: "+150-200/mo"
        }
      },
      {
        keyword: "hypersexual test",
        volume: 1000,
        currentPosition: 6,
        previousPosition: "1-2",
        currentClicks: 21,
        lostClicks: 20,
        status: "MAJOR DROP",
        yourPage: {
          url: "/sex-and-porn-addiction-quizes/",
          signals: [
            { label: "Medical disclaimer", present: false },
            { label: "Author credentials (LMFT, CSAT)", present: false },
            { label: "Research citations", present: false },
            { label: "Content updated recently", present: false }
          ]
        },
        competitors: [
          {
            domain: "sagebrushcounseling.com",
            position: 1,
            pageUrl: "https://sagebrushcounseling.com/hypersexual-quiz/",
            traffic: 922,
            signals: [
              { label: "Licensed therapist byline", present: true },
              { label: "Medical disclaimers", present: true },
              { label: "Research citations", present: true }
            ],
            edge: "YMYL-compliant with licensed therapist credentials displayed prominently",
            weakness: "General counseling practice — your addiction specialization is a stronger authority signal"
          }
        ],
        fix: {
          summary: "Same YMYL fixes — this keyword recovers alongside 'hypersexuality test'",
          targetPosition: "2-3",
          expectedClickGain: "+80-100/mo"
        }
      },
      {
        keyword: "am i hypersexual quiz",
        volume: 720,
        currentPosition: 12,
        previousPosition: "1-5",
        currentClicks: 15,
        lostClicks: 15,
        status: "PAGE 2",
        yourPage: {
          url: "/sex-and-porn-addiction-quizes/",
          signals: [
            { label: "Medical disclaimer", present: false },
            { label: "Quiz-specific landing content", present: false },
            { label: "Author credentials (LMFT, CSAT)", present: false },
            { label: "FAQ schema markup", present: false }
          ]
        },
        competitors: [
          {
            domain: "sagebrushcounseling.com",
            position: 1,
            pageUrl: "https://sagebrushcounseling.com/hypersexual-quiz/",
            traffic: 922,
            signals: [
              { label: "Quiz-focused page title", present: true },
              { label: "Licensed therapist byline", present: true },
              { label: "Medical disclaimers", present: true }
            ],
            edge: "Page title directly matches 'quiz' search intent",
            weakness: "Same single page for all quiz-related queries — no depth"
          }
        ],
        fix: {
          summary: "YMYL compliance + quiz-optimized content structure",
          targetPosition: "3-5",
          expectedClickGain: "+40-60/mo"
        }
      }
    ],
    opportunities: [
      // UNCHANGED — keep as-is
    ]
  },

  // Remove top-level `competitors` object entirely

  technicalIssues: {
    // UNCHANGED
  },

  actionPlan: {
    phases: [
      {
        phase: 1,
        name: "YMYL Emergency Fixes",
        timeline: "Week 1-2",
        priority: "CRITICAL",
        expectedImpact: "Position 6→3-4, +150-200 clicks/mo",
        taskCount: 3
      },
      {
        phase: 2,
        name: "Content Expansion",
        timeline: "Week 3-4",
        priority: "HIGH",
        expectedImpact: "+100-150 clicks from new keywords",
        taskCount: 2
      }
    ]
  },

  projections: {
    // UNCHANGED
  }
};
```

**Step 2: Verify the file is valid JS**

```bash
cd /home/builder/projects/seodash && node -e "import('./src/data/compulsionsolutions-data.js').then(m => console.log('OK:', Object.keys(m.clientData)))"
```

Expected: `OK: [ 'client', 'overview', 'performance', 'keywords', 'technicalIssues', 'actionPlan', 'projections' ]`

**Step 3: Commit**

```bash
git add src/data/compulsionsolutions-data.js
git commit -m "refactor: restructure data model — nest competitors inside keywords"
```

---

### Task 2: Update Layout.astro — replace modal JS with toggle JS

**Files:**
- Modify: `src/layouts/Layout.astro`

**Step 1: Replace the modal script and styles with a toggle script**

Replace the `openModal`/`closeModal` script with a simple `toggleBattle` function:

```js
document.querySelectorAll('[data-toggle]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.toggle);
    if (target) {
      target.classList.toggle('hidden');
      const arrow = btn.querySelector('.toggle-arrow');
      if (arrow) arrow.classList.toggle('rotate-180');
    }
  });
});
```

Remove the modal container div, modal CSS, and escape key listener (no more modals).

---

### Task 3: Rewrite cs.astro — keyword battle cards

**Files:**
- Modify: `src/pages/cs.astro`

This is the largest task. The entire page body from the "Primary Keywords Performance Table" down through the "Competitor Detail Modals" gets replaced.

**Step 1: Keep sections 1-2 (header + metrics) unchanged**

Lines 1-138 of current cs.astro stay as-is (breadcrumb, client header, critical alert, key metrics grid).

**Step 2: Replace the keywords table + competitors + modals with keyword battle cards**

The new section renders each `keywords.primary` entry as an expandable card:

**Collapsed card markup (per keyword):**
- Row 1: keyword name (bold), search volume, position badge showing change, lost clicks in red
- Row 2: "Beating you:" followed by competitor domain names
- Toggle button: "See Battle" with a rotating arrow

**Expanded card markup (appears below collapsed when toggled):**
- **"Your Page"** block: URL displayed, then a grid of signal pills — green check + label for present, red X + label for missing
- **"vs"** divider
- **Per-competitor block** (for each competitor in the keyword's array):
  - Domain name (bold) + position badge + traffic
  - Clickable URL linking to their actual page (opens in new tab)
  - Signal pills (same green/red check/X pattern)
  - "Their edge:" one-liner in italic
  - "Their weakness:" one-liner
- **"What we'll fix"** bar at bottom: fix.summary, target position, expected click gain

**Step 3: Replace the recovery plan section**

Replace the current detailed action plan with a compact layout:

Left side: phase cards (phase number circle, name, timeline, priority badge, task count)
Right side: projections (week number, expected clicks, position range, milestone label)

No individual task listings, no descriptions, no time estimates.

**Step 4: Remove all modals at the bottom of the file**

Delete the keyword detail modals and competitor detail modals (lines 330-429 of current file). The expandable cards replace them entirely.

**Step 5: Keep the site health section as-is**

The technical issues section (YMYL compliance issues + quick wins) stays unchanged.

---

### Task 4: Build and verify

**Step 1: Build the project**

```bash
cd /home/builder/projects/seodash && npm run build
```

Expected: `2 page(s) built` with exit 0. Both `dist/index.html` and `dist/cs/index.html` must exist.

**Step 2: Visual verification**

Serve locally and check:
```bash
npx serve dist -l 4322 &
curl -s http://localhost:4322/cs/ | grep -c "data-toggle"
kill %1
```

Expected: at least 3 matches (one per keyword battle card toggle button).

**Step 3: Commit**

```bash
git add src/pages/cs.astro src/layouts/Layout.astro
git commit -m "feat: keyword-centric battle cards with nested competitors

Replaces flat keyword table + disconnected competitor cards with
expandable keyword battle cards showing your-page-vs-theirs
comparison with signal checklists. Simplifies recovery plan for
sales audit context."
```

---

### Task 5: Deploy to Coolify

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Step 2: Trigger Coolify deployment**

```bash
curl -s -X POST \
  -H "Authorization: Bearer 5|af683c482fc34b87f292b748dc10dd353596c1293b26097270bdb9cadfe1b6ac" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  "http://localhost:8000/api/v1/deploy?uuid=lw44s8gkos84wgggog8okw08"
```

**Step 3: Wait for deployment and verify**

```bash
# Wait for build
sleep 45

# Verify live site
curl -sL https://seo.ihostwp.com/cs/ | grep -c "data-toggle"
```

Expected: at least 3 matches.
