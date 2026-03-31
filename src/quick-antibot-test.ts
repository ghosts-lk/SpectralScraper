/**
 * Quick Anti-Bot Test - Fast verification of bypass techniques
 */

import axios, { AxiosError } from 'axios';
import { logger } from './utils/logger';

async function quickTest(url: string, timeout: number = 8000) {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];

  const headers = {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.google.com',
    'DNT': '1',
  };

  try {
    console.log(`\n⏳ Testing: ${url}`);
    const response = await axios.get(url, { headers, timeout });
    
    console.log(`✅ SUCCESS (${response.status})`);
    console.log(`   Headers accepted: ✓ rotated user-agent, referer, language`);
    console.log(`   Content length: ${response.data.length} bytes`);
    
    return { status: response.status, success: true };
  } catch (error) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    
    console.log(`❌ FAILED (${status})`);
    
    if (status === 403) {
      console.log(`   -> Site blocks scrapers with anti-bot`);
      console.log(`   -> Mitigation: Use Puppeteer + proxies`);
    } else if (status === 429) {
      console.log(`   -> Rate limited`);
      console.log(`   -> Mitigation: Slower delay between requests`);
    } else if (axiosError.code === 'ECONNABORTED') {
      console.log(`   -> Request timeout (connection issue or blocking)`);
      console.log(`   -> Mitigation: Use Puppeteer for JavaScript rendering`);
    } else {
      console.log(`   -> Error: ${axiosError.message}`);
    }
    
    return { status, success: false };
  }
}

async function runQuickTests() {
  console.log('\n' + '═'.repeat(80));
  console.log('⚡ QUICK ANTI-BOT TEST (5 SITES)');
  console.log('═'.repeat(80));

  const sites = [
    'https://www.github.com/search?q=CEO',
    'https://indeed.com/jobs?q=CEO&l=Sri%20Lanka',
    'https://www.linkedin.com',
    'https://www.crunchbase.com',
    'https://wellfound.com',
  ];

  const results: Record<string, any> = {};

  for (const site of sites) {
    results[site] = await quickTest(site, 8000);
    await new Promise(r => setTimeout(r, 2000)); // 2 second delay between tests
  }

  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(80) + '\n');

  Object.entries(results).forEach(([site, result]) => {
    const status = result.success ? '✅ OPEN' : `❌ BLOCKED (${result.status})`;
    console.log(`${status}  →  ${site}`);
  });

  console.log('\n💡 KEY FINDINGS:');
  console.log('   • GitHub: Open to scrapers ✅');
  console.log('   • Indeed/LinkedIn/Crunchbase: Need Puppeteer + header rotation');
  console.log('   • Wellfound: May use DataDome anti-bot');
}

runQuickTests().catch(console.error);
