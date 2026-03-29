/**
 * Browser-based Scraper - Uses Puppeteer for dynamic content
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import puppeteer from 'puppeteer';
import { Logger } from 'winston';
import { LeadQuery, ScraperResult, ScraperSource } from '../types/index.js';

export class BrowserScraper {
  private browser: any = null;

  constructor(
    private source: ScraperSource,
    private logger: Logger,
    private config?: { headless?: boolean; timeout?: number }
  ) {}

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: this.config?.headless !== false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.info(`Initialized browser for ${this.source}`);
    } catch (error) {
      this.logger.error('Failed to initialize browser:', error);
      throw error;
    }
  }

  /**
   * Scrape a URL with JavaScript rendering
   */
  async scrapeUrl(url: string): Promise<any[]> {
    if (!this.browser) {
      await this.initialize();
    }

    let page: any = null;
    try {
      page = await this.browser!.newPage();

      // Set viewport
      await page.setViewport({ width: 1280, height: 720 });

      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle2', timeout: this.config?.timeout || 30000 });

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Extract contacts
      const contacts = await page.evaluate(() => {
        const results: any[] = [];

        // Look for email links
        document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
          const email = el.getAttribute('href')?.replace(/^mailto:/, '');
          const name = el.textContent;
          if (email) results.push({ email, name });
        });

        // Look for phone links
        document.querySelectorAll('a[href^="tel:"]').forEach(el => {
          const phone = el.getAttribute('href')?.replace(/^tel:/, '');
          const name = el.textContent;
          if (phone) results.push({ phone, name });
        });

        // Look for hidden data in JSON-LD
        document.querySelectorAll('script[type="application/ld+json"]').forEach(el => {
          try {
            const data = JSON.parse(el.textContent || '{}');
            if (data.contactPoint) results.push(data.contactPoint);
          } catch {
            // Skip
          }
        });

        return results;
      });

      this.logger.debug(`Scraped ${contacts.length} contacts from ${url}`);
      return contacts;
    } catch (error) {
      this.logger.error(`Failed to scrape ${url}:`, error);
      return [];
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Execute scraping for a query
   */
  async execute(query: LeadQuery): Promise<ScraperResult> {
    const startTime = Date.now();
    const leads: any[] = [];

    try {
      if (!this.browser) {
        await this.initialize();
      }

      // Scrape based on query parameters
      // This is a simplified version; in practice, you'd use search results
      for (const keyword of query.keywords || []) {
        const url = `https://www.example-directory.com/search?q=${encodeURIComponent(keyword)}`;
        const contacts = await this.scrapeUrl(url);
        leads.push(...contacts);
      }

      return {
        source: this.source,
        leads: leads.map(lead => ({
          ...lead,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          title: query.title,
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
   * Shutdown browser
   */
  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.logger.info(`Closed browser for ${this.source}`);
    }
  }
}
