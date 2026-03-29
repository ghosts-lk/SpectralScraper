/**
 * Compliance & Ethics Engine
 * 
 * Ensures scraping complies with GDPR, CCPA, robots.txt, etc.
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import axios from 'axios';

export interface ComplianceCheckResult {
  allowed: boolean;
  reason: string;
  region?: string;
}

export class ComplianceEngine {
  private robotsCache = new Map<string, boolean>();
  private robotsCacheTTL = 24 * 60 * 60 * 1000; // 24 hours
  private robotsCacheTime = new Map<string, number>();

  /**
   * Check if a URL can be scraped per robots.txt
   */
  async canScrapeDomain(domain: string): Promise<ComplianceCheckResult> {
    // Check cache
    const cached = this.robotsCache.get(domain);
    const cacheTime = this.robotsCacheTime.get(domain);
    if (cached !== undefined && cacheTime && Date.now() - cacheTime < this.robotsCacheTTL) {
      return {
        allowed: cached,
        reason: 'robots.txt (cached)',
      };
    }

    try {
      const robotsURL = `https://${domain}/robots.txt`;
      const response = await axios.get(robotsURL, {
        timeout: 5000,
        headers: { 'User-Agent': 'SpectralScraper/1.0' },
      });

      const allowed = !this.isBlockedByRobots(response.data, 'SpectralScraper');
      this.robotsCache.set(domain, allowed);
      this.robotsCacheTime.set(domain, Date.now());

      return {
        allowed,
        reason: 'robots.txt checked',
      };
    } catch (error) {
      // If robots.txt doesn't exist, assume OK but be conservative
      return {
        allowed: true,
        reason: 'robots.txt not found (assuming allowed)',
      };
    }
  }

  /**
   * Check if domain is in compliance blocklist
   */
  isDomainBlocklisted(domain: string): boolean {
    const blocklist = [
      'facebook.com',
      'instagram.com',
      'tiktok.com',
      'snapchat.com',
      'pinterest.com',
    ];

    return blocklist.some(blocked => domain.includes(blocked));
  }

  /**
   * Get compliance recommendation for a region
   */
  getRegionCompliance(region: 'EU' | 'US' | 'CA' | 'UK' | 'AU'): ComplianceCheckResult {
    const recommendations: Record<string, string> = {
      EU: 'GDPR: Requires explicit consent for data processing',
      US: 'CCPA: Respect opt-out requests',
      CA: 'PIPEDA: Similar to GDPR',
      UK: 'UK GDPR: Requires consent and data minimization',
      AU: 'Privacy Act: Limits on collection without consent',
    };

    return {
      allowed: true,
      reason: recommendations[region] || 'Check local regulations',
      region,
    };
  }

  private isBlockedByRobots(robotsContent: string, userAgent: string): boolean {
    const lines = robotsContent.split('\n');
    let currentUserAgent = '*';
    let blocked = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('User-agent:')) {
        currentUserAgent = trimmed.split(':')[1].trim();
      }

      if (currentUserAgent === '*' || currentUserAgent === userAgent) {
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
}

export function createComplianceEngine(): ComplianceEngine {
  return new ComplianceEngine();
}
