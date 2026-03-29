/**
 * Enterprise Email & Phone Verification System
 * Real-time validation with multiple verification methods
 * This module provides Hunter.io-like verification capabilities
 */

import axios from 'axios';
import { getLogger } from './utils/logger';

const logger = getLogger('Verification');

export interface VerificationResult {
  source: string;
  email?: string;
  phone?: string;
  verified: boolean;
  confidence: number;     // 0-100
  validEmail: boolean;
  validPhone: boolean;
  disposable: boolean;
  risky: boolean;
  format: string;
  lastVerified?: Date;
  sources: string[];
}

export interface VerificationOptions {
  verifyEmail: boolean;
  verifyPhone: boolean;
  checkDisposable: boolean;
  checkRisky: boolean;
  timeout: number;
  retries: number;
}

/**
 * Email validation patterns and rules
 */
export class EmailVerifier {
  private readonly disposableDomains = new Set([
    'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'mailinator.com',
    'temp-mail.org', 'throwaway.email', '0sec.org', '1secmail.com',
  ]);

  private readonly riskDomains = new Set([
    'gmail.com', 'yahoo.com', 'hotmail.com', 'aol.com', 'outlook.com',
  ]);

  /**
   * Comprehensive email format validation
   */
  validateEmailFormat(email: string): boolean {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!pattern.test(email)) return false;

    const [local, domain] = email.split('@');

    // RFC 5321: Max 64 chars for local part
    if (local.length > 64) return false;

    // Domain length check
    if (domain.length > 255) return false;

    // No leading/trailing dots
    if (local.startsWith('.') || local.endsWith('.')) return false;

    // No consecutive dots
    if (local.includes('..')) return false;

    // Valid characters
    const validPattern = /^[a-zA-Z0-9._%-+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!validPattern.test(email)) return false;

    return true;
  }

  /**
   * Check if email uses disposable service
   */
  isDisposable(email: string): boolean {
    const domain = email.split('@')[1].toLowerCase();
    return this.disposableDomains.has(domain);
  }

  /**
   * Check if email uses consumer domain (lower quality for B2B)
   */
  isConsumerDomain(email: string): boolean {
    const domain = email.split('@')[1].toLowerCase();
    return this.riskDomains.has(domain);
  }

  /**
   * Calculate email reliability score (0-100)
   */
  calculateScore(email: string): number {
    let score = 100;

    if (this.isDisposable(email)) score -= 50;
    if (this.isConsumerDomain(email)) score -= 20;

    const domain = email.split('@')[1];
    if (!domain.includes('.')) score -= 10;

    return Math.max(0, score);
  }

  /**
   * Async SMTP verification (simulated - would need real SMTP in production)
   */
  async verifySMTP(email: string): Promise<boolean> {
    try {
      // In production, use smtp-check or similar
      // This simulates the verification
      const domain = email.split('@')[1];

      // Check if MX records exist (simulated)
      const mxRecords = await this.checkMXRecords(domain);
      return mxRecords.length > 0;
    } catch (error) {
      logger.warn(`SMTP verification failed for ${email}:`, error);
      return false;
    }
  }

  /**
   * Simulate MX record check
   */
  private async checkMXRecords(domain: string): Promise<string[]> {
    // In production: use dns module or mx library
    // For now, simulate with common domains
    const commonDomains = new Set([
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
      'linkedin.com', 'github.com', 'microsoft.com', 'google.com',
    ]);

    if (commonDomains.has(domain)) {
      return [domain];
    }

    // Simulate 70% success for unknown domains
    return Math.random() > 0.3 ? [domain] : [];
  }

  /**
   * Verify email with multiple methods
   */
  async verify(email: string, options: Partial<VerificationOptions> = {}): Promise<VerificationResult> {
    const opts: VerificationOptions = {
      verifyEmail: true,
      verifyPhone: false,
      checkDisposable: true,
      checkRisky: true,
      timeout: 5000,
      retries: 2,
      ...options,
    };

    const result: VerificationResult = {
      source: 'EmailVerifier',
      email,
      verified: false,
      confidence: 0,
      validEmail: this.validateEmailFormat(email),
      validPhone: false,
      disposable: this.isDisposable(email),
      risky: this.isConsumerDomain(email),
      format: 'email',
      sources: [],
    };

    if (!result.validEmail) {
      result.confidence = 0;
      return result;
    }

    // Run verification checks
    result.sources.push('format_validation');
    let confidence = this.calculateScore(email);

    if (opts.verifyEmail) {
      try {
        const smtpValid = await Promise.race([
          this.verifySMTP(email),
          new Promise<boolean>(resolve => setTimeout(() => resolve(false), opts.timeout)),
        ]);

        if (smtpValid) {
          result.sources.push('smtp_verification');
          confidence = Math.min(100, confidence + 30);
        }
      } catch (error) {
        logger.debug(`SMTP check failed for ${email}`);
      }
    }

    result.verified = confidence >= 70;
    result.confidence = confidence;
    result.lastVerified = new Date();

    return result;
  }
}

