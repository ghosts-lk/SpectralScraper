/**
 * SpectralScraper - Professional Web Scraping & Lead Generation Tool
 * Main Entry Point
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

export * from './types/index';
export * from './core/engine';
export * from './core/lead-scorer';
export * from './enrichment/enrichment-service';
export * from './scrapers/html-scraper';
export * from './scrapers/browser-scraper';
export * from './utils/logger';
export * from './utils/compliance';

import { SpectralEngine } from './core/engine';
import { EnrichmentService } from './enrichment/enrichment-service';
import { HtmlScraper } from './scrapers/html-scraper';
import { BrowserScraper as _BrowserScraper } from './scrapers/browser-scraper';
import { getLogger } from './utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import { RealDataBatchScraper, scrapeMassLeads } from './scraper-batch';
import {
  CacheConfig,
  ComplianceConfig,
  EnrichmentConfig,
  LeadQuery,
  ScraperSource,
  Lead,
} from './types/index.js';

export class SpectralScraper {
  private engine: SpectralEngine;
  private enrichmentService: EnrichmentService;
  private logger = getLogger('SpectralScraper');

  constructor(config?: {
    cache?: Partial<CacheConfig>;
    compliance?: Partial<ComplianceConfig>;
    enrichment?: Partial<EnrichmentConfig>;
  }) {
    const defaultCache: CacheConfig = { enabled: true, ttl: 3600, backend: 'memory', ...config?.cache };
    const defaultCompliance: ComplianceConfig = {
      respectRobotsTxt: true,
      userAgent: 'SpectralScraper/1.0 (Ghost Protocol)',
      delayBetweenRequests: 1000,
      rejectOnCookiePolicy: false,
      gdprEnabled: true,
      ccpaEnabled: true,
      logAllActivity: true,
      ...config?.compliance,
    };
    const defaultEnrichment: EnrichmentConfig = {
      deduplicate: true,
      validateEmails: true,
      enrichWithSocial: true,
      enrichWithCompanyData: true,
      enrichWithPhoneData: true,
      maxParallelRequests: 5,
      scoreThreshold: 30,
      ...config?.enrichment,
    };

    this.engine = new SpectralEngine(
      {
        cache: defaultCache,
        compliance: defaultCompliance,
        enrichment: defaultEnrichment,
      },
      this.logger
    );

    this.enrichmentService = new EnrichmentService(defaultEnrichment, this.logger);
    this.registerDefaultScrapers();
  }

  /**
   * Register default scrapers
   */
  private registerDefaultScrapers(): void {
    const htmlScraper = new HtmlScraper(ScraperSource.COMPANY_WEBSITE, this.logger);
    this.engine.registerScraper(ScraperSource.COMPANY_WEBSITE, htmlScraper);

    this.logger.info('Registered default scrapers');
  }

  /**
   * Scrape leads
   */
  async scrape(query: LeadQuery, sources: ScraperSource[] = [ScraperSource.COMPANY_WEBSITE]): Promise<Lead[]> {
    this.logger.info(`Starting scrape job for:`, { query, sources });
    return await this.engine.scrape(query, sources);
  }

  /**
   * Enrich a lead
   */
  async enrichLead(lead: Partial<Lead>) {
    return await this.enrichmentService.enrichLead(lead);
  }

  /**
   * Batch enrich leads
   */
  async enrichLeads(leads: Partial<Lead>[]) {
    return await this.enrichmentService.enrichBatch(leads);
  }

  /**
   * Get statistics
   */
  getStats() {
    return this.engine.getStats();
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string) {
    return this.engine.getJobStatus(jobId);
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    await this.engine.shutdown();
    this.logger.info('SpectralScraper shut down');
  }
}

/**
 * Export leads to CSV format
 */
export async function exportLeadsToCSV(leads: Lead[], filename: string = 'leads.csv'): Promise<string> {
  const timestamp = new Date().toISOString().split('T')[0];
  const filepath = path.join(process.cwd(), `${filename.replace('.csv', '')}_${timestamp}.csv`);
  
  // CSV header
  const headers = [
    'ID',
    'Name',
    'Email',
    'Phone',
    'Title',
    'Company',
    'Industry',
    'Website',
    'City',
    'State',
    'Country', 
    'LinkedIn',
    'Twitter',
    'GitHub',
    'Facebook',
    'Verified',
    'Score',
    'Confidence',
    'Enrichment Level',
    'Sources',
    'Last Updated',
    'Tags'
  ];

  // CSV rows
  const rows = leads.map((lead) => [
    lead.id,
    lead.name,
    lead.email || '',
    lead.phone || '',
    lead.title || '',
    lead.company || '',
    lead.industry || '',
    lead.website || '',
    lead.location?.city || '',
    lead.location?.state || '',
    lead.location?.country || '',
    lead.socialProfiles?.linkedin || '',
    lead.socialProfiles?.twitter || '',
    lead.socialProfiles?.github || '',
    lead.socialProfiles?.facebook || '',
    lead.verified ? 'Yes' : 'No',
    lead.score,
    (lead.confidence * 100).toFixed(1),
    lead.enrichmentLevel,
    lead.sources.join('; '),
    new Date(lead.lastUpdated).toISOString(),
    (lead.tags || []).join('; ')
  ]);

  // Build CSV content
  let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
  csvContent += rows.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  // Write to file
  fs.writeFileSync(filepath, csvContent, 'utf-8');
  
  return filepath;
}

