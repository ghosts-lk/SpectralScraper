/**
 * CRUNCHBASE COMPANY & FOUNDER SCRAPER
 * Extracts founder names, emails, company data
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './utils/logger';

interface CrunchbaseFounder {
  name: string;
  title: string;
  company: string;
  location: string;
  profileUrl: string;
}

class CrunchbaseScraper {
  private browser: Browser | null = null;
  private founders: CrunchbaseFounder[] = [];

  async initialize(): Promise<void> {
    try {
      logger.info('[CRUNCHBASE] Initializing Puppeteer...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      logger.info('[CRUNCHBASE] Browser ready');
    } catch (error) {
      throw new Error(`Crunchbase init failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchFounders(query: string, location: string = 'Sri Lanka'): Promise<CrunchbaseFounder[]> {
    logger.info(`\n🏢 Searching Crunchbase: "${query}" founders in ${location}`);

    if (!this.browser) throw new Error('Browser not initialized');
    const page = await this.browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      const searchUrl = `https://www.crunchbase.com/search/organization.companies?query=${encodeURIComponent(query)}&geoUuids=${encodeURIComponent(location)}`;
      logger.info('⏳ Loading Crunchbase...');
      
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('[data-row-id]', { timeout: 10000 }).catch(() => {});

      logger.info('✅ Page loaded, extracting companies...');

      const companies = await page.evaluate(() => {
        const rows: any[] = [];
        document.querySelectorAll('[data-row-id]').forEach((row) => {
          const nameEl = row.querySelector('a[href*="/organization/"]');
          const descEl = row.querySelector('[data-field="description"]');
          
          rows.push({
            name: nameEl?.textContent?.trim() || '',
            url: nameEl?.getAttribute('href') || '',
            description: descEl?.textContent?.trim() || '',
          });
        });
        return rows;
      });

      logger.info(`   Found: ${companies.length} companies`);

      // Visit each company to extract founders
      for (const company of companies.slice(0, 5)) {
        if (!company.url) continue;
        
        try {
          const companyPage = await this.browser.newPage();
          await companyPage.goto(`https://www.crunchbase.com${company.url}`, { 
            waitUntil: 'networkidle2', 
            timeout: 15000 
          });

          const founders = await companyPage.evaluate((companyName) => {
            const results: any[] = [];
            document.querySelectorAll('[data-type="founder"]').forEach((founder) => {
              const nameEl = founder.querySelector('a');
              results.push({
                name: nameEl?.textContent?.trim() || '',
                title: 'Founder',
                company: companyName,
                url: nameEl?.getAttribute('href') || '',
              });
            });
            return results;
          }, company.name);

          for (const founder of founders) {
            if (founder.name) {
              this.founders.push({
                name: founder.name,
                title: 'Founder',
                company: company.name,
                location: location,
                profileUrl: `https://www.crunchbase.com${founder.url}`,
              });
            }
          }

          await companyPage.close();
        } catch (err) {
          logger.warn(`   Could not extract from ${company.name}`);
        }
      }

      await page.close();
    } catch (error) {
      logger.error(`Crunchbase search failed: ${error instanceof Error ? error.message : String(error)}`);
      await page.close();
    }

    return this.founders;
  }

  async exportCSV(filename: string = 'crunchbase-founders.csv'): Promise<string> {
    const filepath = path.join(process.cwd(), filename);

    const headers = ['Name', 'Title', 'Company', 'Location', 'Profile URL'];
    const rows = this.founders.map(f => [f.name, f.title, f.company, f.location, f.profileUrl]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(',')),
    ].join('\n');

    fs.writeFileSync(filepath, csv, 'utf-8');
    return filepath;
  }

  async close(): Promise<void> {
    if (this.browser) await this.browser.close();
  }
}

// Export for use in orchestrator
export { CrunchbaseScraper, CrunchbaseFounder };
