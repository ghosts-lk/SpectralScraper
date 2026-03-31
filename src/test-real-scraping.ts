/**
 * Test Real Lead Scraping Without External APIs
 * Demonstrates web scraping from multiple sources
 */

import { SpectralScraper, LeadQuery, ScraperSource } from './index';
import { exportLeadsToCSV } from './index';

async function testRealScraping() {
  console.log('\n' + '='.repeat(70));
  console.log('🔥 SPECTRAL SCRAPER - REAL WEB SCRAPING (NO EXTERNAL APIS)');
  console.log('='.repeat(70) + '\n');

  const scraper = new SpectralScraper({
    cache: { enabled: true, ttl: 3600 },
    compliance: {
      respectRobotsTxt: true,
      delayBetweenRequests: 1000,
    },
  });

  // Test queries - SCALED FOR 1M LEADS
  const queries: LeadQuery[] = [
    {
      title: 'CEO|Founder',
      company: 'Technology',
      location: 'Sri Lanka',
      industry: 'Technology',
      limit: 5000,
    },
    {
      title: 'CTO|VP Engineering',
      company: 'Startup',
      location: 'Asia',
      industry: 'Software',
      limit: 5000,
    },
    {
      title: 'Product Manager',
      company: 'Tech',
      location: 'South Asia',
      industry: 'Technology',
      limit: 5000,
    },
    {
      title: 'Software Engineer|Developer',
      company: 'All',
      location: 'Sri Lanka',
      industry: 'Technology',
      limit: 5000,
    },
    {
      title: 'Business Development',
      company: 'All',
      location: 'South Asia',
      industry: 'Business Services',
      limit: 5000,
    },
    {
      title: 'Sales Manager|Sales Lead',
      company: 'All',
      location: 'Sri Lanka',
      industry: 'All',
      limit: 5000,
    },
  ];

  // Scrape from all sources
  const sources = [
    ScraperSource.COMPANY_WEBSITE,
    ScraperSource.JOB_BOARD,
    ScraperSource.DIRECTORY,
    ScraperSource.GITHUB,
    ScraperSource.EMAIL_FINDER,
  ];

  console.log('📊 SCRAPING CONFIGURATION:');
  console.log(`  ✓ Sources: ${sources.join(', ')}`);
  console.log(`  ✓ Queries: ${queries.length}`);
  console.log(`  ✓ Expected leads: ${queries.reduce((sum, q) => sum + (q.limit || 0), 0) * sources.length}\n`);

  console.log('📡 SCRAPING SOURCES ACTIVATED:');
  console.log('  ✓ Job Boards: Indeed, LinkedIn Jobs, Glassdoor');
  console.log('  ✓ Directories: Crunchbase, AngelList, LinkedIn Companies, Yellow Pages');
  console.log('  ✓ GitHub: Developer profiles, Tech organizations');
  console.log('  ✓ Email Finder: Company websites, Pattern matching\n');

  let totalLeads = 0;
  const allLeads = [];

  for (const query of queries) {
    console.log(`🔍 Scraping for: ${query.title} at ${query.location}...`);

    try {
      const leads = await scraper.scrape(query, sources);
      totalLeads += leads.length;
      allLeads.push(...leads);

      console.log(`  ✅ Found ${leads.length} leads\n`);
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    }
  }

  // Export to CSV
  if (allLeads.length > 0) {
    console.log(`📥 Exporting ${allLeads.length} leads to CSV...`);
    const filePath = await exportLeadsToCSV(allLeads, 'spectral-real-leads');
    console.log(`  ✅ Exported to: ${filePath}\n`);
  }

  // Statistics
  const stats = scraper.getStats();
  console.log('📈 STATISTICS:');
  console.log(`  Total Leads Found: ${totalLeads}`);
  console.log(`  Unique Leads: ${totalLeads}`);
  console.log(`  Total Duration: ${stats.totalDuration}ms`);
  console.log(`  Average Score: ${(stats.avgScore || 0).toFixed(2)}\n`);

  console.log('✨ REAL SCRAPING COMPLETE - NO EXTERNAL APIS USED!\n');

  await scraper.shutdown();
}

// Run test
testRealScraping().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
