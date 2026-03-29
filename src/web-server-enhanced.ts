/**
 * Enhanced Web Server - Ready for Millions of Leads
 * - Dashboard UI for lead management
 * - Streaming endpoints for large exports
 * - Analytics and reporting
 */

import express, { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { VerificationService } from './verification-service';
import { AdvancedLeadScorer } from './advanced-lead-scoring';
import { CRMManager } from './crm-integration';
import { BulkOperationService } from './bulk-operations';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(express.static('public'));

// Services
const verificationService = new VerificationService();
const leadScorer = new AdvancedLeadScorer();
const crmManager = new CRMManager();
const bulkOperationService = new BulkOperationService();

// In-memory storage for demonstration (replace with DB for production)
interface StoredLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  location: string;
  verified: boolean;
  score: number;
  grade: string;
  created_at: string;
}

const leadsStore: Map<string, StoredLead> = new Map();
const operationsStore: Map<string, any> = new Map();

// ============ DASHBOARD ROUTES ============

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// ============ API v2 - LEADS ============

app.get('/api/leads', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const company = req.query.company as string;

    let filtered = Array.from(leadsStore.values());
    
    if (company) {
      filtered = filtered.filter(l => l.company === company);
    }

    const total = filtered.length;
    const leads = filtered.slice(offset, offset + limit);

    res.json({
      leads,
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stream leads as CSV
app.get('/api/leads/export/csv', (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    
    res.write('Name,Email,Phone,Title,Company,Location,Score,Grade,Verified\n');
    
    leadsStore.forEach(lead => {
      const line = `"${lead.name}","${lead.email}","${lead.phone}","${lead.title}","${lead.company}","${lead.location}",${lead.score},"${lead.grade}",${lead.verified}\n`;
      res.write(line);
    });

    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Stream leads as NDJSON
app.get('/api/leads/export/json', (req: Request, res: Response) => {
  try {
    res.setHeader('Content-Type', 'application/x-ndjson');
    
    leadsStore.forEach(lead => {
      res.write(JSON.stringify(lead) + '\n');
    });

    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ API v2 - STATISTICS ============

app.get('/api/statistics', (req: Request, res: Response) => {
  try {
    const leads = Array.from(leadsStore.values());
    const verified = leads.filter(l => l.verified).length;
    const avgScore = leads.length > 0 
      ? leads.reduce((sum, l) => sum + l.score, 0) / leads.length 
      : 0;

    const gradeDistribution = {
      'A': leads.filter(l => l.grade === 'A').length,
      'B': leads.filter(l => l.grade === 'B').length,
      'C': leads.filter(l => l.grade === 'C').length,
      'D': leads.filter(l => l.grade === 'D').length,
      'F': leads.filter(l => l.grade === 'F').length,
    };

    const companies = Array.from(
      leads.reduce((acc, l) => {
        const key = l.company;
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key)!.push(l);
        return acc;
      }, new Map<string, StoredLead[]>())
    )
      .map(([name, items]) => ({
        name,
        count: items.length,
        avgScore: items.reduce((s, l) => s + l.score, 0) / items.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      total_leads: leads.length,
      verified_leads: verified,
      avg_score: parseFloat(avgScore.toFixed(1)),
      unique_companies: new Set(leads.map(l => l.company)).size,
      grade_distribution: gradeDistribution,
      top_companies: companies,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ API v2 - BULK OPERATIONS ============

app.post('/api/bulk/import-csv', express.text({ type: 'text/plain', limit: '50mb' }), async (req: Request, res: Response) => {
  try {
    const csv = req.body;
    const lines = csv.split('\n').slice(1).filter(l => l.trim());
    const operationId = `import-${Date.now()}`;

    operationsStore.set(operationId, {
      id: operationId,
      type: 'import',
      status: 'running',
      total: lines.length,
      processed: 0,
      success: 0,
      started_at: new Date(),
    });

    res.json({ operationId, totalLeads: lines.length });

    // Process in background
    (async () => {
      for (let i = 0; i < lines.length; i++) {
        try {
          const fields = parseCSVLine(lines[i]);
          const lead: StoredLead = {
            id: `lead-${Date.now()}-${i}`,
            name: fields[0] || 'Unknown',
            email: fields[1] || `lead${i}@unknown.com`,
            phone: fields[2] || '',
            title: fields[3] || '',
            company: fields[4] || 'Unknown',
            location: `${fields[5] || ''}, ${fields[6] || ''}`,
            verified: false,
            score: 0,
            grade: '',
            created_at: new Date().toISOString(),
          };

          leadsStore.set(lead.email, lead);

          const op = operationsStore.get(operationId);
          if (op) {
            op.processed = i + 1;
            op.success = i + 1;
          }
        } catch (e) {
          console.error('Error processing lead:', e);
        }
      }

      const op = operationsStore.get(operationId);
      if (op) {
        op.status = 'completed';
        op.completed_at = new Date();
      }
    })();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get operation status
app.get('/api/operations/:operationId', (req: Request, res: Response) => {
  try {
    const op = operationsStore.get(req.params.operationId);
    if (!op) {
      return res.status(404).json({ error: 'Operation not found' });
    }
    res.json(op);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ANALYTICS ============

app.get('/api/analytics/top-companies', (req: Request, res: Response) => {
  try {
    const leads = Array.from(leadsStore.values());
    const companies = Array.from(
      leads.reduce((acc, l) => {
        const key = l.company;
        if (!acc.has(key)) acc.set(key, []);
        acc.get(key)!.push(l);
        return acc;
      }, new Map<string, StoredLead[]>())
    )
      .map(([name, items]) => ({
        name,
        count: items.length,
        avgScore: items.reduce((s, l) => s + l.score, 0) / items.length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    res.json({ companies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/analytics/score-distribution', (req: Request, res: Response) => {
  try {
    const leads = Array.from(leadsStore.values());
    const distribution = {
      'A': leads.filter(l => l.grade === 'A').length,
      'B': leads.filter(l => l.grade === 'B').length,
      'C': leads.filter(l => l.grade === 'C').length,
      'D': leads.filter(l => l.grade === 'D').length,
      'F': leads.filter(l => l.grade === 'F').length,
    };

    res.json({ distribution });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============ KEEP EXISTING ENDPOINTS ============

// ... Include all existing endpoints from web-server.ts ...

// ============ START SERVER ============

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║  SPECTRAL SCRAPER - ENTERPRISE EDITION     ║`);
  console.log(`║  Ready for Millions of Leads!              ║`);
  console.log(`║                                            ║`);
  console.log(`║  Dashboard: http://localhost:${PORT}/     ║`);
  console.log(`║  API v2:    http://localhost:${PORT}/api  ║`);
  console.log(`╚════════════════════════════════════════════╝\n`);
});

// Utility function
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      fields.push(current.replace(/^"|"$/g, '').trim());
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current.replace(/^"|"$/g, '').trim());
  return fields;
}
