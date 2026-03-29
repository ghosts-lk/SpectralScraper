/**
 * Lead Scoring Engine
 * 
 * Intelligent scoring system for lead quality assessment
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import { Contact, Lead, LeadScoreResult, ScoringCriteria } from './types';

const DEFAULT_CRITERIA: ScoringCriteria = {
  emailCompleted: 20,
  phoneCompleted: 15,
  jobTitlePresent: 20,
  companyPresent: 15,
  linkedinVerified: 15,
  githubPresent: 10,
  dataFreshness: 5,
};

export class LeadScorer {
  private criteria: ScoringCriteria;

  constructor(customCriteria?: Partial<ScoringCriteria>) {
    this.criteria = { ...DEFAULT_CRITERIA, ...customCriteria };
  }

  /**
   * Score a contact based on completeness and quality
   */
  scoreContact(contact: Contact): LeadScoreResult {
    const breakdown: ScoringCriteria = {
      emailCompleted: 0,
      phoneCompleted: 0,
      jobTitlePresent: 0,
      companyPresent: 0,
      linkedinVerified: 0,
      githubPresent: 0,
      dataFreshness: 0,
    };

    const missingCritical: string[] = [];
    let totalScore = 0;

    // Email (Critical)
    if (contact.email && this.isValidEmail(contact.email)) {
      breakdown.emailCompleted = this.criteria.emailCompleted;
      totalScore += breakdown.emailCompleted;
    } else {
      missingCritical.push('email');
    }

    // Phone
    if (contact.phone && this.isValidPhone(contact.phone)) {
      breakdown.phoneCompleted = this.criteria.phoneCompleted;
      totalScore += breakdown.phoneCompleted;
    }

    // Job Title (Critical)
    if (contact.jobTitle && contact.jobTitle.length > 2) {
      breakdown.jobTitlePresent = this.criteria.jobTitlePresent;
      totalScore += breakdown.jobTitlePresent;
    } else {
      missingCritical.push('jobTitle');
    }

    // Company (Critical)
    if (contact.company && contact.company.length > 2) {
      breakdown.companyPresent = this.criteria.companyPresent;
      totalScore += breakdown.companyPresent;
    } else {
      missingCritical.push('company');
    }

    // LinkedIn verification
    if (contact.LinkedIn && this.verifyLinkedInURL(contact.LinkedIn)) {
      breakdown.linkedinVerified = this.criteria.linkedinVerified;
      totalScore += breakdown.linkedinVerified;
    }

    // GitHub presence
    if (contact.GitHub && this.verifyGitHubURL(contact.GitHub)) {
      breakdown.githubPresent = this.criteria.githubPresent;
      totalScore += breakdown.githubPresent;
    }

    // Data freshness (last verified < 7 days)
    if (contact.lastVerified) {
      const daysSinceVerified = this.daysSince(contact.lastVerified);
      if (daysSinceVerified < 7) {
        breakdown.dataFreshness = this.criteria.dataFreshness;
        totalScore += breakdown.dataFreshness;
      }
    }

    // Apply confidence multiplier (if confidence is low, reduce score)
    const confidenceMultiplier = (contact.confidence || 50) / 100;
    const adjustedScore = Math.round(totalScore * confidenceMultiplier);

    // Lead is "ready" if:
    // 1. Score >= 60
    // 2. Has email and job title and company
    const ready = adjustedScore >= 60 && missingCritical.length === 0;

    return {
      score: Math.min(100, adjustedScore),
      breakdown,
      ready,
      missingCritical,
    };
  }

  /**
   * Score a lead (contact + source context)
   */
  scoreLead(lead: Lead): number {
    const contactScore = this.scoreContact(lead.contact).score;
    
    // Boost based on source quality
    let sourceBoost = 0;
    switch (lead.source) {
      case 'directory':
        sourceBoost = 5; // Directories are usually clean
        break;
      case 'website':
        sourceBoost = 3; // Websites usually have good data
        break;
      case 'social':
        sourceBoost = 2; // Social is semi-reliable
        break;
      case 'email_list':
        sourceBoost = 4; // Pre-built lists are quality
        break;
      case 'api':
        sourceBoost = 6; // APIs are usually accurate
        break;
      default:
        sourceBoost = 0;
    }

    // Apply compliance boost (approved leads score higher)
    const complianceBoost = lead.complianceApproved ? 5 : 0;

    // Apply enrichment boost (more enrichment = higher score)
    const enrichmentBoost = Math.min(5, lead.enrichmentSources.length);

    const totalScore = contactScore + sourceBoost + complianceBoost + enrichmentBoost;
    return Math.min(100, totalScore);
  }

  /**
   * Generate human-readable scoring reason
   */
  getScoringReason(lead: Lead, score: number): string {
    const contact = lead.contact;
    const parts: string[] = [];

    if (score >= 80) {
      parts.push('Excellent fit');
    } else if (score >= 60) {
      parts.push('Good fit');
    } else if (score >= 40) {
      parts.push('Moderate fit');
    } else {
      parts.push('Low confidence');
    }

    // Add details
    if (contact.LinkedIn) parts.push('LinkedIn verified');
    if (contact.verified) parts.push('email verified');
    if (lead.enrichmentSources.length > 0) {
      parts.push(`enriched from ${lead.enrichmentSources.length} sources`);
    }
    if (lead.complianceApproved) parts.push('compliance approved');

    return parts.join(' • ');
  }

  // ==================== HELPERS ====================

  private isValidEmail(email: string): boolean {
    // RFC 5322 simplified
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private isValidPhone(phone: string): boolean {
    // Basic international phone validation
    const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  private verifyLinkedInURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return (
        urlObj.hostname.includes('linkedin.com') &&
        (url.includes('/in/') || url.includes('/company/'))
      );
    } catch {
      return false;
    }
  }

  private verifyGitHubURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('github.com') && url.includes('/');
    } catch {
      return false;
    }
  }

  private daysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export function createLeadScorer(criteria?: Partial<ScoringCriteria>): LeadScorer {
  return new LeadScorer(criteria);
}
