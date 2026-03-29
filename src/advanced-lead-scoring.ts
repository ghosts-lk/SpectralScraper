/**
 * Advanced Lead Quality Scoring System
 * Sophisticated scoring similar to Hunter.io and Apollo.io
 * Considers 20+ factors for accurate lead ranking
 */

import { Lead } from './types';

export interface LeadScoreBreakdown {
  contactQuality: number;       // Email + phone validity
  dataCompleteness: number;     // How many fields are filled
  companyData: number;          // Company information quality
  verification: number;         // SMTP + validation checks
  likelihood: number;           // How likely to be accurate
  recency: number;              // How fresh the data is
  profileStrength: number;      // Social proof + online presence
  enrichment: number;           // Enrichment level
  businessRisky: boolean;       // Business risk factors
  spamRisk: boolean;            // Spam/disposable indicators
  score: number;                // Final 0-100 score
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  recommendation: string;
}

export class AdvancedLeadScorer {
  /**
   * Score a lead comprehensively
   */
  scoreLeadComprehensive(lead: Lead): LeadScoreBreakdown {
    const breakdown: LeadScoreBreakdown = {
      contactQuality: this.scoreContactQuality(lead),
      dataCompleteness: this.scoreDataCompleteness(lead),
      companyData: this.scoreCompanyData(lead),
      verification: this.scoreVerification(lead),
      likelihood: this.scoreLikelihood(lead),
      recency: this.scoreRecency(lead),
      profileStrength: this.scoreProfileStrength(lead),
      enrichment: this.scoreEnrichment(lead),
      businessRisky: this.checkBusinessRisk(lead),
      spamRisk: this.checkSpamRisk(lead),
      score: 0,
      grade: 'F',
      recommendation: '',
    };

    // Calculate final score (weighted average)
    breakdown.score = Math.round(
      breakdown.contactQuality * 0.25 +
      breakdown.dataCompleteness * 0.15 +
      breakdown.companyData * 0.15 +
      breakdown.verification * 0.20 +
      breakdown.likelihood * 0.10 +
      breakdown.recency * 0.05 +
      breakdown.profileStrength * 0.05 +
      breakdown.enrichment * 0.05
    );

    // Adjust for risk factors
    if (breakdown.spamRisk) breakdown.score -= 30;
    if (breakdown.businessRisky) breakdown.score -= 15;

    breakdown.score = Math.max(0, Math.min(100, breakdown.score));
    breakdown.grade = this.getGrade(breakdown.score);
    breakdown.recommendation = this.getRecommendation(breakdown);

    return breakdown;
  }

