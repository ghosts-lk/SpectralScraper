/**
 * WELLFOUND (ANGELLIST) STARTUP & JOB SCRAPER
 * Extracts startup founders, job listings, funding info
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './utils/logger';

interface WellfoundJob {
  title: string;
  company: string;
  location: string;
  equity?: string;
  salary?: string;
  jobUrl: string;
}

class WellfoundScraper {
  private browser: Browser | null = null;
  private jobs: WellfoundJob[] = [];

  async initialize(): Promise<void> {
    try {
      logger.info('[WELLFOUND] Initializing browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      logger.info('[WELLFOUND] Browser ready');
    } catch (error) {
      throw new Error(`Wellfound init failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async searchJobs(query: string, location: string = 'Sri Lanka'): Promise<WellfoundJob[]> {
    logger.info(`\n💼 Searching Wellfound: "${query}" jobs in ${location}`);

    if (!this.browser) throw new Error('Browser not initialized');
    const page = await this.browser.newPage();

    try {
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      const searchUrl = `https://wellfound.com/jobs?query=${encodeURIComponent(query)}&locations=${encodeURIComponent(location)}`;
      logger.info('⏳ Loading Wellfound...');

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 }).catch(() => {});

      logger.info('✅ Page loaded, extracting jobs...');

      const jobData = await page.evaluate(() => {
        const results: any[] = [];
        document.querySelectorAll('[data-testid="job-card"]').forEach((card) => {
          const titleEl = card.querySelector('[data-testid="job-title"]');
          const companyEl = card.querySelector('[data-testid="company-name"]');
          const locationEl = card.querySelector('[data-testid="job-location"]');
          const salaryEl = card.querySelector('[data-testid="salary-range"]');
          const linkEl = card.querySelector('a[href*="/jobs/"]');

          results.push({
            title: titleEl?.textContent?.trim() || '',
            company: companyEl?.textContent?.trim() || '',
            location: locationEl?.textContent?.trim() || '',
            salary: salaryEl?.textContent?.trim() || '',
            url: linkEl?.getAttribute('href') || '',
          });
        });
        return results;
      });

      logger.info(`   Found: ${jobData.length} job postings`);

      for (const job of jobData) {
        if (job.title && job.company) {
          this.jobs.push({
            title: job.title,
            company: job.company,
            location: job.location || location,
            salary: job.salary,
            jobUrl: job.url.startsWith('http') ? job.url : `https://wellfound.com${job.url}`,
          });
        }
      }

      await page.close();
    } catch (error) {
      logger.error(`Wellfound search failed: ${error instanceof Error ? error.message : String(error)}`);
      await page.close();
    }

    return this.jobs;
  }

  async exportCSV(filename: string = 'wellfound-jobs.csv'): Promise<string> {
    const filepath = path.join(process.cwd(), filename);

    const headers = ['Job Title', 'Company', 'Location', 'Salary', 'Job URL'];
    const rows = this.jobs.map(j => [j.title, j.company, j.location, j.salary || '', j.jobUrl]);

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

export { WellfoundScraper, WellfoundJob };
