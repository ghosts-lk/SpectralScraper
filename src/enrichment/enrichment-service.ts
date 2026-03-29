/**
 * Lead Enrichment Service - Data enrichment and scoring
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import { Logger } from 'winston';
import { Lead, EnrichmentConfig, EnrichmentResult } from '../types/index.js';

export class EnrichmentService {
  constructor(
    private config: EnrichmentConfig,
    private logger: Logger
  ) {}

  /**
   * Enrich a single lead with additional data
   */
  async enrichLead(lead: Partial<Lead>): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const enriched: Lead = {
      id: lead.id || `lead-${Date.now()}`,
      name: lead.name || '',
      email: lead.email,
      phone: lead.phone,
      title: lead.title,
      company: lead.company,
      industry: lead.industry,
      website: lead.website,
      location: lead.location,
      socialProfiles: lead.socialProfiles || {},
      score: 0,
      sources: lead.sources || [],
      enrichmentLevel: 'basic',
      confidence: 0,
      lastUpdated: new Date(),
      tags: lead.tags || [],
    };

    const newData: string[] = [];
    let sources = lead.sources || [];

    // Validate email
    if (this.config.validateEmails && enriched.email) {
      const valid = await this.validateEmail(enriched.email);
      if (valid) {
        newData.push('email_validated');
      }
    }

    // Enrich with social profiles
    if (this.config.enrichWithSocial && enriched.name) {
      const social = await this.findSocialProfiles(enriched.name, enriched.company);
      if (social) {
        enriched.socialProfiles = { ...enriched.socialProfiles, ...social };
        newData.push('social_profiles');
        sources = [...sources, 'social_enrichment'];
      }
    }

    // Enrich with company data
    if (this.config.enrichWithCompanyData && enriched.company) {
      const companyData = await this.enrichCompanyData(enriched.company);
      if (companyData) {
        enriched.industry = companyData.industry || enriched.industry;
        enriched.website = companyData.website || enriched.website;
        newData.push('company_data');
        sources = [...sources, 'company_db'];
      }
    }

    // Score the lead
    enriched.score = this.scoreLead(enriched);
    enriched.confidence = this.calculateConfidence(enriched);
    enriched.enrichmentLevel = newData.length > 0 ? 'enriched' : 'basic';

    return {
      original: lead,
      enriched,
      sources,
      newData,
      confidence: enriched.confidence,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Validate email address
   */
  private async validateEmail(email: string): Promise<boolean> {
    // TODO: Implement email validation via Hunter.io or similar
    // For now, use basic regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Find social profiles for a person
   */
  private async findSocialProfiles(
    name: string,
    company?: string
  ): Promise<Partial<Lead['socialProfiles']>> {
    // TODO: Integrate with LinkedIn API, Twitter API, GitHub API
    // For now, return empty object
    return {};
  }

  /**
   * Enrich company data
   */
  private async enrichCompanyData(company: string): Promise<{ industry?: string; website?: string } | null> {
    // TODO: Integrate with Clearbit, Apollo.io, or similar
    // For now, return null
    return null;
  }

  /**
   * Score a lead on a 0-100 scale
   */
  private scoreLead(lead: Lead): number {
    let score = 0;
    const weights = {
      email: 20,
      company: 15,
      title: 10,
      phone: 8,
      location: 10,
      social: 12,
      completeness: 20,
      recency: 5,
    };

    // Email validity (20 pts)
    if (lead.email && this.isValidEmail(lead.email)) score += weights.email;

    // Company data (15 pts)
    if (lead.company && lead.company.length > 0) score += weights.company;

    // Title (10 pts)
    if (lead.title && lead.title.length > 0) score += weights.title;

    // Phone (8 pts)
    if (lead.phone && lead.phone.length > 0) score += weights.phone;

    // Location (10 pts)
    if (lead.location && (lead.location.country || lead.location.city)) score += weights.location;

    // Social profiles (12 pts)
    const socialCount = Object.values(lead.socialProfiles || {}).filter(v => v).length;
    if (socialCount > 0) score += Math.min(weights.social, (socialCount / 3) * weights.social);

    // Completeness (20 pts)
    const fields = ['name', 'email', 'company', 'title', 'phone', 'website'];
    const filled = fields.filter(f => (lead as any)[f]).length;
    const completeness = (filled / fields.length) * weights.completeness;
    score += completeness;

    // Recency (5 pts)
    if (lead.lastUpdated) {
      const daysSinceUpdate = (Date.now() - lead.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) score += weights.recency;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Calculate confidence score (0-100)
   */
  private calculateConfidence(lead: Lead): number {
    let confidence = 50; // Base

    if (lead.verified) confidence += 30;
    if (lead.sources.length > 1) confidence += 15;
    if (lead.score > 75) confidence += 10;

    return Math.min(100, confidence);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Batch enrich leads
   */
  async enrichBatch(leads: Partial<Lead>[]): Promise<EnrichmentResult[]> {
    const results: EnrichmentResult[] = [];

    for (const lead of leads) {
      try {
        const result = await this.enrichLead(lead);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to enrich lead:`, error);
      }
    }

    return results;
  }
}