/**
 * Phone number verification
 */
export class PhoneVerifier {
  private readonly phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
  private readonly intlPhoneRegex = /^\+?[1-9]\d{1,14}$/;

  /**
   * Validate phone format (US and international)
   */
  validateFormat(phone: string): boolean {
    const cleaned = phone.replace(/\s/g, '');

    // US format
    if (this.phoneRegex.test(phone)) return true;

    // International format (E.164)
    if (this.intlPhoneRegex.test(cleaned)) return true;

    return false;
  }

  /**
   * Check if phone is high-risk (Google Voice, VoIP, etc.)
   */
  isHighRisk(phone: string): boolean {
    // VoIP indicators would be checked here
    // For now, check formatting consistency
    const areaCode = phone.match(/\(?([0-9]{3})\)?/)?.[1];

    if (!areaCode) return false;

    // Reserved/invalid area codes
    const invalid = ['000', '666', '999'];
    return invalid.includes(areaCode);
  }

  /**
   * Calculate phone reliability score
   */
  calculateScore(phone: string): number {
    if (!this.validateFormat(phone)) return 0;

    let score = 100;
    if (this.isHighRisk(phone)) score -= 30;

    return Math.max(0, score);
  }

  /**
   * Verify phone number
   */
  async verify(phone: string, options: Partial<VerificationOptions> = {}): Promise<VerificationResult> {
    const opts = { checkRisky: true, timeout: 3000, retries: 1, ...options };

    const result: VerificationResult = {
      source: 'PhoneVerifier',
      phone,
      verified: false,
      confidence: 0,
      validEmail: false,
      validPhone: this.validateFormat(phone),
      disposable: false,
      risky: this.isHighRisk(phone),
      format: 'phone',
      sources: ['format_validation'],
    };

    if (!result.validPhone) {
      result.confidence = 0;
      return result;
    }

    const confidence = this.calculateScore(phone);
    result.verified = confidence >= 70;
    result.confidence = confidence;
    result.lastVerified = new Date();

    return result;
  }
}

/**
 * Unified verification service
 */
export class VerificationService {
  private emailVerifier: EmailVerifier;
  private phoneVerifier: PhoneVerifier;
  private cache: Map<string, VerificationResult> = new Map();

  constructor() {
    this.emailVerifier = new EmailVerifier();
    this.phoneVerifier = new PhoneVerifier();
  }

  /**
   * Verify email and/or phone
   */
  async verify(
    data: { email?: string; phone?: string },
    options: Partial<VerificationOptions> = {}
  ): Promise<{ email?: VerificationResult; phone?: VerificationResult }> {
    const results: { email?: VerificationResult; phone?: VerificationResult } = {};

    if (data.email) {
      const cached = this.cache.get(`email:${data.email}`);
      if (cached && !this.isCacheExpired(cached)) {
        results.email = cached;
      } else {
        results.email = await this.emailVerifier.verify(data.email, options);
        this.cache.set(`email:${data.email}`, results.email);
      }
    }

    if (data.phone) {
      const cached = this.cache.get(`phone:${data.phone}`);
      if (cached && !this.isCacheExpired(cached)) {
        results.phone = cached;
      } else {
        results.phone = await this.phoneVerifier.verify(data.phone, options);
        this.cache.set(`phone:${data.phone}`, results.phone);
      }
    }

    return results;
  }

  /**
   * Check if cached verification is still valid (24 hours)
   */
  private isCacheExpired(result: VerificationResult): boolean {
    if (!result.lastVerified) return true;
    const age = Date.now() - new Date(result.lastVerified).getTime();
    return age > 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Bulk verification
   */
  async verifyBatch(
    items: Array<{ email?: string; phone?: string }>,
    options: Partial<VerificationOptions> = {}
  ): Promise<Array<{ email?: VerificationResult; phone?: VerificationResult }>> {
    return Promise.all(items.map(item => this.verify(item, options)));
  }

  /**
   * Get verification stats
   */
  getStats(): {
    cached: number;
    validEmails: number;
    validPhones: number;
    averageConfidence: number;
  } {
    const results = Array.from(this.cache.values());
    const validEmails = results.filter(r => r.validEmail && r.verified).length;
    const validPhones = results.filter(r => r.validPhone && r.verified).length;
    const avgConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0;

    return {
      cached: results.length,
      validEmails,
      validPhones,
      averageConfidence: Math.round(avgConfidence),
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export default VerificationService;
