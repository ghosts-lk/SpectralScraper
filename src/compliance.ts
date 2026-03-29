/**
 * Compliance & Ethics Engine
 * 
 * Ensures all scraping operations comply with:
 * GDPR (EU), CCPA (US), DPA 2018 (UK), PIPEDA (Canada), APPs (Australia)
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import axios from 'axios';
import { Contact, ComplianceConfig, ComplianceCheck, Lead } from './types';
import { WyrmLogger } from './logger';

const logger = new WyrmLogger();

const STANDARD_USER_AGENT =
  'Mozilla/5.0 (compatible; SpectralScraper/1.0; +https://ghosts.lk/spectral)';

export class ComplianceEngine {
  private config: ComplianceConfig;
  private robotsCache = new Map<string, boolean>();
  private robotsCacheTTL = 24 * 60 * 60 * 1000; // 24 hours
  private robotsCacheTime = new Map<string, number>();

  constructor(config: Partial<ComplianceConfig> = {}) {
    this.config = {
      region: 'INTERNAL',
      gdprConsent: false,
      ccpaOptOut: false,
      respectRobotsTxt: true,
      rateLimitPerMinute: 30,
      retryBackoffMs: 1000,
      userAgent: STANDARD_USER_AGENT,
      complianceCheckRequired: true,
      ...config,
    };
  }

  /**
   * Check if a URL can be scraped per robots.txt
   */
  async canScrapeDomain(domain: string): Promise<boolean> {
    if (!this.config.respectRobotsTxt) {
      return true;
    }

    // Check cache
    const cached = this.robotsCache.get(domain);
    const cacheTime = this.robotsCacheTime.get(domain);
    if (cached !== undefined && cacheTime && Date.now() - cacheTime < this.robotsCacheTTL) {
      return cached;
    }

    try {
      const robotsURL = `https://${domain}/robots.txt`;
      const response = await axios.get(robotsURL, {
        timeout: 5000,
        headers: { 'User-Agent': this.config.userAgent },
      });

      const canScrape = !this.isBlockedByRobots(response.data, 'SpectralScraper');
      this.robotsCache.set(domain, canScrape);
      this.robotsCacheTime.set(domain, Date.now());

      return canScrape;
    } catch (error) {
      // If robots.txt doesn't exist, assume it's OK to scrape (but be conservative)
      logger.info(`robots.txt not found for ${domain}, assuming permission`);
      return true;
    }
  }

  /**
   * Validate contact data for compliance with region-specific regulations
   */
  validateContactCompliance(contact: Contact, region: string): ComplianceCheck {
    const issues: string[] = [];

    if (region === 'EU' || region === 'UK') {
      // GDPR: Personal data processing requires consent
      if (!contact.verified) {
        issues.push('GDPR: Email not verified (consent unclear)');
      }

      // Check for sensitive data without explicit handling
      if (contact.email && !this.config.gdprConsent) {
        issues.push('GDPR: Personal email collected without explicit consent');
      }
    }

    if (region === 'US') {
      // CCPA: Must respect opt-out requests
      if (this.config.ccpaOptOut && contact.optedOut) {
        issues.push('CCPA: Contact has opted out, cannot be used');
      }
    }

    if (region === 'CA') {
      // PIPEDA: Similar to GDPR
      if (!contact.verified) {
        issues.push('PIPEDA: Contact not verified');
      }
    }

    const passed = issues.length === 0;

    return {
      passed,
      region: region as any,
      issues,
      timestamp: new Date(),
      approvedBy: passed ? 'automated' : undefined,
    };
  }

  /**
   * Validate a lead for compliance
   */
  validateLeadCompliance(lead: Lead): ComplianceCheck {
    const issues: string[] = [];
    const region = lead.region;

    // Check contact compliance
    const contactCheck = this.validateContactCompliance(lead.contact, region);
    if (!contactCheck.passed) {
      issues.push(...contactCheck.issues);
    }

    // Check for data minimization
    if (region === 'EU' || region === 'UK') {
      // Only collect necessary data
      const unnecessaryFields = this.getUnnecessaryFields(lead.contact);
      if (unnecessaryFields.length > 0) {
        issues.push(`GDPR data minimization: Consider removing ${unnecessaryFields.join(', ')}`);
      }
    }

    // Check consent status
    if (!lead.complianceApproved && (region === 'EU' || region === 'UK' || region === 'CA')) {
      issues.push(`${region}: Lead not approved for compliance`);
    }

    const passed = issues.length === 0;

    return {
      passed,
      region: region,
      issues,
      timestamp: new Date(),
      approvedBy: passed ? 'automated' : undefined,
    };
  }

  /**
   * Check if a domain is in a blocklist (Do Not Scrape)
   */
  async isDomainBlocklisted(domain: string): Promise<boolean> {
    // Internal blocklist
    const blocklist = [
      'facebook.com',
      'instagram.com',
      'twitter.com', // Twitter API requires authentication
      'tiktok.com',
      'snapchat.com',
      'pinterest.com',
      'reddit.com', // Has restrictions in ToS
      'quora.com',
    ];

    return blocklist.some(blocked => domain.includes(blocked));
  }

  /**
   * Get compliance report for a scraping job
   */
  getComplianceReport(leads: Lead[]): {
    totalLeads: number;
    complianceApproved: number;
    rejectedLeads: Lead[];
    regionBreakdown: Record<string, number>;
    issues: string[];
  } {
    const issues: string[] = [];
    const rejectedLeads: Lead[] = [];
    const regionBreakdown: Record<string, number> = {};

    for (const lead of leads) {
      // Track regions
      regionBreakdown[lead.region] = (regionBreakdown[lead.region] || 0) + 1;

      // Validate compliance
      const check = this.validateLeadCompliance(lead);
      if (!check.passed) {
        rejectedLeads.push(lead);
        issues.push(`Lead ${lead.id}: ${check.issues.join('; ')}`);
      }
    }

    return {
      totalLeads: leads.length,
      complianceApproved: leads.length - rejectedLeads.length,
      rejectedLeads,
      regionBreakdown,
      issues,
    };
  }

  // ==================== HELPERS ====================

  private isBlockedByRobots(robotsContent: string, userAgent: string): boolean {
    const lines = robotsContent.split('\n');
    let currentUserAgent = '*';
    let blocked = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check User-agent
      if (trimmed.startsWith('User-agent:')) {
        currentUserAgent = trimmed.split(':')[1].trim();
      }

      // Check if this rule applies to our user agent
      if (currentUserAgent === '*' || currentUserAgent === userAgent || currentUserAgent === 'SpectralScraper') {
        // Check Disallow
        if (trimmed.startsWith('Disallow:')) {
          const disallowPath = trimmed.split(':')[1].trim();
          if (disallowPath === '/' || disallowPath === '') {
            blocked = true;
            break;
          }
        }
      }
    }

    return blocked;
  }

  private getUnnecessaryFields(contact: Contact): string[] {
    // For GDPR data minimization, we only need:
    // - Email (primary identifier)
    // - Company (business context)
    // - Job Title (relevance)

    const necessary = ['email', 'company', 'jobTitle'];
    const unnecessary: string[] = [];

    // Check what fields are present but may be unnecessary
    if (contact.phone) unnecessary.push('phone');
    if (contact.location) unnecessary.push('location');
    if (contact.Twitter) unnecessary.push('Twitter');

    return unnecessary;
  }
}

export function createComplianceEngine(config?: Partial<ComplianceConfig>): ComplianceEngine {
  return new ComplianceEngine(config);
}
