/**
 * E-E-A-T Signals Auditor
 *
 * Checks for Experience, Expertise, Authoritativeness, and Trustworthiness signals.
 * This is mapped to the 'content-eeat' dimension in the database.
 */

import { fetchOriginHTML } from './lib/fetch-origin.js';

// Common credential patterns
const CREDENTIAL_PATTERNS = [
  /\bM\.?A\.?\b/,
  /\bPh\.?D\.?\b/,
  /\bPsy\.?D\.?\b/,
  /\bLMFT\b/,
  /\bLCSW\b/,
  /\bLPC\b/,
  /\bLMHC\b/,
  /\bM\.?D\.?\b/,
  /\bD\.?O\.?\b/,
  /\bR\.?N\.?\b/,
  /\bNP\b/,
  /\bCADC\b/,
  /\bCCSAT\b/,
  /\bCSAT\b/,
  /\bCertified\b/i,
  /\bLicensed\b/i,
  /\bBoard[\s-]?Certified\b/i,
];

// Trust signal keywords
const TRUST_KEYWORDS = [
  'certified',
  'licensed',
  'accredited',
  'board certified',
  'member of',
  'affiliated with',
  'association',
  'credential',
  'professional',
  'registered',
  'approved',
];

// Disclaimer patterns
const DISCLAIMER_PATTERNS = [
  /disclaimer/i,
  /not\s+(a\s+)?medical\s+advice/i,
  /not\s+(a\s+)?substitute\s+for/i,
  /consult\s+(a\s+|your\s+)?(doctor|physician|professional|therapist|healthcare)/i,
  /professional\s+advice/i,
  /for\s+informational\s+purposes/i,
  /seek\s+professional/i,
];

