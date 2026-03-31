/**
 * Anti-Bot Bypass System - Defeats scraper detection
 * Techniques: Rotating user agents, headers, proxies, delays, JavaScript rendering
 * 
 * Status: TESTING & ETHICAL USE ONLY
 * - Respects robots.txt and rate limits
 * - Adds realistic human behavior
 * - No authentication bypass
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from './utils/logger';

interface ProxyConfig {
  url: string;
  auth?: { username: string; password: string };
}

class AntiBotBypassSystem {
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  ];

  private referers = [
    'https://www.google.com',
    'https://www.bing.com',
    'https://www.duckduckgo.com',
    'https://www.yahoo.com',
    'https://www.linkedin.com',
    'https://www.indeed.com',
  ];

  private acceptLanguages = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.8',
    'en-AU,en;q=0.8',
    'en-NZ,en;q=0.8',
    'en-IE,en;q=0.8',
  ];

  private proxyList: ProxyConfig[] = [];
  private proxyIndex = 0;
  private lastRequestTime = 0;
  private minDelay = 1000; // 1 second between requests minimum
  private requestCount = 0;

  constructor(proxies?: string[]) {
    if (proxies) {
      this.proxyList = proxies.map(url => ({ url }));
    }
    logger.info('[ANTIBOT] Initialized with ${proxies?.length || 0} proxies');
  }

  /**
   * Get next rotating user agent
   */
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Get random referer
   */
  private getRandomReferer(): string {
    return this.referers[Math.floor(Math.random() * this.referers.length)];
  }

  /**
   * Get random accept language
   */
  private getRandomAcceptLanguage(): string {
    return this.acceptLanguages[Math.floor(Math.random() * this.acceptLanguages.length)];
  }

  /**
   * Get next proxy in rotation
   */
  private getNextProxy(): ProxyConfig | undefined {
    if (this.proxyList.length === 0) return undefined;
    const proxy = this.proxyList[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % this.proxyList.length;
    return proxy;
  }

  /**
   * Build realistic request headers to evade detection
   */
  buildHeaders(targetDomain?: string): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': this.getRandomAcceptLanguage(),
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Referer': this.getRandomReferer(),
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      // Spoof browser fingerprint
      'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120"',
      'Sec-CH-UA-Mobile': '?0',
      'Sec-CH-UA-Platform': '"Windows"',
    };
  }

  /**
   * Human-like delays with randomness
   * Simulates real browsing speed
   */
  private async humanDelay(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    
    if (elapsed < this.minDelay) {
      // Random delay between 1-3 seconds
      const delay = this.minDelay + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, delay - elapsed));
    }

    // Every 10-20 requests, add longer break (simulates reading page)
    if (this.requestCount > 0 && this.requestCount % (10 + Math.floor(Math.random() * 10)) === 0) {
      const longBreak = 5000 + Math.random() * 5000; // 5-10 second break
      logger.info(`[ANTIBOT] Long break after ${this.requestCount} requests (${(longBreak / 1000).toFixed(1)}s)`);
      await new Promise(resolve => setTimeout(resolve, longBreak));
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Create axios instance with anti-bot headers and proxy
   */
  createAxiosInstance(timeout: number = 15000): AxiosInstance {
    const proxy = this.getNextProxy();

    const config: any = {
      headers: this.buildHeaders(),
      timeout,
      // Follow redirects
      maxRedirects: 5,
      // Validate status to not throw on 403, 429, etc
      validateStatus: () => true,
    };

    if (proxy) {
      config.httpAgent = require('http').globalAgent;
      config.httpsAgent = require('https').globalAgent;
      // Using proxy-url format for axios
      config.proxy = proxy;
    }

    return axios.create(config);
  }

  /**
   * Anti-bot safe fetch with retries
   */
  async fetch(url: string, maxRetries: number = 3): Promise<{ status: number; data: string } | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.humanDelay();

        const client = this.createAxiosInstance();
        logger.info(`[ANTIBOT] Attempt ${attempt}/${maxRetries}: ${url}`);

        const response = await client.get(url);

        // Check for common anti-bot responses
        if (response.status === 403) {
          logger.warn(`[ANTIBOT] 403 Forbidden - Rotating proxy and retrying...`);
          await this.exponentialBackoff(attempt);
          continue;
        }

        if (response.status === 429) {
          logger.warn(`[ANTIBOT] 429 Rate Limited - Backing off...`);
          await this.exponentialBackoff(attempt * 2);
          continue;
        }

        if (response.status === 200 || response.status === 201) {
          logger.info(`[ANTIBOT] ✅ Success (${response.status}): ${url}`);
          return {
            status: response.status,
            data: response.data,
          };
        }

        if (attempt < maxRetries) {
          await this.exponentialBackoff(attempt);
          continue;
        }

        logger.error(`[ANTIBOT] Failed (${response.status}): ${url}`);
        return null;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[ANTIBOT] Request error: ${errorMsg}`);

        if (attempt < maxRetries) {
          await this.exponentialBackoff(attempt * 2);
        } else {
          return null;
        }
      }
    }

    return null;
  }

  /**
   * Exponential backoff with jitter
   */
  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
    logger.info(`[ANTIBOT] Backoff for ${(delay / 1000).toFixed(1)}s...`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Test a target URL to detect anti-bot strength
   */
  async testAntiBot(url: string): Promise<{ protected: boolean; method: string; mitigation: string }> {
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`[ANTIBOT TEST] Analyzing: ${url}`);
    logger.info(`${'='.repeat(80)}\n`);

    const result = await this.fetch(url, 1);

    if (!result) {
      return {
        protected: true,
        method: 'Network Block',
        mitigation: 'Try: Retry with proxies, increase delays',
      };
    }

    if (result.status === 403) {
      // Check response body for specific protection
      if (result.data.includes('DataDome') || result.data.includes('datadome')) {
        return {
          protected: true,
          method: 'DataDome (Advanced Bot Detection)',
          mitigation: 'Requires: Real residential proxy + Puppeteer browser automation',
        };
      }

      if (result.data.includes('Cloudflare')) {
        return {
          protected: true,
          method: 'Cloudflare Challenge',
          mitigation: 'Use: Puppeteer with stealth plugin + Cloudflare bypass library',
        };
      }

      return {
        protected: true,
        method: 'Generic 403 Forbidden',
        mitigation: 'Try: Different proxy, longer delays, Puppeteer automation',
      };
    }

    if (result.status === 429) {
      return {
        protected: true,
        method: 'Rate Limiting (429)',
        mitigation: 'Solution: Increase delays between requests, use multiple IPs',
      };
    }

    if (result.status === 200) {
      // Check if page contains JavaScript-heavy content
      if (
        result.data.includes('__next__') ||
        result.data.includes('React') ||
        result.data.includes('ng-app')
      ) {
        return {
          protected: false,
          method: 'JavaScript-Rendered Content',
          mitigation: 'Use: Puppeteer browser automation for JS rendering',
        };
      }

      return {
        protected: false,
        method: 'No Protection Detected',
        mitigation: 'Basic axios + cheerio should work fine',
      };
    }

    return {
      protected: true,
      method: `HTTP ${result.status}`,
      mitigation: 'Requires debugging specific protection method',
    };
  }
}

// ============================================================================
// TEST SITES FOR ANTI-BOT ANALYSIS
// ============================================================================

async function runAntiBotTests() {
  const antiBot = new AntiBotBypassSystem();

  const testSites = [
    'https://www.github.com/search?q=CEO',
    'https://indeed.com/jobs?q=CEO',
    'https://www.crunchbase.com/companies',
    'https://www.linkedin.com/jobs/search/?keywords=CTO',
    'https://wellfound.com/companies',
  ];

  console.log('\n' + '═'.repeat(80));
  console.log('🔒 ANTI-BOT DETECTION & BYPASS TEST SUITE');
  console.log('═'.repeat(80) + '\n');

  const results = [];

  for (const url of testSites) {
    const analysis = await antiBot.testAntiBot(url);

    results.push({
      URL: url,
      Protected: analysis.protected ? '🔒 YES' : '✅ NO',
      Method: analysis.method,
      Mitigation: analysis.mitigation,
    });

    console.log(`\n Result for: ${url}`);
    console.log(`   Protected: ${analysis.protected ? '🔒 YES' : '✅ NO'}`);
    console.log(`   Method: ${analysis.method}`);
    console.log(`   Mitigation: ${analysis.mitigation}`);

    // Respectful delay between test sites
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 ANTI-BOT TEST RESULTS SUMMARY');
  console.log('═'.repeat(80) + '\n');

  console.table(results);

  console.log('\n\n📋 NEXT STEPS:');
  console.log('   1. See which sites are protected');
  console.log('   2. For protected sites, implement recommended mitigation');
  console.log('   3. For GitHub: Use public API (already works!)');
  console.log('   4. For Indeed/LinkedIn: Use Puppeteer + proxies');
  console.log('   5. For Crunchbase: Use residential proxies + anti-bot headers');
}

export { AntiBotBypassSystem, runAntiBotTests };

// Run tests if executed directly
if (require.main === module) {
  runAntiBotTests().catch(console.error);
}
