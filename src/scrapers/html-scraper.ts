/**
 * HTML-based Scraper - Uses Cheerio for static content
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from 'winston';
import { LeadQuery, ScraperResult, ScraperSource } from '../types/index.js';

export class HtmlScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(
    private source: ScraperSource,
    private logger: Logger,
    private config?: { rateLimit?: number; timeout?: number }
  ) {}

  /**
   * Scrape a single URL for contact information
   */
  async scrapeUrl(url: string): Promise<any[]> {
    await this.rateLimitWait();

    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 10000,
      });

      const $ = cheerio.load(response.data);
      const contacts = this.extractContacts($ as any);

      this.logger.debug(`Scraped ${contacts.length} contacts from ${url}`);
      return contacts;
    } catch (error) {
      this.logger.error(`Failed to scrape ${url}:`, error);
      return [];
    }
  }

  /**
   * Extract email addresses from HTML
   */
  private extractContacts($: cheerio.CheerioAPI): any[] {
    const contacts: any[] = [];
    const seen = new Set<string>();

    // Extract from mailto links
    $('a[href^="mailto:"]').each((_, el) => {
      const email = $(el).attr('href')?.replace(/^mailto:/, '').toLowerCase();
      const name = $(el).text().trim();

      if (email && !seen.has(email) && this.isValidEmail(email)) {
        contacts.push({ email, name: name || undefined });
        seen.add(email);
      }
    });

    // Extract from text content (basic email regex)
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const bodyText = $('body').text();
    const matches = bodyText.match(emailRegex) || [];

    matches.forEach(email => {
      email = email.toLowerCase();
      if (!seen.has(email) && this.isValidEmail(email)) {
        contacts.push({ email });
        seen.add(email);
      }
    });

    // Extract from structured data (JSON-LD, microdata)
    const jsonLd = $('script[type="application/ld+json"]');
    jsonLd.each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        if (data.email && !seen.has(data.email)) {
          contacts.push(data);
          seen.add(data.email);
        }
      } catch {
        // Skip invalid JSON
      }
    });

    return Array.from(new Set(contacts.map((c:any) => JSON.stringify(c)))).map((s:any) => JSON.parse(s));
  }

  /**
   * Execute scraping for a query
   */
  async execute(query: LeadQuery): Promise<ScraperResult> {
    const startTime = Date.now();
    const leads: any[] = [];
    let errorCount = 0;

    try {
      // For HTML scraper, we'd typically search for company websites
      // This is a simplified version
      if (query.company) {
        const url = `https://www.${query.company.toLowerCase().replace(/\s+/g, '')}.com`;
        const contacts = await this.scrapeUrl(url);
        leads.push(...contacts);
      }

      return {
        source: this.source,
        leads: leads.map(lead => ({
          ...lead,
          company: query.company,
          title: lead.title,
        })),
        success: true,
        count: leads.length,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        source: this.source,
        leads: [],
        success: false,
        error: String(error),
        count: 0,
        duration: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Rate limiting to respect servers
   */
  private async rateLimitWait(): Promise<void> {
    if (!this.config?.rateLimit) return;

    const elapsedMs = Date.now() - this.lastRequestTime;
    const minIntervalMs = (60 * 1000) / this.config.rateLimit; // Convert req/min to ms/req

    if (elapsedMs < minIntervalMs) {
      await new Promise(resolve => setTimeout(resolve, minIntervalMs - elapsedMs));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }
}
