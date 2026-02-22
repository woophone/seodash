/**
 * Core Web Vitals Auditor
 *
 * Uses PageSpeed Insights API to fetch LCP, CLS, TBT/INP scores
 * for both mobile and desktop strategies.
 */

async function runPageSpeed(fullUrl, apiKey, strategy) {
  const params = new URLSearchParams({
    url: fullUrl,
    key: apiKey,
    strategy,
    category: 'performance',
  });
  // Add multiple categories
  params.append('category', 'seo');
  params.append('category', 'accessibility');

  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PageSpeed API error (${strategy}): ${response.status} — ${text.substring(0, 200)}`);
  }

  return await response.json();
}

function extractMetrics(data) {
  const audits = data.lighthouseResult?.audits || {};
  const categories = data.lighthouseResult?.categories || {};

  // Core Web Vitals metrics
  const lcp = audits['largest-contentful-paint'];
  const cls = audits['cumulative-layout-shift'];
  const tbt = audits['total-blocking-time'];
  const inp = audits['interaction-to-next-paint'] || null; // may not be available
  const fcp = audits['first-contentful-paint'];
  const ttfb = audits['server-response-time'];
  const si = audits['speed-index'];

  // Category scores (0-1, convert to 0-100)
  const perfScore = categories.performance?.score != null ? Math.round(categories.performance.score * 100) : null;
  const seoScore = categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null;
  const a11yScore = categories.accessibility?.score != null ? Math.round(categories.accessibility.score * 100) : null;

  return {
    performance: perfScore,
    seo: seoScore,
    accessibility: a11yScore,
    lcp: {
      value: lcp?.numericValue || null,
      displayValue: lcp?.displayValue || null,
      score: lcp?.score != null ? Math.round(lcp.score * 100) : null,
    },
    cls: {
      value: cls?.numericValue || null,
      displayValue: cls?.displayValue || null,
      score: cls?.score != null ? Math.round(cls.score * 100) : null,
    },
    tbt: {
      value: tbt?.numericValue || null,
      displayValue: tbt?.displayValue || null,
      score: tbt?.score != null ? Math.round(tbt.score * 100) : null,
    },
    inp: inp ? {
      value: inp.numericValue || null,
      displayValue: inp.displayValue || null,
      score: inp.score != null ? Math.round(inp.score * 100) : null,
    } : null,
    fcp: {
      value: fcp?.numericValue || null,
      displayValue: fcp?.displayValue || null,
      score: fcp?.score != null ? Math.round(fcp.score * 100) : null,
    },
    ttfb: {
      value: ttfb?.numericValue || null,
      displayValue: ttfb?.displayValue || null,
      score: ttfb?.score != null ? Math.round(ttfb.score * 100) : null,
    },
    speedIndex: {
      value: si?.numericValue || null,
      displayValue: si?.displayValue || null,
      score: si?.score != null ? Math.round(si.score * 100) : null,
    },
  };
}

function getThresholdStatus(metric, value) {
  if (value === null) return 'unknown';

  const thresholds = {
    lcp: { good: 2500, poor: 4000 },      // ms
    cls: { good: 0.1, poor: 0.25 },
    tbt: { good: 200, poor: 600 },         // ms
    inp: { good: 200, poor: 500 },         // ms
    fcp: { good: 1800, poor: 3000 },       // ms
    ttfb: { good: 600, poor: 1800 },       // ms
  };

  const t = thresholds[metric];
  if (!t) return 'unknown';

  if (value <= t.good) return 'good';
  if (value <= t.poor) return 'needs-improvement';
  return 'poor';
}

export default async function audit(db, clientId, pageUrl, options = {}) {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    return {
      summary: 'Cannot run: GOOGLE_CLOUD_API_KEY environment variable not set.',
      score: null,
      findings: { error: 'Missing GOOGLE_CLOUD_API_KEY' },
      actionItems: [],
    };
  }

  let mobileData, desktopData;
  const errors = [];

  // Run both strategies (sequentially to avoid rate limiting)
  try {
    mobileData = await runPageSpeed(pageUrl, apiKey, 'mobile');
  } catch (err) {
    errors.push(`Mobile: ${err.message}`);
  }

  try {
    desktopData = await runPageSpeed(pageUrl, apiKey, 'desktop');
  } catch (err) {
    errors.push(`Desktop: ${err.message}`);
  }

  if (!mobileData && !desktopData) {
    return {
      summary: `PageSpeed API failed for both strategies: ${errors.join('; ')}`,
      score: null,
      findings: { errors },
      actionItems: [],
    };
  }

  const mobile = mobileData ? extractMetrics(mobileData) : null;
  const desktop = desktopData ? extractMetrics(desktopData) : null;

  // Score: average of mobile and desktop performance scores
  const scores = [];
  if (mobile?.performance != null) scores.push(mobile.performance);
  if (desktop?.performance != null) scores.push(desktop.performance);
  const score = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Build summary
  const parts = [];
  if (mobile?.performance != null) parts.push(`Mobile: ${mobile.performance}`);
  if (desktop?.performance != null) parts.push(`Desktop: ${desktop.performance}`);
  if (mobile?.lcp?.displayValue) parts.push(`LCP: ${mobile.lcp.displayValue}`);
  if (mobile?.cls?.displayValue) parts.push(`CLS: ${mobile.cls.displayValue}`);
  if (mobile?.tbt?.displayValue) parts.push(`TBT: ${mobile.tbt.displayValue}`);

  const summary = parts.length > 0
    ? `Performance scores — ${parts.join(', ')}.`
    : 'Unable to extract performance metrics.';

  const findings = {
    mobile,
    desktop,
    errors: errors.length > 0 ? errors : undefined,
  };

  // --- Action items ---
  const actionItems = [];

  // Check each CWV metric on mobile (mobile-first)
  if (mobile) {
    const cwvChecks = [
      { key: 'lcp', name: 'Largest Contentful Paint (LCP)', unit: 'ms' },
      { key: 'cls', name: 'Cumulative Layout Shift (CLS)', unit: '' },
      { key: 'tbt', name: 'Total Blocking Time (TBT)', unit: 'ms' },
      { key: 'fcp', name: 'First Contentful Paint (FCP)', unit: 'ms' },
      { key: 'ttfb', name: 'Time to First Byte (TTFB)', unit: 'ms' },
    ];

    for (const check of cwvChecks) {
      const metric = mobile[check.key];
      if (!metric || metric.value === null) continue;

      const status = getThresholdStatus(check.key, metric.value);
      if (status === 'poor') {
        actionItems.push({
          severity: 'high',
          title: `${check.name} is poor (mobile)`,
          detail: `${check.name} value: ${metric.displayValue || metric.value + check.unit}. This is in the "poor" range and directly impacts user experience and search rankings.`,
          currentState: metric.displayValue || `${metric.value}${check.unit}`,
          targetState: `Under ${check.key === 'cls' ? '0.1' : check.key === 'lcp' ? '2.5s' : check.key === 'tbt' ? '200ms' : check.key === 'fcp' ? '1.8s' : '600ms'}`,
          metadata: { metric: check.key, value: metric.value, strategy: 'mobile' },
        });
      } else if (status === 'needs-improvement') {
        actionItems.push({
          severity: 'medium',
          title: `${check.name} needs improvement (mobile)`,
          detail: `${check.name} value: ${metric.displayValue || metric.value + check.unit}. This is in the "needs improvement" range.`,
          currentState: metric.displayValue || `${metric.value}${check.unit}`,
          targetState: `Under ${check.key === 'cls' ? '0.1' : check.key === 'lcp' ? '2.5s' : check.key === 'tbt' ? '200ms' : check.key === 'fcp' ? '1.8s' : '600ms'}`,
          metadata: { metric: check.key, value: metric.value, strategy: 'mobile' },
        });
      }
    }

    // Low performance score warning
    if (mobile.performance !== null && mobile.performance < 50) {
      actionItems.push({
        severity: 'critical',
        title: `Very low mobile performance score (${mobile.performance}/100)`,
        detail: 'Mobile performance score below 50 indicates serious performance issues. Google uses mobile-first indexing, so this directly impacts rankings.',
        currentState: `Mobile performance: ${mobile.performance}/100`,
        targetState: 'Mobile performance > 90/100',
      });
    }
  }

  // Check desktop too for critical issues
  if (desktop && desktop.performance !== null && desktop.performance < 50) {
    actionItems.push({
      severity: 'high',
      title: `Low desktop performance score (${desktop.performance}/100)`,
      detail: 'Desktop performance is also below 50, suggesting fundamental performance issues.',
      currentState: `Desktop performance: ${desktop.performance}/100`,
      targetState: 'Desktop performance > 90/100',
    });
  }

  if (errors.length > 0) {
    actionItems.push({
      severity: 'low',
      title: 'PageSpeed API errors during audit',
      detail: errors.join('; '),
      currentState: 'Partial data collected',
      targetState: 'Full data from both strategies',
    });
  }

  return { summary, score, findings, actionItems };
}
