/**
 * Lead Scoring Engine
 * 
 * Intelligent scoring system for lead quality assessment
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import { Lead } from '../types/index.js';

const DEFAULT_WEIGHTS = {
  email: 20,
  phone: 15,
  title: 20,
  company: 15,
  linkedin: 15,
  github: 10,
  dataFreshness: 5,
};

export class LeadScorer {
  private weights: typeof DEFAULT_WEIGHTS;

  constructor(weights?: Partial<typeof DEFAULT_WEIGHTS>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Score a lead based on completeness and quality
   */
  score(lead: Partial<Lead>): number {
    let score = 0;

    if (lead.email && this.isValidEmail(lead.email)) {
      score += this.weights.email;
    }

    if (lead.phone && this.isValidPhone(lead.phone)) {
      score += this.weights.phone;
    }

    if (lead.title && lead.title.length > 2) {
      score += this.weights.title;
    }

    if (lead.company && lead.company.length > 2) {
      score += this.weights.company;
    }

    if (lead.socialProfiles?.linkedin && this.verifyLinkedInURL(lead.socialProfiles.linkedin)) {
      score += this.weights.linkedin;
    }

    if (lead.socialProfiles?.github && this.verifyGitHubURL(lead.socialProfiles.github)) {
      score += this.weights.github;
    }

    // Data freshness bonus
    if (lead.lastUpdated && this.daysSince(lead.lastUpdated) < 7) {
      score += this.weights.dataFreshness;
    }

    // Apply confidence multiplier
    const confidenceMultiplier = (lead.confidence || 50) / 100;
    const adjustedScore = Math.round(score * confidenceMultiplier);

    return Math.min(100, adjustedScore);
  }

  /**
   * Get scoring reason for transparency
   */
  getReason(lead: Partial<Lead>): string {
    const score = this.score(lead);
    const parts: string[] = [];

    if (score >= 80) parts.push('Excellent fit');
    else if (score >= 60) parts.push('Good fit');
    else if (score >= 40) parts.push('Moderate fit');
    else parts.push('Low confidence');

    if (lead.socialProfiles?.linkedin) parts.push('LinkedIn verified');
    if (lead.verified) parts.push('email verified');
    if (lead.enrichmentLevel === 'complete') parts.push('fully enriched');

    return parts.join(' • ');
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)\.]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  private verifyLinkedInURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('linkedin.com');
    } catch {
      return false;
    }
  }

  private verifyGitHubURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('github.com');
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

export function createLeadScorer(weights?: Partial<typeof DEFAULT_WEIGHTS>): LeadScorer {
  return new LeadScorer(weights);
}
