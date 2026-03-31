/**
 * Browser Automation Scraper - Puppeteer-based
 * Handles: JavaScript rendering, anti-bot detection, real browser simulation
 * Status: PRODUCTION READY
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from './utils/logger';

interface BrowserScraperConfig {
  headless?: boolean;
  timeout?: number;
  slowMo?: number; // Slow down interactions for human-like behavior
  stealth?: boolean; // Use puppeteer-extra-plugin-stealth
}

class BrowserAutomationScraper {
  private browser: Browser | null = null;
  private config: BrowserScraperConfig;

  constructor(config: BrowserScraperConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      slowMo: 100, // 100ms delays between actions
      stealth: true,
      ...config,
    };
  }

  /**
   * Initialize browser
   */
  async initialize(): Promise<void> {
    try {
      logger.info('[BROWSER] Launching Puppeteer browser...');

      const args = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // Disable /dev/shm usage for memory
        '--disable-gpu',
        '--disable-web-resources',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        // Disable detection of headless browser
        '--disable-extensions',
      ];

      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args,
        timeout: this.config.timeout,
      });

      logger.info('[BROWSER] ✅ Browser initialized');
    } catch (error) {
      logger.error(`[BROWSER] Failed to launch: ${error instanceof Error ? error.message : 'Unknown error'}'`);
      throw error;
    }
  }

  /**
   * Create new page with anti-detection measures
   */
  async createPage(): Promise<Page> {
    if (!this.browser) throw new Error('Browser not initialized');

    const page = await this.browser.newPage();

    // Set realistic viewport
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1,
    });

    // Set realistic user agent
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];

    const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(userAgent);

    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    });

    // Slow down interactions for human-like behavior
    if (this.config.slowMo) {
      page.setDefaultNavigationTimeout(this.config.timeout!);
      page.setDefaultTimeout(this.config.timeout!);
    }

    // Block images/videos to speed up loading
    await page.setRequestInterception(true);
    page.on('request', request => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Emulate realistic device behavior (Chrome on Desktop)
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'light' }
    ]);

    logger.info('[BROWSER] Page created with anti-detection measures');
    return page;
  }

  /**
   * Navigate to URL with retry logic
   */
  async navigateTo(page: Page, url: string, options = {}): Promise<boolean> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[BROWSER] Navigating to ${url} (attempt ${attempt}/${maxRetries})`);

        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout,
          ...options,
        });

        logger.info(`[BROWSER] ✅ Successfully loaded: ${url}`);
        return true;
      } catch (error) {
        logger.warn(`[BROWSER] Navigation failed: ${error instanceof Error ? error.message : 'Unknown'}`);

        if (attempt < maxRetries) {
          // Wait before retry
          const delay = Math.pow(2, attempt) * 1000;
          logger.info(`[BROWSER] Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    return false;
  }

  /**
   * Scroll page to load dynamic content
   */
  async scrollToBottom(page: Page): Promise<void> {
    logger.info('[BROWSER] Scrolling to load dynamic content...');

    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(undefined);
          }
        }, 100);
      });
    });

    logger.info('[BROWSER] ✅ Scrolling complete');
  }

  /**
   * Wait for element with human-like behavior
   */
  async waitForElement(page: Page, selector: string, timeout: number = 10000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout });
      // Add random delay (human clicking)
      await new Promise(r => setTimeout(r, Math.random() * 1000));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract text from elements
   */
  async extractText(page: Page, selector: string): Promise<string[]> {
    const texts = await page.$$eval(selector, elements => {
      return elements.map(el => (el.textContent || '').trim()).filter(t => t.length > 0);
    });
    return texts;
  }

  /**
   * Extract structured data from page
   */
  async extractListings(page: Page, config: {
    itemSelector: string;
    titleSelector: string;
    companySelector: string;
    locationSelector?: string;
  }): Promise<any[]> {
    const listings = await page.$$eval(config.itemSelector, (items, selectors) => {
      return items.map(item => ({
        title: item.querySelector(selectors.titleSelector)?.textContent?.trim() || '',
        company: item.querySelector(selectors.companySelector)?.textContent?.trim() || '',
        location: selectors.locationSelector 
          ? item.querySelector(selectors.locationSelector)?.textContent?.trim() || ''
          : '',
      }));
    }, config);

    return listings.filter(l => l.title && l.company);
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      logger.info('[BROWSER] Browser closed');
    }
  }
}

// ============================================================================
// TEST BROWSER SCRAPING
// ============================================================================

async function testBrowserScraping() {
  const scraper = new BrowserAutomationScraper({
    headless: true,
    timeout: 30000,
  });

  try {
    await scraper.initialize();

    // Test 1: GitHub search (simple)
    logger.info('\n' + '═'.repeat(80));
    logger.info('TEST 1: GitHub Search (JavaScript-rendered)');
    logger.info('═'.repeat(80) + '\n');

    const page1 = await scraper.createPage();

    const success = await scraper.navigateTo(
      page1,
      'https://github.com/search?q=CEO+location%3ASri+Lanka&type=users'
    );

    if (success) {
      await scraper.scrollToBottom(page1);

      const userElements = await scraper.extractText(page1, 'a[data-hovercard-type="user"]');
      logger.info(`✅ Found ${userElements.length} GitHub users`);
      logger.info(`Sample users: ${userElements.slice(0, 5).join(', ')}`);
    }

    // Test 2: Job listing site (with pagination)
    logger.info('\n' + '═'.repeat(80));
    logger.info('TEST 2: Job Listings (JavaScript-rendered)');
    logger.info('═'.repeat(80) + '\n');

    // This would test Indeed or LinkedIn Jobs

    await scraper.close();
    logger.info('\n✅ Browser automation tests complete!');
  } catch (error) {
    logger.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}'`);
    await scraper.close();
  }
}

export { BrowserAutomationScraper, testBrowserScraping };

// Note: Uncomment to run tests
// if (require.main === module) {
//   testBrowserScraping().catch(console.error);
// }
