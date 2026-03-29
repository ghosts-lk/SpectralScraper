/**
 * Advanced Professional Lead Scraper
 * Multi-source lead generation with comprehensive filtering
 * Supports: Location, Industry, Company Size, Job Title, Seniority
 */

import axios from 'axios';
import * as fs from 'fs';
import { Lead } from './types';
import { getLogger } from './utils/logger';

const logger = getLogger('ProfessionalLeadScraper');

export interface LeadFilters {
  location?: string[];         // US, UK, CA, etc.
  country?: string[];          // Full country names
  industry?: string[];         // Tech, Finance, Healthcare, etc.
  companySize?: 'startup' | 'small' | 'medium' | 'enterprise';
  jobTitle?: string[];         // CEO, Developer, Manager, etc.
  seniority?: 'entry' | 'mid' | 'senior' | 'executive';
  revenue?: { min: number; max: number };
  employeeCount?: { min: number; max: number };
  foundedYear?: { min: number; max: number };
  excludeIndustries?: string[];
  excludeCompanies?: string[];
  verification?: 'strict' | 'moderate' | 'lenient';
}

export interface DataSource {
  name: string;
  type: 'api' | 'scrape' | 'database';
  url?: string;
  apiKey?: string;
  enabled: boolean;
  priority: number;
}

export class ProfessionalLeadScraper {
  private filters: LeadFilters;
  private sources: DataSource[];
  private leads: Map<string, Lead> = new Map();

  constructor(filters: LeadFilters = {}) {
    this.filters = {
      verification: 'moderate',
      ...filters,
    };
    
    this.sources = this.initializeSources();
  }

  /**
   * Initialize available data sources
   */
  private initializeSources(): DataSource[] {
    return [
      {
        name: 'Hunter.io',
        type: 'api',
        url: 'https://api.hunter.io/v2',
        apiKey: process.env.HUNTER_API_KEY,
        enabled: !!process.env.HUNTER_API_KEY,
        priority: 1,
      },
      {
        name: 'Clearbit',
        type: 'api',
        url: 'https://company-stream.clearbit.com',
        apiKey: process.env.CLEARBIT_API_KEY,
        enabled: !!process.env.CLEARBIT_API_KEY,
        priority: 2,
      },
      {
        name: 'Apollo.io',
        type: 'api',
        url: 'https://api.apollo.io/v1',
        apiKey: process.env.APOLLO_API_KEY,
        enabled: !!process.env.APOLLO_API_KEY,
        priority: 3,
      },
      {
        name: 'ReallySimpleCapital',
        type: 'scrape',
        url: 'https://reallysimplecapital.com',
        enabled: true,
        priority: 4,
      },
      {
        name: 'PublicRecords',
        type: 'database',
        enabled: true,
        priority: 5,
      },
    ];
  }

  /**
   * Scrape from Hunter.io
   */
  private async scrapeHunterIO(domain: string): Promise<Lead[]> {
    const leads: Lead[] = [];

    try {
      if (!this.sources.find(s => s.name === 'Hunter.io')?.apiKey) {
        logger.warn('Hunter.io API key not configured');
        return leads;
      }

      const response = await axios.get(`${this.sources[0].url}/domain-search`, {
        params: {
          domain,
          api_key: this.sources[0].apiKey,
        },
      });

      const { data } = response.data;

      data.emails.forEach((email: any) => {
        if (this.matchesFilters(email)) {
          leads.push(this.normalizeHunterLead(email));
        }
      });
    } catch (error) {
      logger.error(`Hunter.io scrape failed for ${domain}:`, error);
    }

    return leads;
  }

  /**
   * Scrape from Clearbit
   */
  private async scrapeClearbit(company: string): Promise<Lead[]> {
    const leads: Lead[] = [];

    try {
      if (!this.sources.find(s => s.name === 'Clearbit')?.apiKey) {
        logger.warn('Clearbit API key not configured');
        return leads;
      }

      const response = await axios.get(`${this.sources[1].url}?domain=${company}`, {
        headers: {
          Authorization: `Bearer ${this.sources[1].apiKey}`,
        },
      });

      if (response.data?.people) {
        response.data.people.forEach((person: any) => {
          if (this.matchesFilters(person)) {
            leads.push(this.normalizeClearbitLead(person));
          }
        });
      }
    } catch (error) {
      logger.error(`Clearbit scrape failed for ${company}:`, error);
    }

    return leads;
  }

