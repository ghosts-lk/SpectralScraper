#!/usr/bin/env node

/**
 * LinkedIn Lead Test Script
 * Scrapes employees from various companies and runs through verification/scoring pipeline
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { VerificationService } from './verification-service';
import AdvancedLeadScorer from './advanced-lead-scoring';
import { Lead } from './types';
import { getLogger } from './utils/logger';

const logger = getLogger('LinkedInTest');

// Target companies for testing
const TARGET_COMPANIES = [
  { name: 'Google', linkedinUrl: 'https://www.linkedin.com/company/google/' },
  { name: 'Microsoft', linkedinUrl: 'https://www.linkedin.com/company/microsoft/' },
  { name: 'Apple', linkedinUrl: 'https://www.linkedin.com/company/apple/' },
  { name: 'Meta', linkedinUrl: 'https://www.linkedin.com/company/meta/' },
  { name: 'Amazon', linkedinUrl: 'https://www.linkedin.com/company/amazon/' },
  { name: 'Tesla', linkedinUrl: 'https://www.linkedin.com/company/tesla-motors/' },
  { name: 'OpenAI', linkedinUrl: 'https://www.linkedin.com/company/openai/' },
  { name: 'Stripe', linkedinUrl: 'https://www.linkedin.com/company/stripe/' },
  { name: 'GitHub', linkedinUrl: 'https://www.linkedin.com/company/github/' },
  { name: 'Figma', linkedinUrl: 'https://www.linkedin.com/company/figma/' },
];

// Job titles to search for (decision makers, founders, etc)
const TARGET_TITLES = [
  'CEO', 'CTO', 'CFO',
  'Founder', 'Co-founder',
  'VP Engineering', 'VP Product', 'VP Sales',
  'Director',
  'Head of',
];

class LinkedInLeadScraper {
  private verifier: VerificationService;
  private scorer: AdvancedLeadScorer;
  private extractedLeads: Lead[] = [];

  constructor() {
    this.verifier = new VerificationService();
    this.scorer = new AdvancedLeadScorer();
  }

  /**
   * Mock LinkedIn data extraction
   * In production, this would use LinkedIn API or authenticated scraping
   */
  async extractLeadsFromCompany(
    company: typeof TARGET_COMPANIES[0]
  ): Promise<Lead[]> {
    logger.info(`🔍 Extracting leads from ${company.name}...`);

    // Generate realistic test data based on company
    const leads: Lead[] = [];
    const departments = ['Engineering', 'Product', 'Sales', 'Business', 'Operations'];
    const titles = [
      'Senior Engineer',
      'Staff Engineer',
      'Engineering Manager',
      'Product Manager',
      'Sales Director',
      'VP Sales',
      'CEO',
      'CTO',
    ];

    // Generate 5-15 leads per company
    const leadCount = Math.floor(Math.random() * 11) + 5;

    for (let i = 0; i < leadCount; i++) {
      const firstName = this.generateFirstName();
      const lastName = this.generateLastName();
      const title = titles[Math.floor(Math.random() * titles.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];

      const lead: Lead = {
        id: `${company.name.toLowerCase()}-${i}`,
        name: `${firstName} ${lastName}`,
        email: this.generateEmail(firstName, lastName, company.name),
        phone: this.generatePhoneNumber(),
        title,
        company: company.name,
        industry: this.getIndustryForCompany(company.name),
        website: this.getWebsiteForCompany(company.name),
        location: {
          city: this.getHQCity(company.name),
          country: 'United States',
          state: this.getHQState(company.name),
        },
        socialProfiles: {
          linkedin: `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
          twitter: `https://twitter.com/${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
        },
        sources: ['linkedin', 'company-website'],
        enrichmentLevel: 'enriched',
        confidence: 0.75,
        verified: false,
        lastUpdated: new Date(),
        score: 0,
        tags: [department, title.toLowerCase()],
        metadata: {
          linkedinProfileUrl: `https://www.linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
          scrapedAt: new Date().toISOString(),
          companySize: this.getCompanySize(company.name),
          employeeCount: this.getEmployeeCount(company.name),
          revenue: this.getEstimatedRevenue(company.name),
        },
      };

      leads.push(lead);
    }

    logger.info(`✓ Extracted ${leads.length} leads from ${company.name}`);
    return leads;
  }

  /**
   * Verify all leads (email + phone)
   */
  async verifyLeads(leads: Lead[]): Promise<Lead[]> {
    logger.info(`\n📧 Verifying ${leads.length} emails and phone numbers...`);

    const verifiedLeads = await Promise.all(
      leads.map(async lead => {
        try {
          const result = await this.verifier.verify({
            email: lead.email,
            phone: lead.phone,
          });

          lead.verified = result.email?.verified || false;
          lead.confidence = result.email?.confidence || 0;

          return lead;
        } catch (error) {
          logger.warn(`Failed to verify ${lead.email}: ${error}`);
          return lead;
        }
      })
    );

    const verifiedCount = verifiedLeads.filter(l => l.verified).length;
    logger.info(`✓ Verification complete: ${verifiedCount}/${leads.length} verified`);

    return verifiedLeads;
  }

  /**
   * Score all leads
   */
  scoreLeads(leads: Lead[]): Lead[] {
    logger.info(`\n🎯 Scoring ${leads.length} leads...`);

    const scoredLeads = leads.map(lead => {
      const scoring = this.scorer.scoreLeadComprehensive(lead);
      lead.score = scoring.score;
      return lead;
    });

    const stats = this.scorer.getStats(leads);
    logger.info(`✓ Scoring complete:`);
    logger.info(`   Average Score: ${stats.averageScore}/100`);
    logger.info(`   Grade Distribution: A+:${stats.gradeDistribution['A+']} A:${stats.gradeDistribution['A']} B:${stats.gradeDistribution['B']} C:${stats.gradeDistribution['C']} D:${stats.gradeDistribution['D']} F:${stats.gradeDistribution['F']}`);

    return scoredLeads;
  }

  /**
   * Run complete test pipeline
   */
  async runTest(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   SpectralScraper - LinkedIn Lead Extraction & Scoring Test  ║');
    console.log('║                                                              ║');
    console.log('║  Testing verification, scoring, and lead enrichment pipeline ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    let allLeads: Lead[] = [];

    // Extract from each company
    for (const company of TARGET_COMPANIES) {
      try {
        const leads = await this.extractLeadsFromCompany(company);
        allLeads = [...allLeads, ...leads];
      } catch (error) {
        logger.error(`Error extracting from ${company.name}: ${error}`);
      }
    }

    logger.info(`\n📊 Total Leads Extracted: ${allLeads.length}`);

    // Verify leads
    allLeads = await this.verifyLeads(allLeads);

    // Score leads
    allLeads = this.scoreLeads(allLeads);

    // Display results
    this.displayResults(allLeads);

    // Export CSV
    this.exportToCSV(allLeads);
  }

  /**
   * Display formatted results
   */
  private displayResults(leads: Lead[]): void {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TOP QUALITY LEADS (A+ & A)                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const topLeads = leads
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 15);

    topLeads.forEach((lead, idx) => {
      const score = lead.score || 0;
      const grade = score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B' : 'C';
      const verified = lead.verified ? '✓' : '✗';

      console.log(`${idx + 1}. ${lead.name.padEnd(25)} [${grade}] Score: ${String(score).padStart(3)}/100`);
      console.log(`   Email: ${lead.email} (${verified})`);
      console.log(`   Title: ${lead.title} at ${lead.company}`);
      console.log(`   Location: ${lead.location?.city}, ${lead.location?.state}`);
      console.log('');
    });

    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                       SUMMARY STATISTICS                     ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const verified = leads.filter(l => l.verified).length;
    const averageScore = Math.round(leads.reduce((sum, l) => sum + (l.score || 0), 0) / leads.length);
    const byCompany = leads.reduce(
      (acc, l) => {
        acc[l.company || 'Unknown'] = (acc[l.company || 'Unknown'] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log(`Total Leads Processed:    ${leads.length}`);
    console.log(`Verified Emails:          ${verified}/${leads.length} (${((verified / leads.length) * 100).toFixed(1)}%)`);
    console.log(`Average Score:            ${averageScore}/100`);
    console.log('');
    console.log('Leads by Company:');
    Object.entries(byCompany)
      .sort((a, b) => b[1] - a[1])
      .forEach(([company, count]) => {
        console.log(`  ${company.padEnd(20)} ${count} leads`);
      });

    console.log('');
    console.log('Lead Grade Distribution:');
    const grades = leads.reduce(
      (acc, l) => {
        const score = l.score || 0;
        const grade = score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'F';
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    (['A+', 'A', 'B', 'C', 'D', 'F'] as const).forEach(grade => {
      const count = grades[grade] || 0;
      const pct = ((count / leads.length) * 100).toFixed(1);
      console.log(`  ${grade}: ${count} leads (${pct}%)`);
    });
  }

  /**
   * Export to CSV
   */
  private exportToCSV(leads: Lead[]): void {
    const filename = `linkedin-test-results-${Date.now()}.csv`;

    const csv = [
      ['Name', 'Email', 'Phone', 'Title', 'Company', 'City', 'State', 'Verified', 'Score', 'LinkedIn URL'].join(','),
      ...leads.map(lead =>
        [
          `"${lead.name}"`,
          lead.email,
          lead.phone || '',
          `"${lead.title}"`,
          `"${lead.company}"`,
          lead.location?.city || '',
          lead.location?.state || '',
          lead.verified ? 'Yes' : 'No',
          lead.score || 0,
          lead.socialProfiles?.linkedin || '',
        ].join(',')
      ),
    ].join('\n');

    import('fs').then(fs => {
      fs.writeFileSync(filename, csv);
      logger.info(`\n📥 Results exported to ${filename}`);
    });
  }

  // Helper methods
  private generateFirstName(): string {
    const names = [
      'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Lisa',
      'Robert', 'Maria', 'William', 'Jennifer', 'Richard', 'Patricia', 'Joseph', 'Barbara',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private generateLastName(): string {
    const names = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
      'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private generateEmail(firstName: string, lastName: string, company: string): string {
    const formats = [
      `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase()}.com`,
      `${firstName.charAt(0).toLowerCase()}${lastName.toLowerCase()}@${company.toLowerCase()}.com`,
      `${firstName.toLowerCase()}@${company.toLowerCase()}.com`,
    ];
    return formats[Math.floor(Math.random() * formats.length)];
  }

  private generatePhoneNumber(): string {
    const areaCode = String(Math.floor(Math.random() * 900) + 200).padStart(3, '0');
    const exchange = String(Math.floor(Math.random() * 900) + 200).padStart(3, '0');
    const subscriber = String(Math.floor(Math.random() * 9000) + 1000);
    return `+1-${areaCode}-${exchange}-${subscriber}`;
  }

  private getIndustryForCompany(company: string): string {
    const industries: Record<string, string> = {
      'Google': 'Technology',
      'Microsoft': 'Software',
      'Apple': 'Consumer Electronics',
      'Meta': 'Social Media',
      'Amazon': 'Cloud Computing',
      'Tesla': 'Automotive',
      'OpenAI': 'AI/ML',
      'Stripe': 'FinTech',
      'GitHub': 'DevTools',
      'Figma': 'Design Tools',
    };
    return industries[company] || 'Technology';
  }

  private getWebsiteForCompany(company: string): string {
    const websites: Record<string, string> = {
      'Google': 'google.com',
      'Microsoft': 'microsoft.com',
      'Apple': 'apple.com',
      'Meta': 'meta.com',
      'Amazon': 'amazon.com',
      'Tesla': 'tesla.com',
      'OpenAI': 'openai.com',
      'Stripe': 'stripe.com',
      'GitHub': 'github.com',
      'Figma': 'figma.com',
    };
    return websites[company] || `${company.toLowerCase()}.com`;
  }

  private getHQCity(company: string): string {
    const cities: Record<string, string> = {
      'Google': 'Mountain View',
      'Microsoft': 'Redmond',
      'Apple': 'Cupertino',
      'Meta': 'Menlo Park',
      'Amazon': 'Seattle',
      'Tesla': 'Austin',
      'OpenAI': 'San Francisco',
      'Stripe': 'San Francisco',
      'GitHub': 'San Francisco',
      'Figma': 'San Francisco',
    };
    return cities[company] || 'San Francisco';
  }

  private getHQState(company: string): string {
    const states: Record<string, string> = {
      'Google': 'CA',
      'Microsoft': 'WA',
      'Apple': 'CA',
      'Meta': 'CA',
      'Amazon': 'WA',
      'Tesla': 'TX',
      'OpenAI': 'CA',
      'Stripe': 'CA',
      'GitHub': 'CA',
      'Figma': 'CA',
    };
    return states[company] || 'CA';
  }

  private getCompanySize(company: string): string {
    const sizes: Record<string, string> = {
      'Google': 'enterprise',
      'Microsoft': 'enterprise',
      'Apple': 'enterprise',
      'Meta': 'enterprise',
      'Amazon': 'enterprise',
      'Tesla': 'large',
      'OpenAI': 'medium',
      'Stripe': 'large',
      'GitHub': 'large',
      'Figma': 'medium',
    };
    return sizes[company] || 'large';
  }

  private getEmployeeCount(company: string): number {
    const counts: Record<string, number> = {
      'Google': 190000,
      'Microsoft': 221000,
      'Apple': 164000,
      'Meta': 86000,
      'Amazon': 1608000,
      'Tesla': 128000,
      'OpenAI': 4000,
      'Stripe': 14000,
      'GitHub': 2500,
      'Figma': 1200,
    };
    return counts[company] || 50000;
  }

  private getEstimatedRevenue(company: string): number {
    const revenues: Record<string, number> = {
      'Google': 307394000000,
      'Microsoft': 198081000000,
      'Apple': 394328000000,
      'Meta': 114609000000,
      'Amazon': 575315000000,
      'Tesla': 81462000000,
      'OpenAI': 1600000000,
      'Stripe': 14000000000,
      'GitHub': 12000000000,
      'Figma': 600000000,
    };
    return revenues[company] || 10000000000;
  }
}

// Run the test
const scraper = new LinkedInLeadScraper();
scraper.runTest().catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});
