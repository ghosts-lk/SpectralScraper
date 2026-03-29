/**
 * Advanced Query Builder for Professional Lead Generation
 * Constructs optimized search queries for multiple data sources
 */

import { LeadFilters } from './professional-lead-scraper';

export interface QueryBuilderOptions {
  verbose?: boolean;
}

export class AdvancedQueryBuilder {
  private filters: LeadFilters;
  private options: QueryBuilderOptions;

  constructor(filters: LeadFilters, options: QueryBuilderOptions = {}) {
    this.filters = filters;
    this.options = options;
  }

  /**
   * Build Hunter.io domain search query
   */
  buildHunterQuery(): string[] {
    const domains: string[] = [];

    // Industry-based domains
    if (this.filters.industry && this.filters.industry.length > 0) {
      this.filters.industry.forEach(industry => {
        domains.push(`${industry.toLowerCase()}.com`);
        domains.push(`${industry.toLowerCase()}.io`);
      });
    }

    return Array.from(new Set(domains));
  }

  /**
   * Build Clearbit company search query
   */
  buildClearbitQuery(): string[] {
    const companies: string[] = [];

    // Industry companies
    if (this.filters.industry && this.filters.industry.length > 0) {
      const industryCompanies: Record<string, string[]> = {
        tech: ['google.com', 'microsoft.com', 'amazon.com', 'apple.com', 'meta.com', 'github.com'],
        finance: ['goldman.com', 'jpmorgan.com', 'bofa.com', 'citigroup.com', 'morningstar.com'],
        healthcare: ['pfizer.com', 'jnj.com', 'merck.com', 'abbvie.com', 'roche.com'],
        ecommerce: ['amazon.com', 'ebay.com', 'shopify.com', 'etsy.com', 'walmart.com'],
        saas: ['salesforce.com', 'adobe.com', 'oracle.com', 'sap.com', 'workday.com'],
      };

      this.filters.industry.forEach(industry => {
        const key = industry.toLowerCase();
        if (industryCompanies[key]) {
          companies.push(...industryCompanies[key]);
        }
      });
    }

    return Array.from(new Set(companies));
  }

  /**
   * Build Apollo.io search query
   */
  buildApolloQuery(): string[] {
    const queries: string[] = [];

    // Build complex query strings
    const parts: string[] = [];

    if (this.filters.industry && this.filters.industry.length > 0) {
      parts.push(`industry:${this.filters.industry.join(',')}`);
    }

    if (this.filters.location && this.filters.location.length > 0) {
      parts.push(`location:${this.filters.location.join(',')}`);
    }

    if (this.filters.jobTitle && this.filters.jobTitle.length > 0) {
      parts.push(`title:${this.filters.jobTitle.join(',')}`);
    }

    if (this.filters.companySize) {
      parts.push(`size:${this.filters.companySize}`);
    }

    if (this.filters.seniority) {
      parts.push(`seniority:${this.filters.seniority}`);
    }

    const query = parts.join(' ');
    if (query) queries.push(query);

    return queries.length > 0 ? queries : ['professionals'];
  }

  /**
   * Build Google search query
   */
  buildGoogleQuery(): string[] {
    const queries: string[] = [];

    // Build natural language queries
    let query = 'email';

    if (this.filters.jobTitle && this.filters.jobTitle.length > 0) {
      query += ` "${this.filters.jobTitle[0]}"`;
    }

    if (this.filters.industry && this.filters.industry.length > 0) {
      query += ` ${this.filters.industry[0]}`;
    }

    if (this.filters.location && this.filters.location.length > 0) {
      query += ` "${this.filters.location[0]}"`;
    }

    if (this.filters.companySize) {
      query += ` ${this.filters.companySize}`;
    }

    queries.push(query);

    // Build variations
    if (this.filters.jobTitle) {
      this.filters.jobTitle.forEach(title => {
        queries.push(`"${title}" contact information`);
      });
    }

    return queries;
  }

  /**
   * Build LinkedIn search query
   */
  buildLinkedInQuery(): string {
    const parts: string[] = [];

    if (this.filters.jobTitle && this.filters.jobTitle.length > 0) {
      parts.push(`title:"${this.filters.jobTitle[0]}"`);
    }

    if (this.filters.industry && this.filters.industry.length > 0) {
      parts.push(`industry:"${this.filters.industry[0]}"`);
    }

    if (this.filters.location && this.filters.location.length > 0) {
      parts.push(`location:"${this.filters.location[0]}"`);
    }

    if (this.filters.seniority) {
      parts.push(`seniority:"${this.filters.seniority}"`);
    }

    return parts.join(' AND ');
  }

  /**
   * Build email pattern matching query
   */
  buildEmailPatterns(): string[] {
    const patterns: string[] = [];

    // Common email patterns
    const emailFormats = [
      '{first}.{last}@',
      '{first}_{last}@',
      '{first}-{last}@',
      '{f}{last}@',
      '{first}.{l}@',
      '{first}@',
    ];

    emailFormats.forEach(format => {
      patterns.push(format);
    });

    return patterns;
  }

  /**
   * Get all queries for all sources
   */
  getAllQueries(): Record<string, string[]> {
    return {
      hunter: this.buildHunterQuery(),
      clearbit: this.buildClearbitQuery(),
      apollo: this.buildApolloQuery(),
      google: this.buildGoogleQuery(),
      linkedin: [this.buildLinkedInQuery()],
      emailPatterns: this.buildEmailPatterns(),
    };
  }

  /**
   * Get filter summary
   */
  getFilterSummary(): string {
    const summary: string[] = [];

    if (this.filters.location && this.filters.location.length > 0) {
      summary.push(`📍 Locations: ${this.filters.location.join(', ')}`);
    }

    if (this.filters.country && this.filters.country.length > 0) {
      summary.push(`🌍 Countries: ${this.filters.country.join(', ')}`);
    }

    if (this.filters.industry && this.filters.industry.length > 0) {
      summary.push(`🏢 Industries: ${this.filters.industry.join(', ')}`);
    }

    if (this.filters.jobTitle && this.filters.jobTitle.length > 0) {
      summary.push(`💼 Job Titles: ${this.filters.jobTitle.join(', ')}`);
    }

    if (this.filters.seniority) {
      summary.push(`📈 Seniority: ${this.filters.seniority}`);
    }

    if (this.filters.companySize) {
      summary.push(`🏭 Company Size: ${this.filters.companySize}`);
    }

    if (this.filters.employeeCount) {
      summary.push(
        `👥 Employee Count: ${this.filters.employeeCount.min}-${this.filters.employeeCount.max}`
      );
    }

    if (this.filters.revenue) {
      summary.push(
        `💰 Revenue: $${this.filters.revenue.min}M-$${this.filters.revenue.max}M`
      );
    }

    return summary.join('\n');
  }
}

export default AdvancedQueryBuilder;