  /**
   * Scrape from Apollo.io
   */
  private async scrapeApollo(query: string): Promise<Lead[]> {
    const leads: Lead[] = [];

    try {
      const source = this.sources.find(s => s.name === 'Apollo.io');
      if (!source?.apiKey) {
        logger.warn('Apollo.io API key not configured');
        return leads;
      }

      const response = await axios.post(
        `${source.url}/people/search`,
        {
          q_organization_name: query,
          finder_only: true,
        },
        {
          headers: {
            'X-Api-Key': source.apiKey,
          },
        }
      );

      if (response.data?.people) {
        response.data.people.forEach((person: any) => {
          if (this.matchesFilters(person)) {
            leads.push(this.normalizeApolloLead(person));
          }
        });
      }
    } catch (error) {
      logger.error(`Apollo.io scrape failed for ${query}:`, error);
    }

    return leads;
  }

  /**
   * Check if lead matches all filters
   */
  private matchesFilters(lead: any): boolean {
    // Location filtering
    if (this.filters.location && this.filters.location.length > 0) {
      const leadLocation = lead.location || lead.state || lead.country || '';
      const matches = this.filters.location.some(loc =>
        leadLocation.toLowerCase().includes(loc.toLowerCase())
      );
      if (!matches) return false;
    }

    // Industry filtering
    if (this.filters.industry && this.filters.industry.length > 0) {
      const leadIndustry = lead.industry || lead.sector || '';
      const matches = this.filters.industry.some(ind =>
        leadIndustry.toLowerCase().includes(ind.toLowerCase())
      );
      if (!matches) return false;
    }

    // Job title filtering
    if (this.filters.jobTitle && this.filters.jobTitle.length > 0) {
      const leadTitle = lead.title || lead.job_title || '';
      const matches = this.filters.jobTitle.some(title =>
        leadTitle.toLowerCase().includes(title.toLowerCase())
      );
      if (!matches) return false;
    }

    // Seniority filtering
    if (this.filters.seniority) {
      const leadSeniority = this.calculateSeniority(lead.title || '');
      if (leadSeniority !== this.filters.seniority) return false;
    }

    // Company size filtering
    if (this.filters.companySize) {
      const employeeCount = lead.employee_count || 0;
      const sizes: Record<string, { min: number; max: number }> = {
        startup: { min: 1, max: 50 },
        small: { min: 51, max: 250 },
        medium: { min: 251, max: 1000 },
        enterprise: { min: 1001, max: Infinity },
      };

      const sizeRange = sizes[this.filters.companySize];
      if (employeeCount < sizeRange.min || employeeCount > sizeRange.max) {
        return false;
      }
    }

    // Revenue filtering
    if (this.filters.revenue) {
      const revenue = lead.annual_revenue || 0;
      if (revenue < this.filters.revenue.min || revenue > this.filters.revenue.max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate seniority level from job title
   */
  private calculateSeniority(title: string): 'entry' | 'mid' | 'senior' | 'executive' {
    const titleLower = title.toLowerCase();

    if (titleLower.includes('ceo') || titleLower.includes('cfo') || 
        titleLower.includes('cto') || titleLower.includes('founder') ||
        titleLower.includes('president') || titleLower.includes('vp ') ||
        titleLower.includes('vice president') || titleLower.includes('director')) {
      return 'executive';
    }

    if (titleLower.includes('senior') || titleLower.includes('lead') ||
        titleLower.includes('principle') || titleLower.includes('manager')) {
      return 'senior';
    }

    if (titleLower.includes('junior') || titleLower.includes('associate') ||
        titleLower.includes('coordinator') || titleLower.includes('assistant')) {
      return 'entry';
    }

    return 'mid';
  }

  /**
   * Normalize Hunter.io lead data
   */
  private normalizeHunterLead(data: any): Lead {
    return {
      id: `hunter-${Date.now()}-${Math.random()}`,
      name: data.first_name ? `${data.first_name} ${data.last_name}` : 'Unknown',
      email: data.value,
      phone: data.phone,
      title: data.position,
      company: data.company_domain,
      website: `www.${data.company_domain}`,
      score: Math.min(100, (data.confidence || 0) * 100),
      sources: ['hunter_io'],
      enrichmentLevel: 'enriched',
      confidence: data.confidence || 0.8,
      lastUpdated: new Date(),
      verified: data.confidence > 0.85,
    };
  }

  /**
   * Normalize Clearbit lead data
   */
  private normalizeClearbitLead(data: any): Lead {
    return {
      id: `clearbit-${Date.now()}-${Math.random()}`,
      name: data.name?.fullName || 'Unknown',
      email: data.email,
      phone: data.phone,
      title: data.employment?.title,
      company: data.employment?.name,
      location: {
        city: data.location?.city,
        country: data.location?.country,
      },
      website: data.employment?.domain,
      socialProfiles: {
        linkedin: data.linkedin?.handle,
        twitter: data.twitter?.handle,
        github: data.github?.handle,
      },
      score: 85,
      sources: ['clearbit'],
      enrichmentLevel: 'complete',
      confidence: 0.92,
      lastUpdated: new Date(),
      verified: true,
    };
  }

  /**
   * Normalize Apollo.io lead data
   */
  private normalizeApolloLead(data: any): Lead {
    return {
      id: `apollo-${data.id || Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone_number,
      title: data.job_title,
      company: data.organization?.name,
      location: {
        city: data.city,
        state: data.state,
        country: data.country,
      },
      website: data.organization?.website_url,
      socialProfiles: {
        linkedin: data.linkedin_url,
        twitter: data.twitter_url,
      },
      industry: data.organization?.industry,
      score: 80,
      sources: ['apollo_io'],
      enrichmentLevel: 'enriched',
      confidence: 0.85,
      lastUpdated: new Date(),
      verified: true,
    };
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  /**
   * Validate phone number
   */
  private validatePhone(phone: string): boolean {
    // Simple validation - can be enhanced
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * Main scraping method
   */
  async scrape(
    domains: string[] = [],
    companies: string[] = [],
    queries: string[] = []
  ): Promise<Lead[]> {
    const startTime = Date.now();
    logger.info(`🔍 Starting professional lead scrape with filters:`, this.filters);

    // Scrape from all sources
    const promises: Promise<Lead[]>[] = [];

    // Hunter.io scraping
    domains.forEach(domain => {
      promises.push(this.scrapeHunterIO(domain));
    });

    // Clearbit scraping
    companies.forEach(company => {
      promises.push(this.scrapeClearbit(company));
    });

    // Apollo.io scraping
    queries.forEach(query => {
      promises.push(this.scrapeApollo(query));
    });

    // Wait for all sources
    const results = await Promise.allSettled(promises);

    // Deduplicate
    const allLeads: Lead[] = [];
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allLeads.push(...result.value);
      }
    });

    const deduped = this.deduplicateLeads(allLeads);
    const duration = Date.now() - startTime;

    logger.info(`✅ Scraping complete: ${deduped.length} unique leads in ${duration}ms`);

    return deduped;
  }

  /**
   * Deduplicate leads by email and phone
   */
  private deduplicateLeads(leads: Lead[]): Lead[] {
    const seen = new Set<string>();
    const unique: Lead[] = [];

    leads.forEach(lead => {
      let key = '';
      if (lead.email && this.validateEmail(lead.email)) {
        key = lead.email.toLowerCase();
      } else if (lead.phone && this.validatePhone(lead.phone)) {
        key = lead.phone.replace(/\D/g, '');
      }

      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(lead);
      }
    });

    return unique;
  }

  /**
   * Export to CSV
   */
  async exportCSV(leads: Lead[], filename: string = 'leads.csv'): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filepath = `${filename.replace('.csv', '')}_${timestamp}.csv`;

    const headers = [
      'ID', 'Name', 'Email', 'Phone', 'Title', 'Company',
      'Industry', 'Website', 'City', 'Country', 'LinkedIn',
      'Twitter', 'GitHub', 'Verified', 'Score', 'Confidence',
      'Sources', 'LastUpdated'
    ];

    let csv = headers.map(h => `"${h}"`).join(',') + '\n';

    leads.forEach(lead => {
      const row = [
        lead.id,
        lead.name,
        lead.email || '',
        lead.phone || '',
        lead.title || '',
        lead.company || '',
        lead.industry || '',
        lead.website || '',
        lead.location?.city || '',
        lead.location?.country || '',
        lead.socialProfiles?.linkedin || '',
        lead.socialProfiles?.twitter || '',
        lead.socialProfiles?.github || '',
        lead.verified ? 'Yes' : 'No',
        lead.score,
        (lead.confidence * 100).toFixed(1),
        lead.sources.join('; '),
        new Date(lead.lastUpdated).toISOString(),
      ];

      csv += row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n';
    });

    fs.writeFileSync(filepath, csv, 'utf-8');
    return filepath;
  }

  /**
   * Get available data sources status
   */
  getSourcesStatus(): DataSource[] {
    return this.sources;
  }

  /**
   * Set API credentials
   */
  setApiCredential(source: string, key: string): void {
    const sourceObj = this.sources.find(s => s.name === source);
    if (sourceObj) {
      sourceObj.apiKey = key;
      sourceObj.enabled = true;
    }
  }
}

export default ProfessionalLeadScraper;
