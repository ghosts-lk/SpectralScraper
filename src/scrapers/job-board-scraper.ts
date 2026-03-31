/**
 * Job Board Scraper - Scrapes job postings for leads
 * Sources: Indeed, LinkedIn Jobs, Glassdoor, etc.
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from 'winston';
import { LeadQuery, ScraperResult, ScraperSource, Lead } from '../types/index';

export class JobBoardScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(
    private source: ScraperSource,
    private logger: Logger,
    private config?: { rateLimit?: number; timeout?: number }
  ) {}

  /**
   * Scrape Indeed job listings
   */
  async scrapeIndeed(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      // Build search URL
      const searchParams = new URLSearchParams({
        q: query.title || 'CEO',
        l: query.location || 'Worldwide',
        limit: '50',
      });

      const url = `https://indeed.com/jobs?${searchParams.toString()}`;
      
      await this.rateLimitWait();
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract job listings
      $('[data-job-id]').each((_, el) => {
        const jobTitle = $(el).find('[data-job-title]').text().trim();
        const company = $(el).find('[data-company-name]').text().trim();
        const location = $(el).find('[data-location]').text().trim();
        const jobUrl = $(el).find('a.jcs').attr('href');

        if (company && jobTitle) {
          // Generate potential email from company
          const emails = this.generateCompanyEmails(company, [jobTitle]);
          
          emails.forEach(email => {
            leads.push({
              id: `indeed-${jobTitle}-${company}`,
              name: company,
              email: email,
              title: jobTitle,
              company: company,
              location: location || query.location,
              industry: query.industry || 'Technology',
              verified: false,
              source: ScraperSource.JOB_BOARD,
              score: 65,
              metadata: { jobUrl },
            } as any);
          });
        }
      });

      this.logger.info(`Scraped ${leads.length} leads from Indeed`);
    } catch (error) {
      this.logger.error('Failed to scrape Indeed:', error);
    }

    return leads;
  }

  /**
   * Scrape LinkedIn job listings (public jobs page)
   */
  async scrapeLinkedInJobs(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      const searchParams = new URLSearchParams({
        keywords: query.title || 'CEO',
        location: query.location || 'Worldwide',
      });

      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${searchParams.toString()}`;

      await this.rateLimitWait();
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract job cards
      $('.base-card').each((_, el) => {
        const jobTitle = $(el).find('.base-search-card__title').text().trim();
        const company = $(el).find('.base-search-card__subtitle').text().trim();
        const location = $(el).find('.job-search-card__location').text().trim();

        if (company && jobTitle) {
          const emails = this.generateCompanyEmails(company, [jobTitle]);
          
          emails.forEach(email => {
            leads.push({
              id: `linkedin-${jobTitle}-${company}`,
              name: company,
              email: email,
              title: jobTitle,
              company: company,
              location: location || query.location,
              industry: query.industry || 'Technology',
              verified: false,
              source: ScraperSource.JOB_BOARD,
              score: 70,
            } as any);
          });
        }
      });

      this.logger.info(`Scraped ${leads.length} leads from LinkedIn Jobs`);
    } catch (error) {
      this.logger.error('Failed to scrape LinkedIn Jobs:', error);
    }

    return leads;
  }

  /**
   * Scrape Glassdoor job listings
   */
  async scrapeGlassdoor(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      const searchParams = new URLSearchParams({
        q: query.title || 'CEO',
        l: query.location || 'Worldwide',
      });

      const url = `https://www.glassdoor.com/Job/jobs.htm?${searchParams.toString()}`;

      await this.rateLimitWait();
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract job listings
      $('[data-job-id]').each((_, el) => {
        const jobTitle = $(el).find('[data-job-title]').text().trim();
        const company = $(el).find('[data-company-name]').text().trim();
        const location = $(el).find('[data-location]').text().trim();

        if (company && jobTitle) {
          const emails = this.generateCompanyEmails(company, [jobTitle]);
          
          emails.forEach(email => {
            leads.push({
              id: `glassdoor-${jobTitle}-${company}`,
              name: company,
              email: email,
              title: jobTitle,
              company: company,
              location: location || query.location,
              industry: query.industry || 'Technology',
              verified: false,
              source: ScraperSource.JOB_BOARD,
              score: 68,
            } as any);
          });
        }
      });

      this.logger.info(`Scraped ${leads.length} leads from Glassdoor`);
    } catch (error) {
      this.logger.error('Failed to scrape Glassdoor:', error);
    }

    return leads;
  }

  /**
   * Generate possible company email addresses
   */
  private generateCompanyEmails(company: string, titles: string[]): string[] {
    const emails: Set<string> = new Set();
    const domain = this.extractDomain(company);
    
    if (!domain) return [];

    // Common recipient patterns for job inquiries
    const patterns = [
      'careers',
      'hr',
      'hiring',
      'contact',
      'info',
      'hello',
      'support',
      'admin',
    ];

    patterns.forEach(pattern => {
      emails.add(`${pattern}@${domain}`);
    });

    // Try to extract founder/CEO name and create email
    const exec = (titles[0] || '').match(/CEO|Founder|Director|CTO|VP/i);
    if (exec) {
      emails.add(`ceo@${domain}`);
      emails.add(`founder@${domain}`);
    }

    return Array.from(emails);
  }

  /**
   * Extract domain from company name
   */
  private extractDomain(company: string): string | null {
    // Try to construct domain from company name
    const name = company
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)[0];

    if (name.length < 2) {
      return null;
    }

    return `${name}.com`;
  }

  /**
   * Rate limiting helper
   */
  private async rateLimitWait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    const delay = this.config?.rateLimit || 2000;

    if (elapsed < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - elapsed));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Execute scraping for a query
   */
  async execute(query: LeadQuery): Promise<ScraperResult> {
    const startTime = Date.now();
    const leads: Lead[] = [];

    try {
      // Scrape multiple sources in sequence
      const indeedLeads = await this.scrapeIndeed(query);
      leads.push(...indeedLeads);

      const linkedinLeads = await this.scrapeLinkedInJobs(query);
      leads.push(...linkedinLeads);

      const glassdoorLeads = await this.scrapeGlassdoor(query);
      leads.push(...glassdoorLeads);

      const duration = Date.now() - startTime;

      return {
        source: this.source,
        leads: leads.slice(0, query.limit || leads.length),
        count: leads.length,
        duration,
        timestamp: new Date(),
        success: leads.length > 0,
      };
    } catch (error) {
      this.logger.error('Scraping failed:', error);
      return {
        source: this.source,
        leads: [],
        count: 0,
        duration: Date.now() - startTime,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
