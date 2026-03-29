/**
 * Core Scraping Engine - Main orchestrator for SpectralScraper
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import { Logger } from 'winston';
import { EventEmitter } from 'events';
import {
  Lead,
  LeadQuery,
  ScraperConfig,
  ScraperSource,
  ScraperResult,
  EnrichmentConfig,
  ScrapingJob,
  CacheConfig,
  ComplianceConfig,
  ScrapingStats,
  DeduplicationResult
} from '../types/index.js';

export class SpectralEngine extends EventEmitter {
  private logger: Logger;
  private scrapers: Map<ScraperSource, any> = new Map();
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private stats: ScrapingStats;
  private jobs: Map<string, ScrapingJob> = new Map();

  constructor(
    private config: {
      cache: CacheConfig;
      compliance: ComplianceConfig;
      enrichment: EnrichmentConfig;
    },
    logger: Logger
  ) {
    super();
    this.logger = logger;
    this.initializeStats();
  }

  /**
   * Initialize statistics tracker
   */
  private initializeStats(): void {
    this.stats = {
      totalLeads: 0,
      uniqueLeads: 0,
      bySource: {} as Record<ScraperSource, number>,
      avgScore: 0,
      enrichmentRate: 0,
      verificationRate: 0,
      errorRate: 0,
      cacheSavings: 0,
      totalDuration: 0,
      startTime: new Date(),
    };
  }

  /**
   * Register a scraper for a specific source
   */
  registerScraper(source: ScraperSource, scraper: any): void {
    this.scrapers.set(source, scraper);
    this.logger.info(`Registered scraper for ${source}`);
  }

  /**
   * Scrape leads from one or more sources
   */
  async scrape(query: LeadQuery, sources: ScraperSource[]): Promise<Lead[]> {
    const jobId = `job-${Date.now()}`;
    const job: ScrapingJob = {
      id: jobId,
      name: `Scraping: ${JSON.stringify(query).substring(0, 50)}`,
      queries: [query],
      sources,
      enrichment: this.config.enrichment,
      status: 'running',
      progress: { total: sources.length, completed: 0, failed: 0 },
      startedAt: new Date(),
    };

    this.jobs.set(jobId, job);
    this.emit('job:started', job);

    let allLeads: Lead[] = [];

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(query, sources);
      if (this.config.cache.enabled) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.logger.info(`Cache hit for query ${cacheKey}`);
          this.stats.cacheSavings++;
          return cached;
        }
      }

      // Scrape from sources in parallel
      const startTime = Date.now();
      const results = await Promise.allSettled(
        sources.map(source => this.scrapeSource(source, query))
      );

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status === 'fulfilled') {
          const leads = result.value;
          allLeads.push(...leads);
          job.progress.completed++;
        } else {
          job.progress.failed++;
          this.logger.error(`Scraping failed for ${sources[i]}:`, result.reason);
        }
      }

      const duration = Date.now() - startTime;
      this.stats.totalDuration += duration;

      // Deduplicate
      if (allLeads.length > 0) {
        const deduped = await this.deduplicateLeads(allLeads);
        allLeads = deduped.leads;
      }

      // Enrich leads
      if (this.config.enrichment.enabled) {
        allLeads = await this.enrichLeads(allLeads);
      }

      // Cache results
      if (this.config.cache.enabled) {
        this.setInCache(cacheKey, allLeads);
      }

      // Update stats
      this.stats.totalLeads += allLeads.length;
      this.stats.uniqueLeads += allLeads.filter(l => l.verified).length;

      job.status = 'completed';
      job.completedAt = new Date();
      job.results = allLeads;
      this.emit('job:completed', job);

      return allLeads;
    } catch (error) {
      job.status = 'failed';
      job.error = String(error);
      this.emit('job:failed', job);
      throw error;
    }
  }

  /**
   * Scrape from a single source
   */
  private async scrapeSource(source: ScraperSource, query: LeadQuery): Promise<Lead[]> {
    const scraper = this.scrapers.get(source);
    if (!scraper) {
      throw new Error(`No scraper registered for source: ${source}`);
    }

    this.logger.info(`Scraping from ${source}...`);
    const result = await scraper.execute(query);

    // Convert to Lead format
    return result.leads.map((lead: any) => ({
      ...lead,
      id: lead.id || `${source}-${Date.now()}`,
      sources: [source],
      enrichmentLevel: 'basic' as const,
      lastUpdated: new Date(),
    }));
  }

  /**
   * Deduplicate leads using fuzzy matching
   */
  private async deduplicateLeads(leads: Lead[]): Promise<{ leads: Lead[]; duplicates: number }> {
    const seen = new Set<string>();
    const unique: Lead[] = [];
    let duplicates = 0;

    for (const lead of leads) {
      const key = `${lead.email || ''}-${lead.name || ''}-${lead.company || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(lead);
      } else {
        duplicates++;
      }
    }

    this.logger.info(`Deduplication: ${leads.length} → ${unique.length} (removed ${duplicates})`);
    return { leads: unique, duplicates };
  }

  /**
   * Enrich leads with additional data
   */
  private async enrichLeads(leads: Lead[]): Promise<Lead[]> {
    // TODO: Implement enrichment with external APIs
    // - Clearbit, Hunter.io, LinkedIn, etc.
    // - This would be populated by EnrichmentService
    return leads;
  }

  /**
   * Get scraping statistics
   */
  getStats(): ScrapingStats {
    return { ...this.stats };
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ScrapingJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScrapingJob[] {
    return Array.from(this.jobs.values());
  }

  // ==================== CACHE HELPERS ====================

  private generateCacheKey(query: LeadQuery, sources: ScraperSource[]): string {
    const queryStr = JSON.stringify(query);
    const sourcesStr = sources.join(',');
    return `scrape:${Buffer.from(`${queryStr}-${sourcesStr}`).toString('base64')}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private setInCache(key: string, data: any): void {
    const ttl = (this.config.cache.ttl || 3600) * 1000; // Convert to ms
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Shutdown engine gracefully
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down SpectralEngine...');
    this.removeAllListeners();
    this.cache.clear();
    this.logger.info('SpectralEngine shut down complete');
  }
}
