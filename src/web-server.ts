import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { RealDataBatchScraper } from './scraper-batch';
import { ProfessionalLeadScraper, LeadFilters } from './professional-lead-scraper';
import { AdvancedQueryBuilder } from './advanced-query-builder';
import { getLogger } from './utils/logger';
import { VerificationService } from './verification-service';
import AdvancedLeadScorer from './advanced-lead-scoring';
import { CRMManager, CRMConfig } from './crm-integration';
import BulkOperationService from './bulk-operations';

const logger = getLogger('WebServer');
const app: Express = express();

// Initialize services
const verificationService = new VerificationService();
const leadScorer = new AdvancedLeadScorer();
const crmManager = new CRMManager();
const bulkOperationService = new BulkOperationService();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../web/public')));

// Store scraping jobs
interface ScrapeJob {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  totalLeads: number;
  targetLeads: number;
  csvFile?: string;
  error?: string;
  startTime: number;
  endTime?: number;
  filters?: LeadFilters;
}

const jobs: Map<string, ScrapeJob> = new Map();

// Generate unique job ID
function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Filter presets for common use cases
const FILTER_PRESETS: Record<string, LeadFilters> = {
  tech_ceos: {
    industry: ['Technology', 'Software', 'SaaS'],
    jobTitle: ['CEO', 'Founder', 'CTO'],
    seniority: 'executive' as const,
  },
  venture_capital_ready: {
    companySize: 'startup' as const,
    industry: ['Technology', 'Biotech', 'FinTech'],
  },
  enterprise_decision_makers: {
    companySize: 'enterprise' as const,
    jobTitle: ['VP', 'Director', 'Manager'],
    seniority: 'senior' as const,
  },
  sales_development: {
    industry: ['Sales', 'Marketing', 'Business Development'],
    jobTitle: ['SDR', 'AE', 'BDR', 'Sales Manager'],
    seniority: 'mid' as const,
  },
  finance_decision_makers: {
    industry: ['Finance', 'Banking', 'Insurance'],
    jobTitle: ['CFO', 'Finance Director', 'Controller'],
    seniority: 'executive' as const,
  },
};

// ============ NEW FILTERING ENDPOINTS ============

// API: Get filter presets
app.get('/api/filters/presets', (req: Request, res: Response) => {
  res.json({
    presets: Object.keys(FILTER_PRESETS),
    details: FILTER_PRESETS,
  });
});

// API: Get specific preset
app.get('/api/filters/presets/:name', (req: Request, res: Response) => {
  const preset = FILTER_PRESETS[req.params.name as keyof typeof FILTER_PRESETS];
  if (!preset) {
    return res.status(404).json({ error: 'Preset not found' });
  }
  res.json(preset);
});

