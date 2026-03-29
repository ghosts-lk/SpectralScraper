# 🌍 SpectralScraper

<div align="center">

```
███████╗██████╗ ███████╗ ██████╗████████╗██████╗  █████╗ ██╗
██╔════╝██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██║
███████╗██████╔╝█████╗  ██║        ██║   ██████╔╝███████║██║
╚════██║██╔═══╝ ██╔══╝  ██║        ██║   ██╔══██╗██╔══██║██║
███████║██║     ███████╗╚██████╗   ██║   ██║  ██║██║  ██║███████╗
╚══════╝╚═╝     ╚══════╝ ╚═════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

Professional Web Scraping & Lead Generation Tool v1.0.0
Internal Tool for Ghost Protocol
```

> *"See beyond the surface. Extract intelligence from the web."*

**High-Performance Web Scraping & Lead Generation System**

[![Version](https://img.shields.io/badge/Version-1.0.0-607D8B?style=for-the-badge)]()
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)]()
[![License](https://img.shields.io/badge/License-Proprietary-ff4444?style=for-the-badge)]()

By [Ghost Protocol](https://ghosts.lk) — *Private Internal Tool*

</div>

---

## Overview

**SpectralScraper** is a professional-grade web scraping and lead generation tool built for Ghost Protocol's internal use. It combines multiple data sources (HTML parsing, browser automation, API enrichment) to discover, validate, and enrich contact data at scale.

### Key Capabilities

- 🌐 **Multi-Source Scraping** - Company websites, directories, search results, social profiles
- 🤖 **Dual-Mode Extraction** - Static HTML parsing (Cheerio) + Dynamic JavaScript rendering (Puppeteer)
- 💾 **Data Enrichment** - Integration with Clearbit, Hunter.io, LinkedIn, GitHub APIs
- 🎯 **Lead Scoring** - Intelligent 0-100 scoring system based on data completeness and quality
- 🚀 **Batch Operations** - Process thousands of leads in parallel with queue management
- 🔐 **Compliance Built-In** - GDPR, CCPA, robots.txt, rate limiting, consent management
- ⚡ **Smart Caching** - In-memory + Redis caching to minimize redundant requests
- 📊 **Full Analytics** - Detailed statistics on scraping performance and lead quality
- 🔗 **Wyrm Integration** - Auto-sync results to Wyrm memory system for context preservation
- 📤 **Multi-Format Export** - JSON, CSV, Excel, SQL database import

---

## Installation

### Quick Start

```bash
# Clone repository
git clone https://github.com/ghosts-lk/SpectralScraper.git
cd SpectralScraper

# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

### Docker

```bash
# Build image
docker build -t spectral-scraper:latest .

# Run container
docker run -p 3000:3000 -v scraper-data:/app/data spectral-scraper:latest
```

---

## Usage

### Basic Scraping

```typescript
import { SpectralScraper, ScraperSource, type LeadQuery } from '@ghost-protocol/spectral-scraper';

const scraper = new SpectralScraper();

const query: LeadQuery = {
  company: 'TechCorp',
  location: 'San Francisco',
  title: 'Engineer',
  limit: 50,
};

const leads = await scraper.scrape(query, [
  ScraperSource.COMPANY_WEBSITE,
  ScraperSource.LINKEDIN,
]);

console.log(`Found ${leads.length} leads`);
```

### Data Enrichment

```typescript
// Enrich individual lead
const enriched = await scraper.enrichLead({
  name: 'John Doe',
  email: 'john@example.com',
  company: 'DocuSign',
});

console.log(`Lead score: ${enriched.enriched.score}/100`);
```

### Batch Operations

```typescript
// Process multiple queries
const jobs = await Promise.all([
  scraper.scrape({ company: 'Apple', limit: 100 }),
  scraper.scrape({ company: 'Google', limit: 100 }),
  scraper.scrape({ company: 'Microsoft', limit: 100 }),
]);

const stats = scraper.getStats();
console.log(`Total: ${stats.totalLeads}, Score avg: ${stats.avgScore}`);
```

### Advanced Professional Filtering (NEW! 🎯)

Target specific professional profiles with sophisticated filtering:

```typescript
import { ProfessionalLeadScraper, type LeadFilters } from '@ghost-protocol/spectral-scraper';

const scraper = new ProfessionalLeadScraper({
  location: ['San Francisco', 'New York'],  
  industry: ['Technology', 'SaaS'],
  jobTitle: ['CEO', 'CTO', 'Founder'],
  seniority: 'executive',
  companySize: 'startup',
  employeeCount: { min: 10, max: 100 },
  revenue: { min: 0, max: 50 },  // in millions
  verification: 'strict',
});

// Execute search with filters applied
const techCEOs = await scraper.scrape(
  domains,    // Hunter.io domains
  companies,  // Clearbit companies
  queries     // Apollo.io queries
);

// Export results
const csvPath = await scraper.exportCSV(techCEOs, 'tech_ceos');
```

**Filter Categories:**
- 📍 **Location**: Country, state, city targeting
- 🏢 **Industry**: Technology, Finance, Healthcare, Retail, Manufacturing, SaaS
- 💼 **Job Title**: CEO, Founder, CTO, VP, Director, Manager, SDR, and more
- 📈 **Seniority**: Entry, Mid, Senior, Executive levels
- 🏭 **Company Size**: Startup (1-50), Small (51-250), Medium (251-1000), Enterprise (1000+)
- 👥 **Employee Count**: Custom min-max ranges
- 💰 **Revenue**: Annual revenue in millions
- ✅ **Verification Level**: Lenient, Moderate, or Strict

**Pre-Built Filter Presets:**
- Tech CEOs - Executive technology professionals
- VC-Ready Startups - Early-stage funded companies
- Enterprise Leaders - Senior decision makers
- Sales Development - SDRs, AEs, and sales managers  
- Finance Executives - CFOs and financial leaders

---

## Web UI Interface

Launch the professional web interface at `http://localhost:3000`:

```bash
npm run web:dev   # Development mode with hot reload
npm run web:start # Production deployment
```

**Features:**
- 📑 Tabbed configuration (Basic, Filters, Advanced)
- 🎯 One-click filter presets
- 📊 Real-time job status and progress
- 📥 CSV export with full professional data
- 📈 Live statistics dashboard
- 🔄 Auto-refresh every 3 seconds

---

## API Endpoints

### Filter Management
- `GET /api/filters/presets` - List all presets
- `GET /api/filters/presets/:name` - Get specific preset
- `POST /api/filters/queries` - Build optimized queries
- `POST /api/filters/validate` - Validate filter combinations

### Job Management  
- `POST /api/jobs/start` - Start new scraping job with filters
- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:id/download` - Download CSV results
- `GET /api/stats` - Global statistics

### Data Sources
- `GET /api/sources/status` - Check available sources
- `POST /api/sources/:name/credential` - Configure API keys

See [PROFESSIONAL_FILTERING_GUIDE.md](./PROFESSIONAL_FILTERING_GUIDE.md) for complete API documentation.

---

## Scrapers & Sources

| Source | Method | Speed | Details |
|--------|--------|-------|---------|
| **Company Website** | Cheerio HTML parsing | Fast (< 1s/page) | Extract contact pages, team directories |
| **LinkedIn** | Browser automation + API | Medium (2-5s) | With LinkedIn auth; requires credentials |
| **Hunter.io** | API | Very fast (< 100ms) | Email discovery & verification; API key required |
| **Clearbit** | API | Very fast (< 100ms) | Company enrichment; API key required |
| **GitHub** | API | Very fast (< 100ms) | Developer profiles & public data |
| **Twitter** | API | Very fast (< 100ms) | Social verification; API key required |
| **Google Search** | Browser automation | Slow (5-10s) | Search results parsing; rate limiting strict |
| **Custom Directory** | Cheerio or Browser | Varies | JumpList, ZoomInfo, Apollo.io, etc. |

---

## Lead Scoring

Leads are scored 0-100 based on:

| Criterion | Points | Details |
|-----------|--------|---------|
| Email Validity | 20 | Valid format + not disposable |
| Company Data | 15 | Company name, industry info |
| Job Title | 10 | Valid role/position |
| Phone | 8 | Valid international format |
| Location | 10 | Country/city information |
| Social Profiles | 12 | LinkedIn, Twitter, GitHub links |
| Completeness | 20 | % of fields populated |
| Recency | 5 | Data < 7 days old |

**Quality Tiers:**
- **90-100:** Enterprise-ready (use immediately)
- **75-89:** Good quality (light enrichment recommended)
- **50-74:** Moderate quality (needs enrichment)
- **< 50:** Poor quality (skip or defer)

---

## Configuration

### .env

```env
# API Keys
CLEARBIT_API_KEY=your_key
HUNTER_IO_API_KEY=your_key
LINKEDIN_API_KEY=your_key
GITHUB_API_KEY=your_key

# Caching
CACHE_BACKEND=memory  # or 'redis'
CACHE_TTL=3600
REDIS_URL=redis://localhost:6379

# Compliance
GDPR_ENABLED=true
CCPA_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MIN=30

# Logging
LOG_LEVEL=info
```

###Config File

```typescript
const scraper = new SpectralScraper({
  cache: {
    enabled: true,
    ttl: 3600,
    backend: 'memory',
  },
  compliance: {
    respectRobotsTxt: true,
    delayBetweenRequests: 1000,
    gdprEnabled: true,
  },
  enrichment: {
    validateEmails: true,
    enrichWithSocial: true,
    enrichWithCompanyData: true,
    scoreThreshold: 50,
  },
});
```

---

## Compliance & Safety

### Built-In Protections

☑️ **robots.txt Respecting** - Checks robots.txt before scraping domains
☑️ **Rate Limiting** - Configurable delay between requests (default 1s)
☑️ **GDPR Compliance** - Consent needed for EU user data
☑️ **CCPA Compliance** - Opt-out support, data access/deletion endpoints
☑️ **No Cookie Abuse** - Rejects sites with conflicting policies
☑️ **Ethical User-Agent** - Identifies scraper, not disguised as browser
☑️ **Throttling** - Back-off on 429 responses
☑️ **Full Logging** - Complete audit trail of all requests

### Best Practices

1. **Always get permission** from website owners before scraping
2. **Minimize requests** - cache results, batch operations
3. **Respect rate limits** - increase delays if you get 429 responses
4. **Use legitimate data** - don't scrape for fraud, discrimination, or harassment
5. **Follow TOS** - each site has different rules; read them
6. **Clean up** - remove personal data if requested (GDPR right to be forgotten)

---

## Wyrm Integration

Automatically sync results to [Wyrm](https://github.com/ghosts-lk/Wyrm) for persistent memory:

```typescript
const scraper = new SpectralScraper({
  wyrm: {
    enabled: true,
    projectPath: '/path/to/project',
    syncToDataLake: true,
    category: 'leads',
    tags: ['prospect', 'outbound'],
  },
});

// Results auto-sync to Wyrm data lake
const leads = await scraper.scrape(query);
// → Stored in Wyrm for future context retrieval
```

---

## API Reference

### SpectralScraper

#### `constructor(config?)`
Initialize the scraper with optional configuration.

#### `scrape(query, sources) → Promise<Lead[]>`
Scrape leads based on query and sources.

#### `enrichLead(lead) → Promise<EnrichmentResult>`
Enrich a single lead with additional data.

#### `enrichLeads(leads) → Promise<EnrichmentResult[]>`
Batch enrich multiple leads.

#### `getStats() → ScrapingStats`
Get current scraping statistics.

#### `getJobStatus(jobId) → ScrapingJob | undefined`
Check status of a specific job.

#### `shutdown() → Promise<void>`
Gracefully shutdown all scrapers and connections.

---

## Development

### Scripts

```bash
npm run build         # Compile TypeScript
npm run dev           # Run in dev mode
npm run test          # Run tests
npm run test:watch    # Watch mode
npm lint              # ESLint check
npm lint:fix          # Auto-fix linting issues
npm run type-check    # TypeScript validation
```

### Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/core/engine.test.ts

# Coverage
npm test -- --coverage
```

---

## Architecture

```
SpectralScraper/
├── src/
│   ├── core/           # Core engine & orchestration
│   ├── scrapers/       # Multi-source scrapers
│   ├── enrichment/     # Data enrichment service
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Logging, helpers
│   └── index.ts        # Main entry point
├── tests/              # Jest test suite
├── config/             # Configuration templates
├── docs/               # Documentation
├── docker/             # Docker configuration
└── package.json
```

---

## Performance

### Benchmarks

| Operation | Time | Notes |
|-----------|------|-------|
| Single URL (HTML) | 500-2000ms | Cheerio parsing |
| Single URL (Browser) | 2-5s | Puppeteer + JS rendering |
| Email Validation | 50-200ms | Hunter.io API |
| Company Enrichment | 100-300ms | Clearbit API |
| Lead Deduplication (1000) | 200-500ms | Fuzzy matching |
| Lead Scoring (1000) | 50-100ms | Local calculation |

### Memory Usage

- Idle: ~50MB
- Scraping 100 leads: ~150MB
- Scraping 1000 leads: ~300MB
- Browser pool (5 instances): ~300MB each

---

## Troubleshooting

### Common Issues

**Issue:** Browser timeout
```
Solution: Increase timeout in config, check network conditions
```

**Issue:** Rate-limited (429 responses)
```
Solution: Increase delayBetweenRequests, implement exponential backoff
```

**Issue:** Gmail/corporate email blocked
```
Solution: Some providers block automated access; use Hunter.io API instead
```

**Issue:** Low lead scores
```
Solution: Enable enrichment, add more sources, adjust scoring weights
```

---

## Roadmap

### v1.1 (Next)
- [ ] Redis caching backend
- [ ] Job queue with Bull/BullMQ
- [ ] GraphQL API
- [ ] Web dashboard

### v2.0 (Future)
- [ ] Machine learning for quality prediction
- [ ] Data marketplace integration
- [ ] Real-time lead stream API
- [ ] Custom scraper templates

---

## License

**Proprietary** — Copyright © 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.

For licensing inquiries: legal@ghosts.lk

---

## Support

- 📧 Email: support@ghosts.lk
- 🐛 Issues: GitHub Issues (private repo)
- 📚 Documentation: `/docs` folder
- 💬 Slack: #spectral-scraper (Ghost Protocol workspace)

---

<div align="center">

*Powered by Ghost Protocol | Built with TypeScript | Driven by Data*

</div>
