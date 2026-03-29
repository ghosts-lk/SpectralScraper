/**
 * SpectralScraper Core Types
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

export type SourceType = 'website' | 'directory' | 'search' | 'social' | 'api' | 'email_list';
export type ScraperMethod = 'cheerio' | 'puppeteer' | 'playwright' | 'api';
export type ComplianceRegion = 'US' | 'EU' | 'UK' | 'CA' | 'AU' | 'INTERNAL';

// ==================== CONTACT & LEAD ====================

export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  location?: string;
  LinkedIn?: string;
  GitHub?: string;
  Twitter?: string;
  website?: string;
  confidence: number; // 0-100 on data quality
  dataCompleteness: number; // 0-100 on how much data we have
  lastVerified?: Date;
  verified: boolean;
  bounced?: boolean;
  optedOut?: boolean;
  notes?: string;
}

export interface Lead {
  id: string;
  contact: Contact;
  source: SourceType;
  sourceURL?: string;
  discoveredAt: Date;
  score: number; // 0-100 lead quality score
  scoringReason: string;
  ready: boolean; // Passed final validation
  tags: string[];
  complianceApproved: boolean;
  region: ComplianceRegion;
  enrichmentStatus: 'pending' | 'enriching' | 'enriched' | 'failed';
  enrichmentSources: string[];
  metadata: Record<string, unknown>;
}

export interface ScrapingJob {
  id: string;
  name: string;
  sources: ScrapingSource[];
  method: ScraperMethod;
  concurrency: number;
  rateLimit?: number; // requests per minute
  maxDepth?: number;
  timeout: number; // milliseconds
  retry: number;
  consent: boolean;
  complianceRegion: ComplianceRegion;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  stats: JobStatistics;
}

export interface ScrapingSource {
  id: string;
  url: string;
  type: SourceType;
  selectors?: SelectorMap;
  pagination?: PaginationConfig;
  authentication?: AuthConfig;
  headers?: Record<string, string>;
}

export interface SelectorMap {
  [key: string]: string; // CSS selector or XPath
}

export interface PaginationConfig {
  type: 'url_param' | 'next_link' | 'load_more' | 'js_scroll';
  param?: string; // e.g., 'page', 'offset'
  nextSelector?: string; // CSS selector for next button
  maxPages?: number;
}

export interface AuthConfig {
  type: 'basic' | 'bearer' | 'oauth' | 'session';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
  };
}

export interface JobStatistics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  contactsDiscovered: number;
  leadsGenerated: number;
  enriched: number;
  approved: number;
  averageScore: number;
  duration: number; // milliseconds
  requestsPerSecond: number;
  cacheHitRate: number; // 0-100
}

// ==================== ENRICHMENT ====================

export interface EnrichmentProvider {
  name: string;
  apiKey?: string;
  enabled: boolean;
  rateLimit: number; // requests per minute
  fields: string[]; // which fields it can enrich
}

export interface EnrichmentResult {
  provider: string;
  enriched: Partial<Contact>;
  confidence: number;
  cost?: number; // API call cost
  timestamp: Date;
}

// ==================== COMPLIANCE ====================

export interface ComplianceConfig {
  region: ComplianceRegion;
  gdprConsent: boolean;
  ccpaOptOut: boolean;
  respectRobotsTxt: boolean;
  rateLimitPerMinute: number;
  retryBackoffMs: number;
  userAgent: string;
  identifyingURL?: string;
  complianceCheckRequired: boolean;
}

export interface ComplianceCheck {
  passed: boolean;
  region: ComplianceRegion;
  issues: string[];
  timestamp: Date;
  approvedBy?: string;
}

// ==================== DATABASE ====================

export interface ScraperDatabase {
  // Contacts
  insertContact(contact: Contact): Promise<string>;
  getContact(email: string): Promise<Contact | null>;
  updateContact(id: string, updates: Partial<Contact>): Promise<void>;
  getContacts(filter: ContactFilter): Promise<Contact[]>;

  // Leads
  insertLead(lead: Lead): Promise<string>;
  getLead(id: string): Promise<Lead | null>;
  getLeads(filter: LeadFilter): Promise<Lead[]>;
  updateLead(id: string, updates: Partial<Lead>): Promise<void>;
  deleteLeads(ids: string[]): Promise<void>;

  // Jobs
  insertJob(job: ScrapingJob): Promise<string>;
  getJob(id: string): Promise<ScrapingJob | null>;
  updateJobStatus(id: string, status: ScrapingJob['status']): Promise<void>;
  getJobStats(id: string): Promise<JobStatistics>;

  // Analytics
  getDailyStats(): Promise<Record<string, unknown>>;
  getSourceStats(): Promise<Record<string, unknown>>;
  getComplianceStats(): Promise<Record<string, unknown>>;
}

export interface ContactFilter {
  email?: string;
  company?: string;
  industry?: string;
  minConfidence?: number;
  verified?: boolean;
  limit?: number;
  offset?: number;
}

export interface LeadFilter {
  minScore?: number;
  source?: SourceType;
  complianceApproved?: boolean;
  ready?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
}

// ==================== SCRAPER INTERFACE ====================

export interface Scraper {
  name: ScraperMethod;
  scrape(source: ScrapingSource, config: ComplianceConfig): Promise<ScrapedData[]>;
  canHandle(sourceType: SourceType): boolean;
  cleanup(): Promise<void>;
}

export interface ScrapedData {
  url: string;
  data: Partial<Contact>;
  rawHTML?: string;
  timestamp: Date;
  confidence: number;
}

// ==================== ENRICHER INTERFACE ====================

export interface Enricher {
  name: string;
  enrich(contact: Contact): Promise<EnrichmentResult>;
  supports(field: string): boolean;
  getMetadata(): EnrichmentMetadata;
}

export interface EnrichmentMetadata {
  provider: string;
  fields: string[];
  costPerRequest?: number;
  rateLimit: number;
  avgResponseTime: number;
  successRate: number;
}

// ==================== LEAD SCORER ====================

export interface ScoringCriteria {
  emailCompleted: number; // 0-20 points
  phoneCompleted: number; // 0-15 points
  jobTitlePresent: number; // 0-20 points
  companyPresent: number; // 0-15 points
  linkedinVerified: number; // 0-15 points
  githubPresent: number; // 0-10 points
  dataFreshness: number; // 0-5 points (recent = high)
}

export interface LeadScoreResult {
  score: number; // 0-100
  breakdown: ScoringCriteria;
  ready: boolean; // score >= 60 and required fields present
  missingCritical: string[];
}