// API: Build queries from filters
app.post('/api/filters/queries', (req: Request, res: Response) => {
  const filters: LeadFilters = req.body;

  try {
    const builder = new AdvancedQueryBuilder(filters);
    const queries = builder.getAllQueries();
    const summary = builder.getFilterSummary();

    res.json({
      filters,
      queries,
      summary,
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

// API: Validate filters
app.post('/api/filters/validate', (req: Request, res: Response) => {
  const filters: LeadFilters = req.body;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (filters.employeeCount) {
    if (filters.employeeCount.min > filters.employeeCount.max) {
      errors.push('Employee count min must be less than max');
    }
  }

  if (filters.revenue) {
    if (filters.revenue.min > filters.revenue.max) {
      errors.push('Revenue min must be less than max');
    }
  }

  if (filters.foundedYear) {
    const currentYear = new Date().getFullYear();
    if (filters.foundedYear.max > currentYear) {
      warnings.push('Founded year max is in the future');
    }
  }

  if (
    !filters.location &&
    !filters.industry &&
    !filters.jobTitle &&
    !filters.country
  ) {
    warnings.push('No filters specified - results may be very broad');
  }

  res.json({
    valid: errors.length === 0,
    errors,
    warnings,
  });
});

// API: Get data sources status
app.get('/api/sources/status', (req: Request, res: Response) => {
  const scraper = new ProfessionalLeadScraper();
  const sources = scraper.getSourcesStatus();

  res.json({
    sources: sources.map(s => ({
      name: s.name,
      type: s.type,
      enabled: s.enabled,
      priority: s.priority,
    })),
    available: sources.filter(s => s.enabled).length,
    total: sources.length,
  });
});

// API: Set API credential
app.post('/api/sources/:name/credential', (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey) {
    return res.status(400).json({ error: 'API key required' });
  }

  const scraper = new ProfessionalLeadScraper();
  scraper.setApiCredential(req.params.name as string, apiKey as string);

  res.json({
    message: `Credential set for ${req.params.name}`,
    source: req.params.name,
  });
});

// ============ ORIGINAL ENDPOINTS (UPDATED) ============

app.get('/api/jobs', (req: Request, res: Response) => {
  const jobList = Array.from(jobs.values()).sort((a, b) => b.startTime - a.startTime);
  res.json(jobList);
});

// API: Get specific job
app.get('/api/jobs/:id', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id as string);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// API: Start scraping job with optional filters
app.post('/api/jobs/start', (req: Request, res: Response) => {
  const {
    leadCount = 1000,
    queries = ['tech startup CEO', 'software developer'],
    domains = ['github.com', 'techcrunch.com'],
    filters = {} as LeadFilters,
  } = req.body;

  const jobId = generateJobId();
  const job: ScrapeJob = {
    id: jobId,
    status: 'running',
    progress: 0,
    totalLeads: 0,
    targetLeads: leadCount,
    startTime: Date.now(),
    filters,
  };

  jobs.set(jobId, job);

  // Run scraper in background
  (async () => {
    try {
      // Use ProfessionalLeadScraper if filters provided, else RealDataBatchScraper
      if (Object.keys(filters).length > 0) {
        const scraper = new ProfessionalLeadScraper(filters);
        const builder = new AdvancedQueryBuilder(filters);
        const queryData = builder.getAllQueries();

        const leads = await scraper.scrape(
          queryData.hunter,
          queryData.clearbit,
          queryData.apollo
        );

        job.csvFile = await scraper.exportCSV(leads, `leads-${jobId}`);
        job.totalLeads = leads.length;
      } else {
        // Fallback to batch scraper
        const batchScraper = new RealDataBatchScraper({
          outputFile: `leads-${jobId}.csv`,
          delayMs: 800,
        });

        await batchScraper.scrapeBatch(queries, domains, leadCount);
        job.csvFile = `leads-${jobId}.csv`;
        job.totalLeads = leadCount;
      }

      job.status = 'completed';
      job.endTime = Date.now();
    } catch (error) {
      job.status = 'failed';
      job.error = String(error);
      job.endTime = Date.now();
    }
  })();

  res.json(job);
});

// API: Download CSV
app.get('/api/jobs/:id/download', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id as string);
  if (!job || !job.csvFile) {
    return res.status(404).json({ error: 'CSV file not found' });
  }

  const filepath = path.join(process.cwd(), job.csvFile);
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filepath, `leads-${job.id}.csv`);
});

// API: Get statistics
app.get('/api/stats', (req: Request, res: Response) => {
  const jobList = Array.from(jobs.values());
  const totalJobs = jobList.length;
  const completedJobs = jobList.filter(j => j.status === 'completed').length;
  const totalLeadsScraped = jobList
    .filter(j => j.status === 'completed')
    .reduce((sum, j) => sum + j.totalLeads, 0);

  res.json({
    totalJobs,
    completedJobs,
    runningJobs: jobList.filter(j => j.status === 'running').length,
    totalLeadsScraped,
    averageLeadsPerJob: completedJobs > 0 ? totalLeadsScraped / completedJobs : 0,
  });
});

// ============ NEW ADVANCED FEATURES (Hunter.io/Apollo.io parity) ============

// API: Verify leads (email + phone)
app.post('/api/verify', async (req: Request, res: Response) => {
  const { leads } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }

  try {
    const results = await Promise.all(
      leads.map(lead =>
        verificationService.verify({
          email: lead.email,
          phone: lead.phone,
        })
      )
    );

    res.json({
      total: leads.length,
      results: results.map((result, idx) => ({
        lead: leads[idx],
        verification: result,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// API: Bulk verify with operation tracking
app.post('/api/verify/bulk', async (req: Request, res: Response) => {
  const { leads, config = {} } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }

  try {
    const operationId = await bulkOperationService.bulkVerify(leads, {
      verifyEmails: true,
      ...config,
    });

    // Listen to progress events
    bulkOperationService.on('operation:progress', (op: any) => {
      logger.info(`Verification Progress: ${op.operationId} - ${op.progress}%`);
    });

    res.json({
      operationId,
      message: 'Bulk verification started',
      statusUrl: `/api/bulk/${operationId}`,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// API: Score leads comprehensively
app.post('/api/score', (req: Request, res: Response) => {
  const { leads } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }

  try {
    const scoredLeads = leads.map(lead => ({
      lead,
      scoring: leadScorer.scoreLeadComprehensive(lead),
    }));

    const stats = leadScorer.getStats(leads);

    res.json({
      total: leads.length,
      scoredLeads,
      statistics: stats,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// API: Bulk score operation
app.post('/api/score/bulk', async (req: Request, res: Response) => {
  const { leads, config = {} } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }

  try {
    const operationId = await bulkOperationService.bulkScore(leads, {
      scoreLeads: true,
      ...config,
    });

    res.json({
      operationId,
      message: 'Bulk scoring started',
      statusUrl: `/api/bulk/${operationId}`,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// API: Configure CRM integration
app.post('/api/crm/configure', (req: Request, res: Response) => {
  const { platform, apiKey, baseUrl, accountId } = req.body;

  if (!platform || !apiKey) {
    return res.status(400).json({ error: 'platform and apiKey required' });
  }

  try {
    const config: CRMConfig = {
      platform: platform as any,
      apiKey,
      baseUrl,
      accountId,
    };

    crmManager.registerIntegration(config);

    res.json({
      message: `${platform} CRM configured successfully`,
      platform,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// API: Sync leads to CRM
app.post('/api/crm/sync', async (req: Request, res: Response) => {
  const { leads } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }

  try {
    const results = await Promise.all(
      leads.map(lead => crmManager.syncLeadToAll(lead))
    );

    const flatResults = results.flat();
    const successful = flatResults.filter(r => r.success).length;

    res.json({
      total: leads.length,
      successfulSyncs: successful,
      results: flatResults,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// API: Bulk CRM sync with progress tracking
app.post('/api/crm/sync/bulk', async (req: Request, res: Response) => {
  const { leads, config = {} } = req.body;
  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }

  try {
    const operationId = await bulkOperationService.bulkSyncToCRM(leads, {
      syncToCRM: true,
      ...config,
    });

    res.json({
      operationId,
      message: 'Bulk CRM sync started',
      statusUrl: `/api/bulk/${operationId}`,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// API: Get bulk operation status
app.get('/api/bulk/:operationId', (req: Request, res: Response) => {
  const operation = bulkOperationService.getOperation(String(req.params.operationId));
  if (!operation) {
    return res.status(404).json({ error: 'Operation not found' });
  }

  res.json(operation);
});

// API: List active bulk operations
app.get('/api/bulk', (req: Request, res: Response) => {
  const operations = bulkOperationService.getActiveOperations();
  res.json({
    total: operations.length,
    operations,
  });
});

// API: Cancel bulk operation
app.delete('/api/bulk/:operationId', (req: Request, res: Response) => {
  const cancelled = bulkOperationService.cancelOperation(String(req.params.operationId));
  res.json({
    success: cancelled,
    message: cancelled ? 'Operation cancelled' : 'Operation not found or already completed',
  });
});

// API: Get bulk operation history
app.get('/api/bulk/history', (req: Request, res: Response) => {
  const limit = parseInt(String(req.query.limit) || '100');
  const history = bulkOperationService.getOperationHistory(limit);

  res.json({
    count: history.length,
    operations: history,
  });
});

// API: Get global bulk operations statistics
app.get('/api/bulk/stats/global', (req: Request, res: Response) => {
  const stats = bulkOperationService.getGlobalStats();
  res.json(stats);
});

// API: Complete lead enrichment (verify + score + optional CRM sync)
app.post('/api/enrich-complete', async (req: Request, res: Response) => {
  const { leads, includeVerification = true, includeScoring = true, syncToCRM = false } = req.body;

  if (!leads || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'leads array required' });
  }

  try {
    const enrichedLeads = await Promise.all(
      leads.map(async lead => {
        let verification = null;
        let scoring = null;
        let crmSync = null;

        if (includeVerification) {
          verification = await verificationService.verify({
            email: lead.email,
            phone: lead.phone,
          });
        }

        if (includeScoring) {
          scoring = leadScorer.scoreLeadComprehensive(lead);
        }

        if (syncToCRM) {
          crmSync = await crmManager.syncLeadToAll(lead);
        }

        return {
          lead,
          verification,
          scoring,
          crmSync,
          enrichmentLevel: 'complete',
        };
      })
    );

    res.json({
      total: leads.length,
      enrichedLeads,
      config: { includeVerification, includeScoring, syncToCRM },
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

// Serve frontend
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../web/public/index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Web server running at http://localhost:${PORT}`);
  logger.info(`📊 Advanced features enabled:`);
  logger.info(`   ✓ Email/Phone Verification (Hunter.io parity)`);
  logger.info(`   ✓ Advanced Lead Scoring (0-100 with 20+ factors)`);
  logger.info(`   ✓ CRM Integration (HubSpot, Salesforce, Pipedrive)`);
  logger.info(`   ✓ Bulk Operations with Real-time Progress`);
  logger.info(`📡 API Documentation: http://localhost:${PORT}/docs`);
});

export default app;
