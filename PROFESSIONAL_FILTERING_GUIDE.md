# SpectralScraper - Advanced Professional Lead Filtering Guide

## Overview

SpectralScraper now features enterprise-grade professional lead generation with advanced filtering capabilities. Extract emails, names, phone numbers, and professional data from multiple internet sources with sophisticated filtering by location, industry, job title, company size, and more.

## Key Features

### 🌍 Multi-Source Data Integration
- **Hunter.io** - Email discovery and domain intelligence
- **Clearbit** - Company and professional profiles
- **Apollo.io** - B2B contact information
- **Google Search** - Web-based lead discovery
- **LinkedIn Export** - Professional network data
- **GitHub** - Developer and company leads

### 🎯 Advanced Professional Filtering
- **Location Filtering**: Country, state, city-level targeting
- **Industry Filtering**: Technology, Finance, Healthcare, Retail, Manufacturing, SaaS, and more
- **Job Title Filtering**: CEO, Founder, CTO, VP, Director, Manager, SDR, AE, and custom titles
- **Seniority Levels**: Entry, Mid, Senior, Executive
- **Company Size**: Startup (1-50), Small (51-250), Medium (251-1000), Enterprise (1000+)
- **Employee Count Range**: Custom min/max filtering
- **Revenue Range**: Target companies by annual revenue ($M)
- **Verification Levels**: Lenient (faster), Moderate (balanced), Strict (high quality)

### 📊 Rich Professional Data Fields
```
{
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;                    // Job title
  company: string;
  industry: string;
  website: string;
  location: {
    city?: string;
    state?: string;
    country?: string;
  };
  socialProfiles: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
  };
  score: number;                     // 0-100 quality score
  sources: string[];                 // Data sources
  enrichmentLevel: 'raw' | 'enriched' | 'complete';
  confidence: number;                // 0-1 confidence score
  verified: boolean;
  lastUpdated: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}
```

## Web UI Guide

