/**
 * GitHub Scraper - Extracts developer/technical leads from GitHub
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

import axios from 'axios';
import { Logger } from 'winston';
import { LeadQuery, ScraperResult, ScraperSource, Lead } from '../types/index';

export class GitHubScraper {
  private readonly userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  private lastRequestTime = 0;

  constructor(
    private source: ScraperSource,
    private logger: Logger,
    private config?: { rateLimit?: number; timeout?: number; githubToken?: string }
  ) {}

  /**
   * Search GitHub users by criteria
   */
  async searchGitHubUsers(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      // Build search query
      // Search for developers/founders with activity
      const searchQuery = `${query.title || 'founder'} location:${query.location || 'worldwide'} followers:>10`;

      const url = 'https://api.github.com/search/users';
      const params = {
        q: searchQuery,
        sort: 'followers',
        order: 'desc',
        per_page: 100,
      };

      await this.rateLimitWait();
      const response = await axios.get(url, {
        params,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/vnd.github.v3+json',
          ...(this.config?.githubToken && {
            'Authorization': `token ${this.config.githubToken}`,
          }),
        },
        timeout: this.config?.timeout || 15000,
      });

      const results = response.data.items || [];

      // Extract user profiles
      for (const user of results.slice(0, query.limit || 50)) {
        const userData = await this.getUserProfile(user.login);
        
        if (userData) {
          leads.push({
            id: `github-${user.login}`,
            name: userData.name || user.login,
            email: userData.email || this.generateEmailFromUsername(user.login),
            title: this.extractTitleFromBio(userData.bio),
            company: userData.company || 'Independent',
            location: userData.location || query.location,
            industry: 'Technology',
            phone: undefined,
            verified: !!userData.email,
            source: ScraperSource.GITHUB,
            score: userData.email ? 80 : 65,
            metadata: {
              github: `https://github.com/${user.login}`,
              repos: userData.public_repos,
              followers: userData.followers,
              bio: userData.bio,
            },
          } as any);
        }
      }

      this.logger.info(`Scraped ${leads.length} leads from GitHub`);
    } catch (error) {
      this.logger.error('Failed to scrape GitHub users:', error);
    }

    return leads;
  }

  /**
   * Get GitHub user profile
   */
  private async getUserProfile(username: string): Promise<any> {
    try {
      await this.rateLimitWait();
      const response = await axios.get(`https://api.github.com/users/${username}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/vnd.github.v3+json',
          ...(this.config?.githubToken && {
            'Authorization': `token ${this.config.githubToken}`,
          }),
        },
        timeout: this.config?.timeout || 10000,
      });

      return response.data;
    } catch (error) {
      this.logger.debug(`Failed to fetch GitHub profile for ${username}`);
      return null;
    }
  }

  /**
   * Extract title from bio
   */
  private extractTitleFromBio(bio: string): string {
    if (!bio) return 'Developer';

    // Look for title indicators
    const patterns = [
      /(?:CEO|CTO|COO|CFO|Founder|Co-Founder|Developer|Engineer|Architect|Lead)/i,
    ];

    for (const pattern of patterns) {
      const match = bio.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return 'Developer';
  }

  /**
   * Generate email from GitHub username
   */
  private generateEmailFromUsername(username: string): string {
    // Common patterns for dev emails
    const domains = [
      'gmail.com',
      'outlook.com',
      'yahoo.com',
      'protonmail.com',
    ];

    return `${username}@${domains[0]}`;
  }

  /**
   * Search GitHub organizations
   */
  async searchGitHubOrgs(query: LeadQuery): Promise<Lead[]> {
    const leads: Lead[] = [];
    try {
      const searchQuery = `${query.industry || 'technology'} location:${query.location || 'worldwide'} followers:>100`;

      const url = 'https://api.github.com/search/repositories';
      const params = {
        q: searchQuery,
        sort: 'stars',
        order: 'desc',
        per_page: 50,
      };

      await this.rateLimitWait();
      const response = await axios.get(url, {
        params,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/vnd.github.v3+json',
          ...(this.config?.githubToken && {
            'Authorization': `token ${this.config.githubToken}`,
          }),
        },
        timeout: this.config?.timeout || 15000,
      });

      const repos = response.data.items || [];

      // Extract organization info from repos
      for (const repo of repos) {
        if (repo.owner && repo.owner.type === 'Organization') {
          const orgData = await this.getOrgProfile(repo.owner.login);
          
          if (orgData) {
            leads.push({
              id: `github-org-${repo.owner.login}`,
              name: orgData.name || repo.owner.login,
              email: orgData.email || this.generateDomainEmail(repo.owner.login),
              title: 'CTO',
              company: orgData.name || repo.owner.login,
              location: orgData.location || query.location,
              industry: query.industry || 'Technology',
              verified: !!orgData.email,
              source: ScraperSource.GITHUB,
              score: orgData.email ? 82 : 70,
              metadata: {
                github: `https://github.com/${repo.owner.login}`,
                repos: orgData.public_repos,
                followers: orgData.followers,
              },
            } as any);
          }
        }
      }

      this.logger.info(`Scraped ${leads.length} leads from GitHub organizations`);
    } catch (error) {
      this.logger.error('Failed to scrape GitHub organizations:', error);
    }

    return leads;
  }

  /**
   * Get GitHub organization profile
   */
  private async getOrgProfile(orgName: string): Promise<any> {
    try {
      await this.rateLimitWait();
      const response = await axios.get(`https://api.github.com/orgs/${orgName}`, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/vnd.github.v3+json',
          ...(this.config?.githubToken && {
            'Authorization': `token ${this.config.githubToken}`,
          }),
        },
        timeout: this.config?.timeout || 10000,
      });

      return response.data;
    } catch (error) {
      this.logger.debug(`Failed to fetch GitHub org profile for ${orgName}`);
      return null;
    }
  }

  /**
   * Generate email from organization name
   */
  private generateDomainEmail(orgName: string): string {
    const domain = orgName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
    return `contact@${domain}`;
  }

  /**
   * Rate limiting
   */
  private async rateLimitWait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    const delay = this.config?.rateLimit || 1000; // GitHub is strict with rate limits

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
      // Scrape GitHub users
      const userLeads = await this.searchGitHubUsers(query);
      leads.push(...userLeads);

      // Scrape GitHub organizations
      const orgLeads = await this.searchGitHubOrgs(query);
      leads.push(...orgLeads);

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
