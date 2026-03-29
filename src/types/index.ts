/**
 * Core Type Definitions for SpectralScraper
 * 
 * @copyright 2026 Ghost Protocol (Pvt) Ltd. All Rights Reserved.
 * @license Proprietary - See LICENSE file for details.
 */

// ==================== LEAD DATA ====================

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  company?: string;
  industry?: string;
  website?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  socialProfiles?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    facebook?: string;
  };
  score: number; // 0-100 quality score
  sources: string[]; // Where this data came from
  enrichmentLevel: 'basic' | 'enriched' | 'complete';
  confidence: number; // 0-100 data confidence
  lastUpdated: Date;
  tags?: string[];
  verified?: boolean;
  metadata?: Record<string, any>;
}

export interface LeadQuery {
  keywords?: string[];
  company?: string;
  location?: string;
  industry?: string;
  title?: string;
  limit?: number;
  minScore?: number;
  sources?: string[];
}

// ==================== SCRAPER TYPES ====================

export interface ScraperConfig {
  name: string;
  source: ScraperSource;
  enabled: boolean;
  timeout: number; // ms
  retries: number;
  rateLimit?: {
    requestsPerMinute: number;
  };
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  proxy?: string;
}

export enum ScraperSource {
  LINKEDIN = 'linkedin',
  GOOGLE = 'google',
  HUNTER_IO = 'hunter_io',
  CLEARBIT = 'clearbit',
  COMPANY_WEBSITE = 'company_website',
  DIRECTORY = 'directory',
  GITHUB = 'github',
  TWITTER = 'twitter',
  EMAIL_FINDER = 'email_finder',
  JOB_BOARD = 'job_board',
  CUSTOM = 'custom',
}

export interface ScraperResult {
  source: ScraperSource;
  leads: Partial<Lead>[];
  success: boolean;
  error?: string;
  duration: number; // ms
  count: number;
  timestamp: Date;
}

// ==================== ENRICHMENT ====================

export interface EnrichmentConfig {
  deduplicate: boolean;
  validateEmails: boolean;
  enrichWithSocial: boolean;
  enrichWithCompanyData: boolean;
  enrichWithPhoneData: boolean;
  maxParallelRequests: number;
  scoreThreshold: number; // Min score to include
}

export interface EnrichmentResult {
  original: Partial<Lead>;
  enriched: Lead;
  sources: string[];
  newData: string[];
  confidence: number;
  duration: number;
}

// ==================== DEDUPLICATION ====================

export interface DuplicateMatch {
  lead1: Lead;
  lead2: Lead;
  similarity: number; // 0-100
  matchingFields: string[];
  merged: Lead;
}

export interface DeduplicationResult {
  original: number;
  duplicates: DuplicateMatch[];
  final: number;
  removed: string[];
  mergeStrategy: 'highest_score' | 'most_recent' | 'most_complete';
}

// ==================== BATCH OPERATIONS ====================

export interface ScrapingJob {
  id: string;
  name: string;
  queries: LeadQuery[];
  sources: ScraperSource[];
  enrichment: EnrichmentConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results?: Lead[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// ==================== CACHE ====================

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // seconds
  backend: 'memory' | 'redis';
  redisUrl?: string;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: Date;
  createdAt: Date;
}

// ==================== COMPLIANCE ====================

export interface ComplianceConfig {
  respectRobotsTxt: boolean;
  userAgent: string;
  delayBetweenRequests: number; // ms
  rejectOnCookiePolicy: boolean;
  gdprEnabled: boolean;
  ccpaEnabled: boolean;
  logAllActivity: boolean;
}

export interface ActivityLog {
  timestamp: Date;
  source: ScraperSource;
  action: string;
  url?: string;
  success: boolean;
  duration: number;
  error?: string;
  dataPoints?: number;
}

// ==================== INTEGRATIONS ====================

export interface WyrmIntegration {
  enabled: boolean;
  projectPath: string;
  syncToDataLake: boolean;
  category: string;
  tags?: string[];
}

export interface ExportConfig {
  format: 'json' | 'csv' | 'xlsx' | 'sql';
  includeFields: string[];
  filters?: {
    minScore?: number;
    sources?: ScraperSource[];
    tags?: string[];
  };
  filename?: string;
}

// ==================== STATISTICS ====================

export interface ScrapingStats {
  totalLeads: number;
  uniqueLeads: number;
  bySource: Record<ScraperSource, number>;
  avgScore: number;
  enrichmentRate: number; // %
  verificationRate: number; // %
  errorRate: number; // %
  cacheSavings: number; // requests avoided
  totalDuration: number; // ms
  startTime: Date;
  endTime?: Date;
}
