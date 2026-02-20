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
        ctr: 2.8,
        priority: "HIGH",
        status: "MAJOR DROP"
      },
      {
        keyword: "hypersexual test", 
        volume: 1000,
        currentPosition: 6,
        previousPosition: "1-2",
        currentClicks: 21,
        lostClicks: 20,
        ctr: 1.9,
        priority: "HIGH",
        status: "MAJOR DROP"
      },
      {
        keyword: "am i hypersexual quiz",
        volume: 720,
        currentPosition: 12,
        previousPosition: "1-5",
        currentClicks: 15,
        lostClicks: 15,
        ctr: 2.2,
        priority: "HIGH",
        status: "PAGE 2"
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

  competitors: {
    topThreats: [
      {
        domain: "sagebrushcounseling.com",
        position: 2,
        traffic: 922,
        authority: 7,
        strength: "Licensed therapy practice",
        keywords: ["#1 hypersexual test", "#1 hypersexual quiz", "#2 hypersexuality test"],
        weakness: "General counseling vs specialist",
        threat: "HIGH"
      },
      {
        domain: "psychology-tools.com", 
        position: 8,
        traffic: 889,
        authority: 56,
        strength: "Assessment platform specialist",
        keywords: ["#2 teen hypersexuality tests", "#18 pornography quiz"],
        weakness: "Clinical vs accessible",
        threat: "MEDIUM"
      },
      {
        domain: "wikihow.com",
        position: 1,
        traffic: 1017,
        authority: 20,
        strength: "Massive brand recognition",
        keywords: ["#1 hypersexuality test"],
        weakness: "No professional credentials",
        threat: "MEDIUM"
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
        expectedImpact: "Position 6→3-4, +150-200 clicks",
        tasks: [
          {
            task: "Add medical disclaimers",
            description: "Professional medical disclaimer above all assessments",
            time: "2 hours",
            impact: "Addresses main YMYL failure"
          },
          {
            task: "Display author credentials", 
            description: "Licensed therapist byline with certifications",
            time: "1 hour",
            impact: "Establishes professional authority"
          },
          {
            task: "Add research citations",
            description: "Link to peer-reviewed studies and clinical tools", 
            time: "3 hours",
            impact: "Academic legitimacy for Google"
          }
        ]
      },
      {
        phase: 2,
        name: "Content Expansion",
        timeline: "Week 3-4", 
        priority: "HIGH",
        expectedImpact: "+100-150 clicks from new keywords",
        tasks: [
          {
            task: "Create teen assessment page",
            description: "/hypersexuality-test-teens/ targeting 70 monthly searches",
            time: "6 hours",
            impact: "Capture underserved market"
          },
          {
            task: "Create ADHD assessment page",
            description: "/adhd-hypersexuality-test/ - no competition",
            time: "4 hours", 
            impact: "Easy ranking win"
          }
        ]
      }
    ]
  },

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