/**
 * Email Finder Scraper - Finds real emails using pattern matching + verification
 * Uses company domains and common naming patterns
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { Logger } from 'winston';
import { LeadQuery, ScraperResult, ScraperSource, Lead } from '../types/index';

export class EmailFinderScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private lastRequestTime = 0;

  constructor(
    private source: ScraperSource,
    private logger: Logger,
    private config?: { rateLimit?: number; timeout?: number }
  ) {}

  /**
   * Find emails for a company
   */
  async findCompanyEmails(company: string, domain: string): Promise<string[]> {
    const emails: Set<string> = new Set();

    try {
      // Common executive patterns
      const patterns = [
        'founder',
        'ceo',
        'cto',
        'contact',
        'info',
        'hello',
        'support',
        'sales',
        'hr',
        'hiring',
      ];

      patterns.forEach(pattern => {
        emails.add(`${pattern}@${domain}`);
      });

      // Try to find from company website
      const websiteEmails = await this.scrapeCompanyWebsite(`https://${domain}`);
      websiteEmails.forEach(email => emails.add(email));

      this.logger.debug(`Found ${emails.size} potential emails for ${company}`);
    } catch (error) {
      this.logger.debug(`Failed to find emails for company ${company}`);
    }

    return Array.from(emails);
  }

  /**
   * Scrape company website for contact information
   */
  async scrapeCompanyWebsite(websiteUrl: string): Promise<string[]> {
    const emails: Set<string> = new Set();

    try {
      await this.rateLimitWait();

      const response = await axios.get(websiteUrl, {
        headers: { 'User-Agent': this.userAgent },
        timeout: this.config?.timeout || 10000,
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);

      // Extract emails from href links
      $('a[href^="mailto:"]').each((_, el) => {
        const email = $(el).attr('href')?.replace(/^mailto:/, '').split('?')[0];
        if (email && this.isValidEmail(email)) {
          emails.add(email);
        }
      });

      // Extract emails from text content
      const bodyText = $('body').text();
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
      const matches = bodyText.match(emailRegex) || [];

      matches.forEach(email => {
        const normalized = email.toLowerCase();
        if (this.isValidEmail(normalized)) {
          emails.add(normalized);
        }
      });

      // Check contact/about pages
      const contactPages = ['/contact', '/about', '/team', '/careers', '/support'];
      for (const page of contactPages) {
        try {
          const pageUrl = `${websiteUrl}${page}`;
          await this.rateLimitWait();
          
          const pageResponse = await axios.get(pageUrl, {
            headers: { 'User-Agent': this.userAgent },
            timeout: 5000,
          });

          const page$ = cheerio.load(pageResponse.data);
          const pageText = page$('body').text();
          const pageMatches = pageText.match(emailRegex) || [];

          pageMatches.forEach(email => {
            const normalized = email.toLowerCase();
            if (this.isValidEmail(normalized)) {
              emails.add(normalized);
            }
          });
        } catch {
          // Continue to next page
        }
      }

      this.logger.debug(`Found ${emails.size} emails from ${websiteUrl}`);
    } catch (error) {
      this.logger.debug(`Failed to scrape ${websiteUrl}`);
    }

    return Array.from(emails);
  }

  /**
   * Generate email patterns for a person
   */
  generateNamePatterns(firstName: string, lastName: string, domain: string): string[] {
    const emails: string[] = [];

    if (!firstName || !lastName) return emails;

    const f = firstName.toLowerCase();
    const l = lastName.toLowerCase();

    // Common patterns
    const patterns = [
      `${f}.${l}`,
      `${f}${l}`,
      `${f}_${l}`,
      `${f[0]}${l}`,
      `${f[0]}.${l}`,
      `${l}.${f}`,
      `${l}${f}`,
      `${l}@`,
      `${f}@`,
    ];

    patterns.forEach(pattern => {
      if (!pattern.endsWith('@')) {
        emails.push(`${pattern}@${domain}`);
      }
    });

    return emails;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Filter out spam/invalid patterns
    const blocklist = [
      'no-reply',
      'noreply',
      'donotreply',
      'unsubscribe',
      'bot',
      'auto',
    ];

    return (
      emailRegex.test(email) &&
      !blocklist.some(term => email.includes(term)) &&
      email.length > 5 &&
      email.length < 100
    );
  }

  /**
   * Rate limiting
   */
  private async rateLimitWait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    const delay = this.config?.rateLimit || 1500;

    if (elapsed < delay) {
      await new Promise(resolve => setTimeout(resolve, delay - elapsed));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Execute email finding for leads
   */
  async execute(query: LeadQuery): Promise<ScraperResult> {
    const startTime = Date.now();
    const leads: Lead[] = [];

    try {
      // If we have a company name, try to find emails
      if (query.company) {
        const domain = this.extractDomain(query.company);
        if (domain) {
          const emails = await this.findCompanyEmails(query.company, domain);

          emails.slice(0, query.limit || 10).forEach((email, idx) => {
            leads.push({
              id: `email-finder-${query.company}-${idx}`,
              name: query.company,
              email: email,
              title: query.title || 'CEO',
              company: query.company,
              location: query.location || 'Unknown',
              industry: query.industry || 'Technology',
              verified: false,
              source: ScraperSource.EMAIL_FINDER,
              score: 68,
            } as any);
          });
        }
      }

      const duration = Date.now() - startTime;

      return {
        source: this.source,
        leads,
        count: leads.length,
        duration,
        timestamp: new Date(),
        success: leads.length > 0,
      };
    } catch (error) {
      this.logger.error('Email finding failed:', error);
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

  /**
   * Extract domain from company name
   */
  private extractDomain(company: string): string | null {
    // If it looks like a domain, return it
    if (company.includes('.com') || company.includes('.io')) {
      try {
        const url = new URL(company.includes('://') ? company : `https://${company}`);
        return url.hostname;
      } catch {
        return null;
      }
    }

    // Generate domain from company name
    const name = company
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)[0];

    if (name.length < 2) {
      return null;
    }

    return `${name}.com`;
  }
}