The SpectralScraper web interface (http://localhost:3000) features a modern tabbed interface:

### Tabs

#### 1. **Basic** Tab
Configure the core scraping parameters:
- **Lead Count Target**: Maximum number of leads to scrape (1-10,000)
- **Search Queries**: One per line (e.g., "tech startup CEO")
- **Domains**: One per line (e.g., "github.com", "techcrunch.com")

#### 2. **Filters** Tab
Professional filtering options grouped by category:

**📍 Location**
- Free-form text input for locations
- Examples: "New York", "California", "London", "Tokyo"

**🏢 Industry** (Checkboxes)
- Technology
- Finance
- Healthcare
- Retail
- Manufacturing
- SaaS

**💼 Job Title** (Checkboxes)
- CEO
- Founder
- CTO
- VP
- Director
- Manager

**📈 Seniority Level** (Radio buttons)
- Entry
- Mid
- Senior
- Executive

**🏭 Company Size** (Radio buttons)
- Startup (1-50 employees)
- Small (51-250 employees)
- Medium (251-1,000 employees)
- Enterprise (1,000+ employees)

#### 3. **Advanced** Tab
Fine-tune advanced parameters:
- **Verification Level**: lenient, moderate, strict
- **Employee Count Range**: min-max filters
- **Annual Revenue Range**: min-max in millions USD
- **Preview Filters**: Click to see building query summary

### Filter Presets

Quick-start with predefined filter combinations:

1. **Tech CEOs** - CEO/Founder/CTO in Technology/Software/SaaS
2. **VC-Ready Startups** - Startup-sized tech companies
3. **Enterprise Leaders** - VP/Director/Manager in enterprise companies
4. **Sales Development** - SDR/AE/BDR/Sales Manager professionals
5. **Finance Executives** - CFO/Finance Director in Finance/Banking/Insurance

Click any preset button to auto-populate filters.

### Job Management
- **Real-time Progress**: See leads scraped in real-time
- **Status Indicators**: Running, Completed, Failed
- **CSV Download**: Export leads directly from completed jobs
- **Job Filtering**: View All, Running, or Completed jobs
- **Statistics**: Total jobs, completion rate, average leads per job

## API Endpoints

### Filter Management

#### Get Filter Presets
```bash
GET /api/filters/presets
```
Response:
```json
{
  "presets": ["tech_ceos", "venture_capital_ready", ...],
  "details": {
    "tech_ceos": {
      "industry": ["Technology", "Software", "SaaS"],
      "jobTitle": ["CEO", "Founder", "CTO"],
      "seniority": "executive"
    }
  }
}
```

#### Get Specific Preset
```bash
GET /api/filters/presets/:name
```

#### Build Queries from Filters
```bash
POST /api/filters/queries
Content-Type: application/json

{
  "location": ["New York"],
  "industry": ["Technology"],
  "jobTitle": ["CEO"],
  "seniority": "executive",
  "companySize": "startup"
}
```

Response includes built queries for Hunter.io, Clearbit, Apollo.io, Google, and LinkedIn.

#### Validate Filters
```bash
POST /api/filters/validate
Content-Type: application/json

{
  "employeeCount": {"min": 100, "max": "1000"},
  "revenue": {"min": 10, "max": 500}
}
```

### Job Management

#### Start Scraping Job with Filters
```bash
POST /api/jobs/start
Content-Type: application/json

{
  "leadCount": 500,
  "queries": ["tech startup CEO", "CTO"],
  "domains": ["github.com", "techcrunch.com"],
  "filters": {
    "location": ["San Francisco", "New York"],
    "industry": ["Technology"],
    "jobTitle": ["CEO", "CTO"],
    "seniority": "executive",
    "companySize": "startup",
    "employeeCount": {"min": 10, "max": 200},
    "verification": "moderate"
  }
}
```

#### Get All Jobs
```bash
GET /api/jobs
```

#### Get Job Status
```bash
GET /api/jobs/:id
```

#### Download CSV
```bash
GET /api/jobs/:id/download
```

#### Get Statistics
```bash
GET /api/stats
```
Response:
```json
{
  "totalJobs": 42,
  "completedJobs": 38,
  "runningJobs": 2,
  "totalLeadsScraped": 15420,
  "averageLeadsPerJob": 405.8
}
```

### Data Sources

#### Check Data Source Status
```bash
GET /api/sources/status
```

#### Set API Credential
```bash
POST /api/sources/:name/credential
Content-Type: application/json

{
  "apiKey": "your-api-key-here"
}
```

## Usage Examples

### Example 1: Tech CEO Hunting
Find all CEOs in Series A tech startups in San Francisco:

```javascript
fetch('/api/jobs/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leadCount: 200,
    queries: ['Series A founder', 'startup CEO'],
    domains: ['github.com', 'crunchbase.com', 'linkedin.com'],
    filters: {
      location: ['San Francisco', 'Bay Area'],
      industry: ['Technology'],
      jobTitle: ['CEO', 'Founder'],
      seniority: 'executive',
      companySize: 'startup',
      employeeCount: { min: 5, max: 100 },
      revenue: { min: 0, max: 50 }
    }
  })
})
.then(r => r.json())
.then(job => console.log('Job started:', job.id));
```

### Example 2: Enterprise Sales Leads
Find sales development representatives (SDRs) in enterprise software companies:

```javascript
fetch('/api/jobs/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leadCount: 500,
    queries: ['enterprise SaaS SDR', 'account executive'],
    domains: ['crunchbase.com', 'owler.com', 'linkedin.com'],
    filters: {
      industry: ['SaaS', 'Software'],
      jobTitle: ['SDR', 'AE', 'Sales Manager', 'BDR'],
      seniority: 'mid',
      companySize: 'enterprise',
      employeeCount: { min: 500, max: 50000 },
      revenue: { min: 100, max: 10000 },
      verification: 'strict'
    }
  })
})
.then(r => r.json())
.then(job => {
  // Poll for completion and download CSV
  setTimeout(() => {
    window.location.href = `/api/jobs/${job.id}/download`;
  }, 60000);
});
```

### Example 3: Using Filter Presets
Apply a preset and customize:

```javascript
// Get tech CEO preset
fetch('/api/filters/presets/tech_ceos')
  .then(r => r.json())
  .then(preset => {
    // Add location filter and start job
    fetch('/api/jobs/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadCount: 300,
        queries: ['startup founder'],
        domains: ['github.com', 'techcrunch.com'],
        filters: {
          ...preset,
          location: ['New York', 'Los Angeles']
        }
      })
    });
  });
```

## Configuration

### Environment Variables
```bash
# Hunter.io API Key
HUNTER_API_KEY=your-key-here

# Clearbit API Key
CLEARBIT_API_KEY=your-key-here

# Apollo.io API Key
APOLLO_API_KEY=your-key-here

# Server Port (default: 3000)
PORT=3000
```

### Filter Best Practices

1. **Be Specific**: Combine multiple filters (location + industry + title) for best results
2. **Use Presets**: Start with presets and customize for your use case
3. **Verification Levels**:
   - `lenient`: Faster, more leads, potentially lower quality
   - `moderate`: Balanced approach (recommended)
   - `strict`: Slower, fewer leads, high confidence
4. **Company Size**: More specific than employee count, but employee count is more precise for ranges
5. **Location**: Multi-city targeting (e.g., "San Francisco", "Los Angeles", "Seattle")

## Performance Notes

- **Scraping Speed**: Limited by respectful rate limiting (800ms+ delays per request)
- **Lead Quality**: Confidence scores (0-1) indicate data reliability
- **Deduplication**: Automatic email and phone number deduplication
- **CSV Export**: Streaming output for memory efficiency on large datasets

## Data Quality Metrics

Each lead includes:
- **Confidence Score** (0-100): Overall data reliability
- **Verification Status**: Whether email/phone have been verified
- **Sources**: Which data sources contributed to this lead
- **Enrichment Level**: raw, enriched, or complete

## Troubleshooting

### No Results Found
1. Check filter combinations aren't too restrictive
2. Verify API credentials are configured for data sources
3. Use "Preview Filters" to see generated queries
4. Try broader filters first, then refine

### Low Confidence Scores
1. Set verification level to "strict"
2. Choose fewer data sources for higher quality
3. Cross-reference with secondary sources

### Rate Limiting
- Respectful delays (800ms+) are built in
- Distribute large jobs over time
- Monitor API rate limits for external sources

## Support

For issues or feature requests, check the GitHub repository or review the application logs:

```bash
RUST_LOG=info npm run web:dev
```

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Built with**: TypeScript, Express.js, React, Node.js
