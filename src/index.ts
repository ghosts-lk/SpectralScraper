/**
 * SpectralScraper - Professional Web Scraping & Lead Generation Tool
 * Main Entry Point
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

export * from './types/index.js';
export * from './core/engine.js';
export * from './core/lead-scorer.js';
export * from './enrichment/enrichment-service.js';
export * from './scrapers/html-scraper.js';
export * from './scrapers/browser-scraper.js';
export * from './utils/logger.js';
export * from './utils/compliance.js';

import { SpectralEngine } from './core/engine.js';
import { EnrichmentService } from './enrichment/enrichment-service.js';
import { HtmlScraper } from './scrapers/html-scraper.js';
import { BrowserScraper } from './scrapers/browser-scraper.js';
import { getLogger } from './utils/logger.js';
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

// Quick-start example
export async function quickStart() {
  const scraper = new SpectralScraper();

  const query: LeadQuery = {
    company: 'Ghost Protocol',
    location: 'Sri Lanka',
    limit: 10,
  };

  const leads = await scraper.scrape(query, [ScraperSource.COMPANY_WEBSITE]);
  console.log('Found leads:', leads);

  const stats = scraper.getStats();
  console.log('Statistics:', stats);

  await scraper.shutdown();
}
