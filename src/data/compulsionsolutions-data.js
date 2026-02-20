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
      title: "Published book with cross-platform validation — invisible on site",
      finding: "George Collins, founder of Compulsion Solutions, authored \"Breaking the Cycle: Free Yourself from Sex Addiction, Porn Obsession, and Shame\" (New Harbinger Publications). The book has approximately 800 reviews on Amazon (4.5+ stars) and 468 ratings on Goodreads (4.18 stars, 77% rated 4-5 stars). It is available across Amazon Kindle, Audible, Barnes & Noble, Google Books, and Goodreads. Despite this validated cross-platform presence, the book is not referenced on any page of compulsionsolutions.com — not on the assessment pages, not in author bios, not in the site footer.",
      whyItMatters: "Google's E-E-A-T guidelines (Experience, Expertise, Authoritativeness, Trustworthiness) are the primary quality signal for YMYL health content. A published book with hundreds of verified reviews across multiple platforms is the single strongest form of author authority that exists — it proves expertise in a way no certification badge or disclaimer can. Google's Search Quality Rater Guidelines specifically cite \"published works\" and \"external reputation\" as top-tier authority evidence. The cross-platform consistency (high ratings on both Amazon and Goodreads) eliminates any possibility of artificial inflation — this is genuine, verified reader trust. For YMYL health content, this is the highest-value trust signal available, and it's currently invisible to both Google and site visitors.",
      competitiveAngle: "None of the competitors currently outranking Compulsion Solutions have a published book. SagebrushCounseling beats them with basic YMYL compliance (therapist byline + disclaimers). WikiHow wins on brand recognition alone. Neither can match a published author with ~1,300 combined reader ratings across platforms in this exact subject matter. This is the single biggest competitive differentiator available — and it already exists. It just needs to be visible.",
      source: {
        type: "Amazon",
        url: "https://www.amazon.com/Breaking-Cycle-Yourself-Addiction-Obsession-ebook/dp/B005JT6ZYW",
        title: "Breaking the Cycle: Free Yourself from Sex Addiction, Porn Obsession, and Shame",
        author: "George Collins, MA",
        publisher: "New Harbinger Publications",
        reviewCount: "~800",
        rating: "4.5+"
      },
      additionalSources: [
        {
          type: "Goodreads",
          url: "https://www.goodreads.com/book/show/26710171-breaking-the-cycle",
          ratingCount: "468",
          rating: "4.18",
          breakdown: "77% rated 4-5 stars"
        }
      ]
    },
    {
      id: "author-entity-gap",
      severity: "HIGH",
      category: "Entity Disconnect",
      title: "Google can't connect George Collins to his own authority signals",
      finding: "George Collins has a verified presence across multiple authoritative platforms: Amazon Author page, Goodreads author profile, LinkedIn professional profile, and New Harbinger publisher page. However, compulsionsolutions.com has no Person schema markup, no sameAs links, and no structured data connecting George Collins the site author to George Collins the published expert. These dots are not being connected. Google's Knowledge Graph relies on explicit signals (schema.org sameAs) to associate an entity across platforms — without them, the book's authority, the LinkedIn credentials, and the publisher relationship are invisible to Google's entity understanding.",
      whyItMatters: "Schema.org Person markup with sameAs links is the technical mechanism that tells Google \"the person writing this YMYL health content is the same person who wrote a book with 800+ Amazon reviews and 468 Goodreads ratings from a legitimate psychology publisher.\" Without this, Google treats the site author and the book author as potentially unrelated entities. For YMYL content, this connection is the difference between Google seeing a random website making health claims and a recognized expert with externally validated authority. This is not speculative — sameAs is a documented, crawled, and indexed property that directly feeds Google's Knowledge Graph.",
      competitiveAngle: "This is a technical implementation gap, not a content gap. The authority already exists — it just needs to be machine-readable. Competitors would need to actually write a book and accumulate hundreds of reviews to match this signal. Compulsion Solutions only needs to add markup to claim what's already theirs.",
      platforms: [
        { name: "Amazon Author", url: "https://www.amazon.com/stores/George-Collins/author/B005HSLMYS", metric: "~800 reviews" },
        { name: "Goodreads", url: "https://www.goodreads.com/book/show/26710171-breaking-the-cycle", metric: "468 ratings" },
        { name: "LinkedIn", url: "https://www.linkedin.com/in/george-collins-94437611/", metric: "Professional profile" },
        { name: "New Harbinger", url: "https://www.newharbinger.com/author/george-collins/", metric: "Publisher page" }
      ],
      actionItems: [
        {
          task: "Add Person schema to every YMYL page",
          detail: "Every article and assessment page on compulsionsolutions.com should include JSON-LD Person schema for George Collins with sameAs links pointing to his Amazon author page, Goodreads profile, LinkedIn, and New Harbinger publisher page."
        },
        {
          task: "Include Book schema alongside Person schema",
          detail: "Add schema.org Book markup for \"Breaking the Cycle\" with author reference linking back to the Person entity, publisher (New Harbinger Publications), and aggregateRating data from Amazon/Goodreads."
        }
      ]
    },
    {
      id: "author-page-missing",
      severity: "HIGH",
      category: "Missing Authority Hub",
      title: "No dedicated author page — the canonical 'George Collins' page doesn't exist",
      finding: "There is no robust, dedicated author page on compulsionsolutions.com. The current team section is a brief bio blurb, not a canonical entity page that Google can treat as the authoritative \"about this person\" reference. A proper author page functions as the hub that Google associates with the entity — it's where the Knowledge Graph looks to understand who is authoring the YMYL content on this domain.",
      whyItMatters: "Google's Search Quality Rater Guidelines instruct raters to investigate content creators by looking for a dedicated page about them. When a quality rater Googles \"George Collins sex addiction\" and finds a real book from a real publisher with nearly 1,300 combined ratings, that changes their assessment of the site's trustworthiness — but only if the site itself connects those dots. The author page is the on-site hub that makes the E-E-A-T case self-evident. Without it, you're relying on raters to do independent research rather than leading them to the conclusion.",
      competitiveAngle: "SagebrushCounseling displays therapist credentials prominently but has no book, no publisher relationship, and no cross-platform presence. A dedicated author page for George Collins that references the book by name, the publisher, and the review counts creates a level of author authority that competitors literally cannot replicate without years of work.",
      actionItems: [
        {
          task: "Create a dedicated /about/george-collins/ author page",
          detail: "Build a robust, standalone author page (not a team bio blurb) that functions as the canonical entity reference. Include: full professional background, the book by name and publisher (\"author of Breaking the Cycle, published by New Harbinger Publications, with over 800 reader reviews on Amazon\"), links to where readers can find the book, credentials (MA, CSAT), treatment philosophy, and professional affiliations."
        },
        {
          task: "Link author page from every YMYL content page",
          detail: "Every assessment, article, and service page should include a visible author byline that links back to the dedicated author page. This creates a clear internal linking structure that establishes George Collins as the authoritative voice behind all YMYL content on the domain."
        },
        {
          task: "Reference review counts and ratings naturally",
          detail: "On service pages and key articles, reference his published author status as social proof: \"George Collins, author of Breaking the Cycle (New Harbinger Publications) — rated 4.5 stars with over 800 reviews on Amazon.\" This is legitimate social proof for both quality raters and site visitors evaluating trustworthiness."
        }
      ]
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
