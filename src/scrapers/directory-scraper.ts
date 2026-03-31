/**
 * Business Directory Scraper - Scrapes business directories for company/contact info
 * Sources: Crunchbase, AngelList, Pitchbook, Company databases
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from 'winston';
import { LeadQuery, ScraperResult, ScraperSource, Lead } from '../types/index';

export class DirectoryScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private lastRequestTime = 0;

  constructor(
    private source: ScraperSource,
    private logger: Logger,
    private config?: { rateLimit?: number; timeout?: number }
  ) {}

  /**
   * Scrape Crunchbase company listings (public data)
   */
  async scrapeCrunchbase(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      // Popular companies endpoint (free public data)
      const url = `https://www.crunchbase.com/search/companies?collection_id=&page=1`;

      await this.rateLimitWait();
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract company listings
      $('.grid-table-row').each((_, el) => {
        const name = $(el).find('.grid-table-cell-text').first().text().trim();
        const website = $(el).find('a[href*="http"]').attr('href');
        const location = $(el).find('[data-field="location"]').text().trim();

        if (name) {
          const domain = this.extractDomainFromUrl(website) || this.generateDomain(name);
          if (domain) {
            const emails = this.generateFounderEmails(domain);
            
            emails.forEach(email => {
              leads.push({
                id: `crunchbase-${name}`,
                name: name,
                email: email,
                title: 'CEO',
                company: name,
                location: location || query.location,
                industry: query.industry || 'Technology',
                verified: false,
                source: ScraperSource.DIRECTORY,
                score: 72,
                metadata: { website },
              } as any);
            });
          }
        }
      });

      this.logger.info(`Scraped ${leads.length} leads from Crunchbase`);
    } catch (error) {
      this.logger.error('Failed to scrape Crunchbase:', error);
    }

    return leads;
  }

  /**
   * Scrape AngelList startup listings
   */
  async scrapeAngelList(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      const url = `https://angel.co/companies?sort=all_time_followers`;

      await this.rateLimitWait();
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract startup listings
      $('[data-test="company-card"]').each((_, el) => {
        const name = $(el).find('[data-test="company-name"]').text().trim();
        const website = $(el).find('a.company-website').attr('href');
        const location = $(el).find('[data-test="location"]').text().trim();

        if (name) {
          const domain = this.extractDomainFromUrl(website) || this.generateDomain(name);
          if (domain) {
            const emails = this.generateFounderEmails(domain);
            
            emails.forEach(email => {
              leads.push({
                id: `angellist-${name}`,
                name: name,
                email: email,
                title: 'Founder',
                company: name,
                location: location || query.location,
                industry: 'Technology',
                verified: false,
                source: ScraperSource.DIRECTORY,
                score: 74,
                metadata: { website },
              } as any);
            });
          }
        }
      });

      this.logger.info(`Scraped ${leads.length} leads from AngelList`);
    } catch (error) {
      this.logger.error('Failed to scrape AngelList:', error);
    }

    return leads;
  }

  /**
   * Scrape LinkedIn companies (company pages from search)
   */
  async scrapeLinkedInCompanies(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      const searchParams = new URLSearchParams({
        keywords: query.industry || 'Technology',
        location: query.location || 'Worldwide',
      });

      const url = `https://www.linkedin.com/search/results/companies/?${searchParams.toString()}`;

      await this.rateLimitWait();
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract company cards
      $('[data-test="company-card"]').each((_, el) => {
        const name = $(el).find('.org-top-card__company-name').text().trim();
        const industry = $(el).find('.org-company-card__industry').text().trim();
        const website = $(el).attr('href');
        const location = $(el).find('[data-test="location"]').text().trim();

        if (name) {
          const domain = this.extractDomainFromUrl(website) || this.generateDomain(name);
          if (domain) {
            const emails = this.generateExecutiveEmails(domain);
            
            emails.forEach(email => {
              leads.push({
                id: `linkedin-company-${name}`,
                name: name,
                email: email,
                title: 'CEO',
                company: name,
                location: location || query.location,
                industry: industry || query.industry,
                verified: false,
                source: ScraperSource.DIRECTORY,
                score: 71,
                metadata: { website },
              } as any);
            });
          }
        }
      });

      this.logger.info(`Scraped ${leads.length} leads from LinkedIn Companies`);
    } catch (error) {
      this.logger.error('Failed to scrape LinkedIn Companies:', error);
    }

    return leads;
  }

  /**
   * Scrape Yellow Pages / Business listings
   */
  async scrapeBusinessListings(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      const searchParams = new URLSearchParams({
        q: query.industry || 'Technology',
        l: query.location || 'Worldwide',
      });

      const url = `https://www.yellowpages.com/search?${searchParams.toString()}`;

      await this.rateLimitWait();
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 15000,
      });

      const $ = cheerio.load(response.data);

      // Extract business listings
      $('[data-yext-id]').each((_, el) => {
        const name = $(el).find('.business-name').text().trim();
        const phone = $(el).find('.phone').text().trim();
        const website = $(el).find('a.track-visit-website').attr('href');
        const address = $(el).find('.address').text().trim();

        if (name) {
          const domain = this.extractDomainFromUrl(website) || this.generateDomain(name);
          if (domain) {
            const emails = this.generateBusinessEmails(domain);
            
            emails.forEach(email => {
              leads.push({
                id: `yellowpages-${name}`,
                name: name,
                email: email,
                phone: phone || undefined,
                title: 'Owner',
                company: name,
                location: address || query.location,
                industry: query.industry || 'Business',
                verified: false,
                source: ScraperSource.DIRECTORY,
                score: 65,
                metadata: { website, phone },
              } as any);
            });
          }
        }
      });

      this.logger.info(`Scraped ${leads.length} leads from Yellow Pages`);
    } catch (error) {
      this.logger.error('Failed to scrape Yellow Pages:', error);
    }

    return leads;
  }

  /**
   * Generate founder/CEO email patterns
   */
  private generateFounderEmails(domain: string): string[] {
    return [
      `founder@${domain}`,
      `ceo@${domain}`,
      `hello@${domain}`,
      `contact@${domain}`,
      `info@${domain}`,
    ];
  }

  /**
   * Generate executive email patterns
   */
  private generateExecutiveEmails(domain: string): string[] {
    return [
      `ceo@${domain}`,
      `leadership@${domain}`,
      `executive@${domain}`,
      `hello@${domain}`,
      `contact@${domain}`,
      `info@${domain}`,
    ];
  }

  /**
   * Generate business email patterns
   */
  private generateBusinessEmails(domain: string): string[] {
    return [
      `owner@${domain}`,
      `contact@${domain}`,
      `hello@${domain}`,
      `info@${domain}`,
      `support@${domain}`,
    ];
  }

  /**
   * Extract domain from URL
   */
  private extractDomainFromUrl(url: string | undefined): string | null {
    if (!url) return null;
    try {
      const u = new URL(url);
      return u.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Generate domain from company name
   */
  private generateDomain(company: string): string {
    const name = company
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)[0];

    if (name.length < 2) {
      return `${company.toLowerCase().replace(/\s+/g, '')}.com`;
    }

    return `${name}.com`;
  }

  /**
   * Rate limiting
   */
  private async rateLimitWait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    const delay = this.config?.rateLimit || 2000;

    if (elapsed < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - elapsed));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute scraping for a query
   */
  async execute(query: LeadQuery): Promise<ScraperResult> {
    const startTime = Date.now();
    const leads: Lead[] = [];

    try {
      // Scrape multiple directory sources
      const crunchbaseLeads = await this.scrapeCrunchbase(query);
      leads.push(...crunchbaseLeads);

      const angelListLeads = await this.scrapeAngelList(query);
      leads.push(...angelListLeads);

      const linkedinCompanyLeads = await this.scrapeLinkedInCompanies(query);
      leads.push(...linkedinCompanyLeads);

      const businessListings = await this.scrapeBusinessListings(query);
      leads.push(...businessListings);

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