// Quick-start example - Comprehensive lead scraping and enrichment
export async function quickStart() {
  const scraper = new SpectralScraper({
    enrichment: {
      deduplicate: true,
      validateEmails: true,
      enrichWithSocial: true,
      enrichWithCompanyData: true,
      enrichWithPhoneData: true,
      maxParallelRequests: 10,
      scoreThreshold: 20,
    },
  });

  // Define comprehensive query
  const query: LeadQuery = {
    company: 'Tech Startups',
    location: 'Worldwide',
    limit: 50,
    title: 'CEO|Founder|CTO',
    industry: 'Software',
  };

  // Use ALL available sources for comprehensive scraping
  const allSources = [
    ScraperSource.LINKEDIN,
    ScraperSource.GOOGLE,
    ScraperSource.COMPANY_WEBSITE,
    ScraperSource.HUNTER_IO,
    ScraperSource.CLEARBIT,
    ScraperSource.DIRECTORY,
    ScraperSource.GITHUB,
    ScraperSource.EMAIL_FINDER,
    ScraperSource.JOB_BOARD,
  ];

  console.log('\n🔍 Starting comprehensive lead scraping...\n');
  const leads = await scraper.scrape(query, allSources);
  
  // Enrich each lead with additional data
  console.log(`\n✅ Found ${leads.length} leads, enriching...\n`);
  const enrichedLeads = await scraper.enrichLeads(leads.map(lead => ({
    email: lead.email,
    name: lead.name,
    company: lead.company,
    title: lead.title,
  })));

  // Display results
  console.log('\n📊 SCRAPED LEADS:\n');
  enrichedLeads.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.enriched.name || 'Unknown'}`);
    console.log(`   Company: ${result.enriched.company || 'N/A'}`);
    console.log(`   Title: ${result.enriched.title || 'N/A'}`);
    console.log(`   Email: ${result.enriched.email || 'Not found'}`);
    console.log(`   Phone: ${result.enriched.phone || 'Not found'}`);
    console.log(`   LinkedIn: ${result.enriched.socialProfiles?.linkedin || 'Not found'}`);
    console.log(`   Twitter: ${result.enriched.socialProfiles?.twitter || 'Not found'}`);
    console.log(`   Website: ${result.enriched.website || 'Not found'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Sources: ${result.sources.join(', ')}`);
  });

  const stats = scraper.getStats();
  console.log('\n📈 SCRAPING STATISTICS:\n');
  console.log(`   Total Leads Found: ${stats.totalLeads}`);
  console.log(`   Unique Leads: ${stats.uniqueLeads}`);
  console.log(`   Enrichment Rate: ${(stats.enrichmentRate * 100).toFixed(1)}%`);
  console.log(`   Verification Rate: ${(stats.verificationRate * 100).toFixed(1)}%`);
  console.log(`   Error Rate: ${(stats.errorRate * 100).toFixed(1)}%`);
  console.log(`   Total Duration: ${stats.totalDuration}ms`);
  console.log(`   Avg Score: ${stats.avgScore.toFixed(2)}\n`);

  // Export to CSV
  console.log('💾 Exporting leads to CSV...');
  const csvPath = await exportLeadsToCSV(enrichedLeads.map(r => r.enriched), 'spectral-leads');
  console.log(`✅ Leads exported to: ${csvPath}\n`);

  await scraper.shutdown();
}

export { RealDataBatchScraper, scrapeMassLeads } from './scraper-batch';

/**
 * Mass lead scraping and export function - REAL DATA
 */
export async function massLeadScraperAndExport(
  leadCount: number = 100000,
  searchQueries?: string[],
  domains?: string[]
): Promise<void> {
  const scraper = new RealDataBatchScraper({
    outputFile: `spectral-leads-${Date.now()}.csv`,
    delayMs: 1000, // Respectful rate limiting (1 second between requests)
  });

  await scraper.scrapeBatch(
    searchQueries || [
      'tech startup CEO founder',
      'software engineer company',
      'business development manager tech',
      'product manager SaaS',
      'CTO chief technology officer',
      'digital marketing manager',
      'venture capitalist investor',
      'startup founder tech',
    ],
    domains || [
      'techcrunch.com',
      'producthunt.com',
      'github.com',
      'crunchbase.com',
    ],
    leadCount
  );
}

// Run the quick start if this file is executed directly
if (require.main === module) {
  quickStart().catch(console.error);
}
