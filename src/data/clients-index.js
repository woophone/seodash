// Multi-client dashboard index
export const clientsIndex = {
  dashboard: {
    title: "SEO Intelligence Dashboard",
    subtitle: "Professional SEO Analysis & Client Reporting",
    company: "iHostWP SEO Services"
  },
  
  clients: [
    {
      code: "cs",
      name: "Compulsion Solutions",
      domain: "compulsionsolutions.com",
      industry: "Mental Health / Addiction Treatment",
      status: "urgent",
      lastAnalysis: "2026-02-20",
      description: "Sex addiction therapy practice with 59% traffic decline",
      metrics: {
        monthlyClicks: 478,
        potentialClicks: 680,
        keywordsTracked: 100,
        mainIssue: "YMYL Compliance"
      },
      actions: {
        urgent: 3,
        high: 5, 
        medium: 8
      }
    }
    // Additional clients will be added here
  ]
};

export const getClientByCode = (code) => {
  return clientsIndex.clients.find(client => client.code === code);
};