# SpectralScraper

Professional web scraping & B2B lead generation platform.  
**Stack:** TypeScript 5.3, Puppeteer, Cheerio, Express, SQLite, BullMQ, Redis

## Wyrm Context

Check `.wyrm/hoard.md`, `.wyrm/quests.md`, `.wyrm/chronicles.md` before major changes.

## Commands

```bash
npm run build          # tsc → dist/
npm run dev            # ts-node src/index.ts
npm test               # Jest
npm run type-check     # tsc --noEmit
npm run lint           # ESLint
npm run web:dev        # Express dev server
```

## Architecture

```
LeadQuery → Engine → Scrapers (parallel via Promise.allSettled)
         → Deduplicate → Enrich → Score → Cache → Return Lead[]
```

**Scraper dispatch**: `Promise.allSettled()` — partial failures are tolerated, never thrown.  
**Events**: `EventEmitter` for `job:started`, `job:completed`, `job:failed`.  
**Caching**: `generateCacheKey()` = base64(query+sources), 1hr TTL.

### Source Layout

| Directory | Purpose |
|-----------|---------|
| `src/scrapers/` | 6 scraper implementations (directory, browser, html, github, email-finder, job-board) |
| `src/core/` | Engine, orchestrator, database, lead scorer, bulk ops |
| `src/enrichment/` | Email validation, social lookup, company data enrichment |
| `src/types/` | All interfaces (`Lead`, `LeadQuery`, `ScraperSource`, `ExportConfig`) |
| `src/utils/` | Compliance (robots.txt, GDPR/CCPA), logging (Winston), caching |

## Scraping Conventions

- **Dual-mode extraction**: Static pages → Cheerio + axios. JS-rendered → Puppeteer.
- **Rate limiting**: Per-scraper instance, `delayBetweenRequests: 1000ms` default. Always call `rateLimitWait()` before requests.
- **Compliance first**: Check `robots.txt` (24hr cache), respect block list (facebook, instagram, tiktok, snapchat, pinterest). GDPR/CCPA flags enabled by default.
- **User-Agent rotation**: 5+ rotating UAs, referers, Accept-Language headers for anti-bot evasion.
- **Error handling**: Return empty array on scraper failure, never throw. Log via Winston `getLogger(component)`.

## Lead Scoring

Weights (sum to 100): email (20), title (20), phone (15), company (15), linkedin (15), github (10), freshness (5).  
Formula: `score = sum(weights) × (confidence/100)`. Confidence base 50, +30 verified, +15 multi-source, +10 high-score.

## Key Patterns

- Register new scrapers via `registerScraper(source, instance)` factory pattern
- Every `Lead` tracks `sources: string[]` for dedup and confidence
- `enrichmentLevel`: `'basic'` → `'enriched'` → `'complete'` lifecycle
- Export formats: JSON, CSV, XLSX, SQL
- Database: SQLite (`spectral.db`), unique index on email
- `strict: false` in tsconfig — relaxed null checks

## Docs

See `ANTIBOT_BYPASS_STRATEGY.md` for tier-based evasion patterns, `TESTING_GUIDE.md` for test conventions, `ENTERPRISE_API.md` for API reference.