function stripHtmlTags(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function audit(db, clientId, pageUrl, options = {}) {
  const domain = options.domain || 'compulsionsolutions.com';

  let html;
  try {
    ({ html } = fetchOriginHTML(pageUrl, domain));
  } catch (err) {
    return {
      summary: `Failed to fetch page: ${err.message}`,
      score: null,
      findings: { error: err.message },
      actionItems: [],
    };
  }

  const plainText = stripHtmlTags(html);
  const signals = [];
  let score = 0;

  // --- Author detection ---
  let authorName = null;
  let authorFound = false;

  // Check for author in meta tags
  const authorMeta = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']author["']/i);
  if (authorMeta) {
    authorName = authorMeta[1].trim();
    authorFound = true;
  }

  // Check for author in HTML attributes
  if (!authorFound) {
    const authorClass = html.match(/class=["'][^"']*author[^"']*["'][^>]*>([^<]+)/i);
    if (authorClass && authorClass[1].trim().length > 2) {
      authorName = authorClass[1].trim();
      authorFound = true;
    }
  }

  // Check for rel="author"
  if (!authorFound) {
    const relAuthor = html.match(/rel=["']author["'][^>]*>([^<]+)/i);
    if (relAuthor) {
      authorName = relAuthor[1].trim();
      authorFound = true;
    }
  }

  // Check for "by " pattern in text
  if (!authorFound) {
    const byline = plainText.match(/\bby\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/);
    if (byline) {
      authorName = byline[1];
      authorFound = true;
    }
  }

  if (authorFound) {
    signals.push({ type: 'author', detail: `Author identified: ${authorName}`, weight: 15 });
    score += 15;
  }

  // --- Author credentials ---
  let credentialsFound = [];
  for (const pattern of CREDENTIAL_PATTERNS) {
    const match = plainText.match(pattern);
    if (match) {
      credentialsFound.push(match[0]);
    }
  }
  credentialsFound = [...new Set(credentialsFound)];

  if (credentialsFound.length > 0) {
    signals.push({
      type: 'credentials',
      detail: `Professional credentials found: ${credentialsFound.join(', ')}`,
      weight: 20,
    });
    score += 20;
  }

  // --- Date signals ---
  // Check JSON-LD for dates
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let datePublished = null;
  let dateModified = null;
  let jsonLdMatch;

  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      const items = data['@graph'] || [data];
      for (const item of Array.isArray(items) ? items : [items]) {
        if (item.datePublished) datePublished = item.datePublished;
        if (item.dateModified) dateModified = item.dateModified;
      }
    } catch (e) { /* ignore parse errors */ }
  }

  // Check meta tags for dates
  if (!dateModified) {
    const metaModified = html.match(/<meta\s+property=["']article:modified_time["']\s+content=["']([^"']+)["']/i);
    if (metaModified) dateModified = metaModified[1];
  }
  if (!datePublished) {
    const metaPublished = html.match(/<meta\s+property=["']article:published_time["']\s+content=["']([^"']+)["']/i);
    if (metaPublished) datePublished = metaPublished[1];
  }

  if (datePublished || dateModified) {
    signals.push({
      type: 'dates',
      detail: `Published: ${datePublished || 'N/A'}, Modified: ${dateModified || 'N/A'}`,
      weight: 10,
    });
    score += 10;
  }

  // --- Medical/YMYL disclaimers ---
  let disclaimerFound = false;
  let disclaimerText = null;

  for (const pattern of DISCLAIMER_PATTERNS) {
    const match = plainText.match(pattern);
    if (match) {
      disclaimerFound = true;
      // Extract surrounding context
      const idx = plainText.indexOf(match[0]);
      disclaimerText = plainText.substring(Math.max(0, idx - 50), Math.min(plainText.length, idx + 100)).trim();
      break;
    }
  }

  if (disclaimerFound) {
    signals.push({
      type: 'disclaimer',
      detail: `Medical/professional disclaimer found`,
      weight: 15,
    });
    score += 15;
  }

  // --- Trust signals (certifications, affiliations) ---
  const trustSignalsFound = [];
  for (const keyword of TRUST_KEYWORDS) {
    if (plainText.toLowerCase().includes(keyword)) {
      trustSignalsFound.push(keyword);
    }
  }
  const uniqueTrustSignals = [...new Set(trustSignalsFound)];

  if (uniqueTrustSignals.length >= 3) {
    signals.push({
      type: 'trust',
      detail: `Multiple trust signals: ${uniqueTrustSignals.slice(0, 5).join(', ')}`,
      weight: 15,
    });
    score += 15;
  } else if (uniqueTrustSignals.length > 0) {
    signals.push({
      type: 'trust',
      detail: `Trust signals: ${uniqueTrustSignals.join(', ')}`,
      weight: 10,
    });
    score += 10;
  }

  // --- Person schema in JSON-LD ---
  const hasPersonSchema = html.includes('"@type":"Person"') || html.includes('"@type": "Person"');
  if (hasPersonSchema) {
    signals.push({
      type: 'schema_person',
      detail: 'Person schema present in JSON-LD',
      weight: 10,
    });
    score += 10;
  }

  // --- About page / bio link ---
  const hasAboutLink = /<a[^>]+href=["'][^"']*(?:about|team|staff|bio)[^"']*["']/i.test(html);
  if (hasAboutLink) {
    signals.push({
      type: 'about_link',
      detail: 'Link to about/team/bio page found',
      weight: 5,
    });
    score += 5;
  }

  score = Math.max(0, Math.min(100, score));

  const summary = signals.length > 0
    ? `${signals.length} E-E-A-T signal(s) found: ${signals.map(s => s.type).join(', ')}. Author: ${authorName || 'not identified'}.`
    : 'No E-E-A-T signals detected. This is concerning for YMYL content.';

  const findings = {
    signalCount: signals.length,
    signals,
    author: {
      found: authorFound,
      name: authorName,
    },
    credentials: credentialsFound,
    dates: {
      published: datePublished,
      modified: dateModified,
    },
    disclaimer: {
      found: disclaimerFound,
      text: disclaimerText,
    },
    trustSignals: uniqueTrustSignals,
    personSchema: hasPersonSchema,
    aboutLink: hasAboutLink,
  };

  // --- Action items ---
  const actionItems = [];

  if (!authorFound) {
    actionItems.push({
      severity: 'critical',
      title: 'No author attribution found',
      detail: 'For YMYL content (health/mental health), author attribution is essential. Google uses author signals as a core E-E-A-T factor.',
      currentState: 'No visible author name or byline',
      targetState: 'Visible author byline with credentials and link to bio page',
    });
  }

  if (credentialsFound.length === 0) {
    actionItems.push({
      severity: 'high',
      title: 'No professional credentials displayed',
      detail: 'YMYL health content should clearly display the author\'s professional credentials (e.g., M.A., LMFT, Ph.D.).',
      currentState: 'No credentials visible',
      targetState: 'Author credentials (degree, license) displayed near byline',
    });
  }

  if (!disclaimerFound) {
    actionItems.push({
      severity: 'high',
      title: 'No medical/professional disclaimer',
      detail: 'YMYL health content should include a disclaimer stating the content is for informational purposes and not a substitute for professional advice.',
      currentState: 'No disclaimer found',
      targetState: 'Professional disclaimer visible on page',
    });
  }

  if (!hasPersonSchema) {
    actionItems.push({
      severity: 'medium',
      title: 'No Person schema for author',
      detail: 'Adding Person schema with the author\'s name, credentials, and sameAs links strengthens E-E-A-T signals in structured data.',
      currentState: 'No Person schema',
      targetState: 'Person schema with name, credentials, jobTitle, sameAs',
    });
  }

  if (!dateModified && !datePublished) {
    actionItems.push({
      severity: 'medium',
      title: 'No publication or modification dates',
      detail: 'Displaying dates signals content freshness. For health content, this assures users the information is current.',
      currentState: 'No dates found',
      targetState: 'Visible published and last-modified dates',
    });
  }

  if (!hasAboutLink) {
    actionItems.push({
      severity: 'low',
      title: 'No link to author bio or about page',
      detail: 'Linking to an author bio page creates a verifiable chain of expertise — a strong E-E-A-T signal.',
      currentState: 'No about/bio link found',
      targetState: 'Author name links to dedicated bio page',
    });
  }

  return { summary, score, findings, actionItems };
}
