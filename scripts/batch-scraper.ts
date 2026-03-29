#!/usr/bin/env node

/**
 * SpectralScraper CLI - Mass Lead Scraper
 * Usage: npx ts-node scripts/batch-scraper.ts [count]
 */

import { RealDataBatchScraper } from '../src/scraper-batch';

const count = parseInt(process.argv[2] || '100000', 10);

console.log('\n╔════════════════════════════════════════╗');
console.log('║  SPECTRAL SCRAPER - MASS LEAD EXPORT  ║');
console.log('╚════════════════════════════════════════╝\n');

const scraper = new RealDataBatchScraper({
  outputFile: `leads-${Date.now()}.csv`,
  delayMs: 1000,
});

scraper.scrapeBatch(
  [
    'tech startup CEO founder',
    'software engineer company',
    'business development manager tech',
    'product manager SaaS',
  ],
  [
    'github.com',
    'techcrunch.com',
  ],
  count
).catch(error => {
  console.error('❌ Scraping failed:', error);
  process.exit(1);
});
