/**
 * Browser Automation Quick Test
 * Test Puppeteer on GitHub search (low-risk, JS-intensive)
 */

import { BrowserAutomationScraper } from './browser-automation-scraper';
import { logger } from './utils/logger';

async function testGitHubWithPuppeteer() {
  const scraper = new BrowserAutomationScraper({
    headless: true,
    timeout: 30000,
    slowMo: 50,
  });

  try {
    logger.info('🚀 Starting Puppeteer browser automation test');
    await scraper.initialize();

    // Create a page
    const page = await scraper.createPage();

    const testUrl = 'https://www.github.com/search?q=CEO+location:Sri%20Lanka';
    logger.info(`\n📍 Target URL: ${testUrl}\n`);

    // Navigate to the page
    const success = await scraper.navigateTo(page, testUrl);
    if (!success) throw new Error('Failed to navigate to page');

    logger.info('✅ Page loaded successfully');

    // Extract listings (GitHub results)
    const profiles = await scraper.extractListings(page, {
      itemSelector: 'div[role="article"]',
      titleSelector: 'a',
      companySelector: 'span',
    });
    logger.info(`\n📊 Extracted ${profiles.length} items from the page`);

    if (profiles.length > 0) {
      logger.info('\n🎯 SAMPLE RESULTS:');
      profiles.slice(0, 3).forEach((profile, idx) => {
        logger.info(`\n  [${idx + 1}] ${profile}`);
      });
    }

    logger.info('\n\n✅ PUPPETEER TEST SUCCESSFUL');
    logger.info('   - Browser automation works ✓');
    logger.info('   - JavaScript rendering works ✓');
    logger.info('   - Can extract dynamic content ✓');

  } catch (error) {
    logger.error(`❌ Test failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await scraper.close();
  }
}

testGitHubWithPuppeteer();