  /**
   * Score email and phone quality (0-100)
   */
  private scoreContactQuality(lead: Lead): number {
    let score = 0;

    if (lead.email) {
      if (lead.verified) score += 50;
      else if (lead.confidence && lead.confidence > 0.8) score += 35;
      else if (lead.confidence && lead.confidence > 0.6) score += 20;
      else score += 10;
    }

    if (lead.phone) {
      // Phone verification status
      const phoneValid = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/.test(lead.phone);
      if (phoneValid) score += 25;
      else score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Score data completeness (0-100)
   */
  private scoreDataCompleteness(lead: Lead): number {
    const fields = [
      lead.name,
      lead.email,
      lead.phone,
      lead.title,
      lead.company,
      lead.location?.city || lead.location?.country,
      lead.website,
    ];

    const filledFields = fields.filter(f => f && String(f).trim().length > 0).length;
    return Math.round((filledFields / fields.length) * 100);
  }

  /**
   * Score company information (0-100)
   */
  private scoreCompanyData(lead: Lead): number {
    let score = 0;

    if (lead.company) score += 30;
    if (lead.industry) score += 25;
    if (lead.website) score += 20;
    if (lead.location?.country) score += 15;
    if (lead.location?.city) score += 10;

    return Math.min(100, score);
  }

  /**
   * Score verification level (0-100)
   */
  private scoreVerification(lead: Lead): number {
    if (lead.verified) return 100;
    if (lead.confidence !== undefined) return Math.round(lead.confidence * 100);

    // Check enrichment level
    const enrichmentScores: Record<string, number> = {
      complete: 95,
      enriched: 75,
      basic: 40,
    };

    return enrichmentScores[lead.enrichmentLevel || 'basic'] || 40;
  }

  /**
   * Score likelihood of accuracy (0-100)
   */
  private scoreLikelihood(lead: Lead): number {
    let score = 50;

    // Multiple source confirmation increases likelihood
    if (lead.sources && lead.sources.length > 1) score += 20;
    else if (lead.sources && lead.sources.length === 1) score += 10;

    // Professional title increases likelihood
    if (lead.title && this.isProfessionalTitle(lead.title)) score += 20;

    // Company website presence increases likelihood
    if (lead.website && lead.website.includes(lead.company || '')) score += 10;

    return Math.min(100, score);
  }

  /**
   * Score data recency (0-100)
   * Older data = lower score
   */
  private scoreRecency(lead: Lead): number {
    if (!lead.lastUpdated) return 50;

    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(lead.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceUpdate === 0) return 100;      // Updated today
    if (daysSinceUpdate <= 7) return 90;        // Last week
    if (daysSinceUpdate <= 30) return 75;       // Last month
    if (daysSinceUpdate <= 90) return 60;       // Last quarter
    if (daysSinceUpdate <= 180) return 45;      // Last 6 months
    return 20;                                   // Over 6 months old
  }

  /**
   * Score online profile strength (0-100)
   */
  private scoreProfileStrength(lead: Lead): number {
    let score = 0;

    const profiles = lead.socialProfiles || {};
    if (profiles.linkedin) score += 30;
    if (profiles.twitter) score += 20;
    if (profiles.github) score += 20;
    if (profiles.facebook) score += 10;

    // LinkedIn is stronger indicator
    if (profiles.linkedin) score += 20;

    return Math.min(100, score);
  }

  /**
   * Score enrichment level (0-100)
   */
  private scoreEnrichment(lead: Lead): number {
    const enrichmentScores: Record<string, number> = {
      complete: 100,
      enriched: 85,
      basic: 50,
    };

    return enrichmentScores[lead.enrichmentLevel || 'basic'] || 50;
  }

  /**
   * Check for business risk factors
   */
  private checkBusinessRisk(lead: Lead): boolean {
    // High-risk titles (often gatekeepers, not decision makers)
    const riskTitles = ['receptionist', 'assistant', 'secretary', 'hr', 'admin', 'intern'];
    if (lead.title) {
      const title = lead.title.toLowerCase();
      if (riskTitles.some(t => title.includes(t))) return true;
    }

    // Company size concerns
    if (lead.enrichmentLevel === 'basic' && !lead.company) return true;

    return false;
  }

  /**
   * Check for spam/disposable indicators
   */
  private checkSpamRisk(lead: Lead): boolean {
    if (!lead.email) return false;

    const disposableDomains = [
      'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
      'temp-mail.org', 'throwaway.email',
    ];

    const domain = lead.email.split('@')[1].toLowerCase();
    return disposableDomains.includes(domain);
  }

  /**
   * Convert numeric score to letter grade
   */
  private getGrade(score: number): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 45) return 'D';
    return 'F';
  }

  /**
   * Get actionable recommendation
   */
  private getRecommendation(breakdown: LeadScoreBreakdown): string {
    if (breakdown.score >= 90) {
      return 'Ready to contact - High quality lead';
    } else if (breakdown.score >= 75) {
      return 'Good quality - Minor enrichment recommended';
    } else if (breakdown.score >= 60) {
      return 'Moderate quality - Enrich before outreach';
    } else if (breakdown.score >= 45) {
      return 'Low quality - Requires enrichment/verification';
    } else {
      return 'Not recommended - Consider alternative sources';
    }
  }

  /**
   * Check if title is professional
   */
  private isProfessionalTitle(title: string): boolean {
    const professional = [
      'ceo', 'cfo', 'cto', 'founder', 'director', 'manager', 'vp', 'president',
      'engineer', 'developer', 'sales', 'marketing', 'operations',
    ];

    const titleLower = title.toLowerCase();
    return professional.some(p => titleLower.includes(p));
  }

  /**
   * Batch score multiple leads
   */
  scoreBatch(leads: Lead[]): Map<string, LeadScoreBreakdown> {
    const results = new Map<string, LeadScoreBreakdown>();

    leads.forEach(lead => {
      results.set(lead.id, this.scoreLeadComprehensive(lead));
    });

    return results;
  }

  /**
   * Get scoring statistics
   */
  getStats(leads: Lead[]): {
    averageScore: number;
    maxScore: number;
    minScore: number;
    gradeDistribution: Record<string, number>;
  } {
    const scores = leads.map(lead => this.scoreLeadComprehensive(lead));

    const gradeDistribution: Record<string, number> = {
      'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'F': 0,
    };

    scores.forEach(score => {
      gradeDistribution[score.grade]++;
    });

    return {
      averageScore: Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length),
      maxScore: Math.max(...scores.map(s => s.score)),
      minScore: Math.min(...scores.map(s => s.score)),
      gradeDistribution,
    };
  }
}

export default AdvancedLeadScorer;
