# Dashboard UX Redesign: Keyword-Centric Battle Cards

## Problem

The dashboard presents SEO data in flat, disconnected sections. A client sees "Competitive Landscape" but can't tell what keyword a competitor is beating them for, what page is outranking theirs, or why. Technical issues float in their own section with no connection to the keyword battles they cause. The client can't follow the thread from problem → cause → competitor → fix.

Additionally, this is a **sales audit tool** (not a monitoring dashboard). The audience is prospective clients evaluating whether to hire the agency. The information hierarchy needs to: prove deep expertise through detailed diagnosis, create competitive urgency, and show just enough of the recovery plan to build confidence — without giving away the recipe.

## Design

### Page Structure (5 sections)

1. **Header + Situation Alert** — no changes needed
2. **Key Metrics** — 4-card grid, no changes needed
3. **Keyword Battles** — NEW: the main content area
4. **Site Health Issues** — technical problems and quick wins (page-wide issues)
5. **Recovery Plan** — simplified: phases + projections, no step-by-step details

### Keyword Battle Cards

Each tracked keyword gets an expandable card. This replaces the keywords table, competitors section, and competitor modals.

**Collapsed state:** keyword name, search volume, position change, lost clicks, who's beating you.

**Expanded state:**
- **Your page** with checkmarks/crosses for what's present/missing (YMYL signals, credentials, etc.)
- **Each competitor's page** with their URL (clickable), checkmarks for what they have, their traffic, edge summary, and weakness
- **Fix summary** — one line describing the fix approach + target position + expected click gain

### Data Model

Competitors move from a flat top-level list to being nested inside keywords:

```js
keywords.primary[0] = {
  keyword: "hypersexuality test",
  volume: 1900,
  currentPosition: 6,
  previousPosition: "1-2",
  currentClicks: 57,
  lostClicks: 45,
  yourPage: {
    url: "/sex-and-porn-addiction-quizes/",
    signals: [
      { label: "Medical disclaimer", present: false },
      { label: "Author credentials", present: false },
      { label: "Research citations", present: false },
      { label: "Recently updated", present: false }
    ]
  },
  competitors: [
    {
      domain: "wikihow.com",
      position: 1,
      pageUrl: "https://www.wikihow.com/...",
      traffic: 1017,
      signals: [
        { label: "Brand authority", present: true },
        { label: "Structured content", present: true },
        { label: "Professional credentials", present: false }
      ],
      edge: "Massive brand trust with Google",
      weakness: "No medical authority — beatable with proper credentials"
    },
    {
      domain: "sagebrushcounseling.com",
      position: 2,
      pageUrl: "https://sagebrushcounseling.com/...",
      traffic: 922,
      signals: [
        { label: "Licensed therapist byline", present: true },
        { label: "Medical disclaimers", present: true },
        { label: "Research citations", present: true }
      ],
      edge: "YMYL-compliant content from licensed practice",
      weakness: "General counseling, not addiction specialist"
    }
  ],
  fix: {
    summary: "YMYL compliance + credential display",
    targetPosition: "2-3",
    expectedClickGain: "+150-200/mo"
  }
}
```

### Recovery Plan (simplified)

Remove: specific task descriptions, time estimates, how-to details.
Keep: phase names, timelines, expected click projections, priority badges.

Show as a compact phase timeline with a projections column — enough to demonstrate a plan exists without handing them the playbook.

### Site Health Section

Keep the existing technical issues and quick wins sections mostly as-is. These cover page-wide problems (alt text, meta typo, missing H2s) that don't map to a single keyword battle.

### What Gets Removed

- Standalone "Competitive Landscape" section (absorbed into keyword battles)
- Keyword detail modals (replaced by expandable battle cards — no modal needed)
- Competitor detail modals (competitor info lives inside keyword cards)
- Detailed action plan task descriptions (replaced by high-level phase summary)
