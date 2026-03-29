# 🌍 SpectralScraper - Web UI Guide

## 🚀 Quick Start

The SpectralScraper now includes a beautiful, full-featured web interface for managing lead generation campaigns.

### Start the Web Server

```bash
# Development mode (with hot reload)
npm run web:dev

# Production mode (pre-built)
npm run build
npm run web:start
```

The UI will be available at: **http://localhost:3000**

---

## 🎨 Features

### 1. **Start New Scrape**
- Configure target lead count (100 to 1,000,000)
- Add custom search queries
- Specify domains to scrape
- One-click scraping start

### 2. **Real-Time Statistics**
- Total jobs count
- Completed scraping jobs
- Total leads scraped across all jobs
- Average leads per job

### 3. **Job Management**
- View all scraping jobs in real-time
- Filter by status (All, Running, Completed)
- Progress bar for each job
- Job ID reference
- Duration tracking

### 4. **Results Download**
- Download CSV files with completed leads
- Auto-generated filenames with timestamps
- CSV includes all lead data:
  - Names, emails, phone numbers
  - Job titles and companies
  - Social profiles (LinkedIn, Twitter, GitHub)
  - Verification status and confidence scores
  - Data sources and enrichment level

### 5. **Auto-Refresh**
- Statistics update every 3 seconds
- Job status updates automatically
- No manual refresh needed

---

## 📊 Example Workflows

### Scrape Tech Startup CEOs

1. **Lead Count**: 10,000
2. **Search Queries**:
   ```
   tech startup CEO
   founder software company
   venture capital investor
   ```
3. **Domains**:
   ```
   crunchbase.com
   techcrunch.com
   github.com
   ```
4. Click **"Start Scraping"**
5. Monitor progress in real-time
6. Download CSV when complete

### LinkedIn Enrichment

1. **Lead Count**: 5,000
2. **Search Queries**:
   ```
   business development linkedin
   product manager tech
   sales manager SaaS
   ```
3. **Domains**:
   ```
   linkedin.com
   producthunt.com
   ```

---

## 📁 CSV Export Format

Each exported CSV includes:

| Column | Description |
|--------|-------------|
| ID | Unique lead identifier |
| Name | Full name |
| Email | Email address |
| Phone | Phone number (if found) |
| Title | Job title |
| Company | Company name |
| Industry | Industry sector |
| Website | Company website |
| City | City location |
| Country | Country |
| LinkedIn | LinkedIn profile URL |
| Twitter | Twitter handle |
| Verified | Verification status |
| Score | Lead quality score (0-100) |
| Confidence | Data confidence percentage |
| Sources | Data source attribution |

---

## 🔧 API Endpoints

### Get All Jobs
```
GET /api/jobs
```
Returns: Array of all scraping jobs

### Get Specific Job
```
GET /api/jobs/{jobId}
```
Returns: Job details and progress

### Start New Scrape
```
POST /api/jobs/start
Body: {
  leadCount: number,
  queries: string[],
  domains: string[]
}
```
Returns: Created job object

### Download CSV
```
GET /api/jobs/{jobId}/download
```
Downloads: CSV file with lead data

### Get Statistics
```
GET /api/stats
```
Returns: Global statistics

---

## 🎯 Best Practices

### Search Queries
- Use specific job titles or roles
- Include industry keywords
- Geographic identifiers are helpful
- Keep queries under 50 words each

### Domains
- Start with well-known platforms (GitHub, TechCrunch, etc.)
- Add industry-specific directories
- Include company websites if targeting specific companies
- LinkedIn for enrichment (requires export)

### Lead Count
- Start with 1,000-5,000 for testing
- 10,000-50,000 for comprehensive campaigns
- 100,000+ for enterprise-scale operations
- Consider rate limiting (1-2 seconds between requests)

### Rate Limiting
- Default: 800ms between requests
- Respectful to target websites
- Avoids IP blocking
- Can be adjusted in configuration

---

## 📈 Monitoring

### Check Real-Time Progress
1. Open UI in browser
2. Watch the progress bars
3. Statistics update automatically
4. Job status changes reflected instantly

### Estimated Completion Times
- 1,000 leads: 10-15 minutes
- 5,000 leads: 1-2 hours
- 10,000 leads: 2-4 hours
- 100,000 leads: 1-2 days (depending on sources)

---

## 🔐 Data Security

- All data processed locally
- No external storage by default
- CSV files saved to local disk
- Compliance with GDPR/CCPA (when configured)
- Rate limiting prevents detection
- User-Agent spoofing for legitimacy

---

## 🐛 Troubleshooting

### No Results Found
- ✓ Check query spelling
- ✓ Ensure domains are accessible
- ✓ Try more generic queries
- ✓ Check website availability

### Slow Performance
- ✓ Reduce target lead count
- ✓ Use fewer domains
- ✓ Increase rate limiting delay
- ✓ Run during off-peak hours

### Connection Errors
- ✓ Check internet connection
- ✓ Verify domains are accessible
- ✓ Try with alternate domains
- ✓ Check web server is running

---

## 🚢 Deployment

### Production Deployment

```bash
# Build for production
npm run build

# Start in production
npm run web:start

# Or use PM2 for process management
pm2 start dist/web-server.js --name "spectral-scraper"
```

### Environment Variables

```bash
PORT=3000          # Web server port
RATE_LIMIT=800     # Delay between requests (ms)
MAX_LEADS=100000   # Maximum leads per job
```

---

## 📞 Support

**Issues or Questions?**
- Check the GitHub repository
- Review logs in console
- Verify configuration settings
- Test with smaller lead counts first

---

Built with ❤️ by **Ghost Protocol**  
v1.0.0 | 2026
