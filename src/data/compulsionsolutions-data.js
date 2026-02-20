export const clientData = {
  client: {
    name: "Compulsion Solutions",
    domain: "compulsionsolutions.com",
    industry: "Mental Health / Addiction Treatment",
    analysisDate: "2026-02-20",
    primaryContact: "Ginger",
    targetPage: "/sex-and-porn-addiction-quizes/"
  },

  overview: {
    status: "URGENT",
    statusColor: "red",
    trafficDecline: "59%",
    declineTimeline: "4 weeks (Jan 23 - Feb 19, 2026)",
    currentMonthlyClicks: 478,
    potentialMonthlyClicks: 680,
    mainIssue: "YMYL Compliance Failure",
    crashDate: "2026-02-08"
  },

  performance: {
    current28Days: {
      clicks: 478,
      impressions: 24189,
      ctr: 1.98,
      avgPosition: 11.3,
      uniqueKeywords: 100
    },
    beforeCrash: {
      date: "Jan 20 - Feb 7, 2026",
      peakWeekClicks: 156,
      currentWeekClicks: 64,
      percentageDecline: 59
    },
    monthlyTrends: [
      { month: "2025-11", clicks: 391, impressions: 14239, ctr: 2.7 },
      { month: "2025-12", clicks: 402, impressions: 15219, ctr: 2.6 },
      { month: "2026-01", clicks: 618, impressions: 31668, ctr: 2.0 },
      { month: "2026-02", clicks: 284, impressions: 13918, ctr: 2.0 }
    ]
  },

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
          summary: "Same YMYL fixes — recovers alongside 'hypersexuality test'",
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
      {
        keyword: "adhd hypersexuality test",
        volume: 70,
        currentPosition: null,
        difficulty: "Low",
        opportunity: "Easy win - no strong competition",
        potentialClicks: 35
      },
      {
        keyword: "hypersexuality test for teens",
        volume: 70,
        currentPosition: 56,
        difficulty: 15,
        opportunity: "Beat Psychology-Tools at #2",
        potentialClicks: 40
      },
      {
        keyword: "female hypersexuality test",
        volume: 10,
        currentPosition: null,
        difficulty: "Low",
        opportunity: "Untapped market segment",
        potentialClicks: 15
      }
    ]
  },

  technicalIssues: {
    ymyl: {
      status: "FAILING",
      severity: "CRITICAL",
      issues: [
        "No medical disclaimer on assessment pages",
        "No visible author credentials (LMFT, CSAT, etc.)",
        "Missing 'seek professional help' warnings",
        "No research citations for legitimacy",
        "Outdated content (last updated 2022)",
        "No treatment center authority signals"
      ],
      impact: "Google doesn't trust medical content without proper compliance"
    },
    onPage: {
      status: "NEEDS WORK",
      severity: "MEDIUM",
      issues: [
        "ALL 4 images missing alt text",
        "Meta description contains typo 'hypersexualtiy'",
        "Missing H2 tags entirely (0 found)",
        "Title tag missing emotional hooks",
        "No FAQ schema markup",
        "Poor internal linking structure"
      ],
      quickWins: [
        { task: "Fix image alt text", time: "15 min", impact: "HIGH" },
        { task: "Correct meta description", time: "10 min", impact: "HIGH" },
        { task: "Optimize title tag", time: "5 min", impact: "HIGH" }
      ]
    }
  },

  actionPlan: {
    phases: [
      {
        phase: 1,
        name: "YMYL Emergency Fixes",
        timeline: "Week 1-2",
        priority: "CRITICAL",
        expectedImpact: "Position 6 to 3-4, +150-200 clicks/mo",
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

  considerations: [
    {
      id: "published-book",
      severity: "HIGH",
      category: "Untapped Authority",
      title: "Published book with ~800 Amazon reviews — not mentioned anywhere on site",
      finding: "George Collins, founder of Compulsion Solutions, authored \"Breaking the Cycle: Free Yourself from Sex Addiction, Porn Obsession, and Shame\" (New Harbinger Publications). The book has approximately 800 reviews on Amazon with a 4.5+ star rating and is available as a free Kindle download. It is also available on Audible, Barnes & Noble, and Google Books. Despite this, the book is not referenced on any page of compulsionsolutions.com — not on the assessment pages, not in author bios, not in the site footer.",
      whyItMatters: "Google's E-E-A-T guidelines (Experience, Expertise, Authoritativeness, Trustworthiness) are the primary quality signal for YMYL health content. A published book with hundreds of verified reviews is the single strongest form of author authority that exists — it proves expertise in a way no certification badge or disclaimer can. Google's Search Quality Rater Guidelines specifically cite \"published works\" and \"external reputation\" as top-tier authority evidence. This is not a nice-to-have — for YMYL health content, this is the highest-value trust signal available, and it's currently invisible to both Google and site visitors.",
      competitiveAngle: "None of the competitors currently outranking Compulsion Solutions have a published book. SagebrushCounseling beats them with basic YMYL compliance (therapist byline + disclaimers). WikiHow wins on brand recognition alone. Neither can match a published author with hundreds of reviews in this exact subject matter. This is the single biggest competitive differentiator available — and it already exists. It just needs to be visible.",
      source: {
        type: "Amazon",
        url: "https://www.amazon.com/Breaking-Cycle-Yourself-Addiction-Obsession-ebook/dp/B005JT6ZYW",
        title: "Breaking the Cycle: Free Yourself from Sex Addiction, Porn Obsession, and Shame",
        author: "George Collins, MA",
        publisher: "New Harbinger Publications",
        reviewCount: "~800",
        rating: "4.5+"
      }
    }
  ],

  projections: {
    timeline: [
      {
        week: 2,
        expectedClicks: 630,
        keywordPositions: "3-5 for main terms",
        status: "YMYL compliance impact"
      },
      {
        week: 4,
        expectedClicks: 780,
        keywordPositions: "2-4 for main terms",
        status: "Content expansion impact"
      },
      {
        week: 6,
        expectedClicks: 1000,
        keywordPositions: "1-3 for main terms",
        status: "Full optimization complete"
      }
    ]
  }
};
