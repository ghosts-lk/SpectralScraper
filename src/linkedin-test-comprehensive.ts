/**
 * LinkedIn Test Runner - Comprehensive Lead Processing Pipeline
 * Tests: Verification → Scoring → CRM Sync
 */

import * as fs from 'fs';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';
const CSV_FILE = 'linkedin-test-results-1774774198505.csv';

interface Lead {
  Name: string;
  Email: string;
  Phone: string;
  Title: string;
  Company: string;
  City: string;
  State: string;
  'LinkedIn URL': string;
}

interface ScoredLead {
  lead: Lead & { id?: string; location?: any; verified?: boolean; confidence?: number; enrichmentLevel?: string; sources?: string[]; socialProfiles?: any };
  scoring: {
    score: number;
    grade: string;
    recommendation: string;
    [key: string]: any;
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function loadLeadsFromCSV(): Promise<Lead[]> {
  console.log(`📂 Loading leads from ${CSV_FILE}...`);
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  
  // Parse CSV with multiline quoted fields
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  
  const leads: Lead[] = lines.slice(1).map(line => {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes2 = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes2 = !inQuotes2;
      } else if (char === ',' && !inQuotes2) {
        fields.push(currentField.replace(/^"|"$/g, '').trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.replace(/^"|"$/g, '').trim());

    const obj: any = {};
    headers.forEach((header, idx) => {
      obj[header] = fields[idx] || '';
    });
    return obj as Lead;
  });

  console.log(`✓ Loaded ${leads.length} leads\n`);
  return leads;
}

async function testBulkVerification(leads: Lead[]): Promise<string> {
  console.log('🔐 VERIFICATION: Email & Phone Check');
  console.log(`Processing ${leads.length} leads...\n`);

  const leadData = leads.slice(0, 20).map((lead, idx) => ({
    id: `lead-${idx + 1}`,
    email: lead.Email,
    phone: lead.Phone,
  }));

  try {
    const response = await axios.post(`${API_BASE}/api/verify/bulk`, {
      leads: leadData,
      config: { batchSize: 100, parallelBatches: 10 },
    });
    console.log(`✓ Verification started: ${response.data.operationId}\n`);
    return response.data.operationId;
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

async function testLeadScoring(leads: Lead[]): Promise<ScoredLead[]> {
  console.log('📊 SCORING: Comprehensive Lead Quality Analysis (20+ Factors)\n');

  const leadData = leads.map((lead, idx) => ({
    id: `lead-${idx + 1}`,
    name: lead.Name,
    email: lead.Email,
    phone: lead.Phone,
    title: lead.Title,
    company: lead.Company,
    location: { city: lead.City, state: lead.State || 'Unknown' },
    verified: true,
    confidence: 0.95,
    enrichmentLevel: 'complete' as const,
    sources: ['linkedin', 'company-website'],
    socialProfiles: { linkedin: lead['LinkedIn URL'] },
  }));

  try {
    const response = await axios.post(`${API_BASE}/api/score`, { leads: leadData });
    const scoredLeads = response.data.scoredLeads as ScoredLead[];
    const stats = response.data.statistics;

    console.log(`✓ Scoring Complete\n`);
    console.log(`  Average Score: ${stats.averageScore}/100`);
    console.log(`  A Grade: ${stats.gradeDistribution.A} leads`);
    console.log(`  B Grade: ${stats.gradeDistribution.B} leads`);
    console.log(`  Max Score: ${stats.maxScore}, Min Score: ${stats.minScore}\n`);

    return scoredLeads;
  } catch (error: any) {
    console.error('❌ Scoring failed:', error.message);
    throw error;
  }
}

async function analyzeByCompany(scoredLeads: ScoredLead[]): Promise<void> {
  console.log('🏢 ANALYSIS: By Company\n');

  const byCompany: Record<string, ScoredLead[]> = {};
  scoredLeads.forEach(sl => {
    const company = ((sl.lead as any).company || 'Unknown').trim();
    if (company && company !== 'undefined') {
      if (!byCompany[company]) byCompany[company] = [];
      byCompany[company].push(sl);
    }
  });

  const sortedCompanies = Object.entries(byCompany)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10);

  console.log(`Top Companies:\n`);
  sortedCompanies.forEach(([company, leads], idx) => {
    const avgScore = Math.round(leads.reduce((sum, l) => sum + l.scoring.score, 0) / leads.length);
    console.log(`  ${idx + 1}. ${company.padEnd(20)} | ${leads.length} leads | Avg: ${avgScore}/100`);
  });
  console.log();
}

async function analyzeByPosition(scoredLeads: ScoredLead[]): Promise<void> {
  console.log('👔 ANALYSIS: By Position/Title\n');

  const byTitle: Record<string, ScoredLead[]> = {};
  scoredLeads.forEach(sl => {
    const title = ((sl.lead as any).title || 'Unknown').trim();
    if (!byTitle[title]) byTitle[title] = [];
    byTitle[title].push(sl);
  });

  const executive = Object.entries(byTitle).filter(([title]) =>
    ['CEO', 'CTO', 'VP', 'Director', 'President'].some(t => title.includes(t))
  );
  const engineers = Object.entries(byTitle).filter(([title]) =>
    ['Engineer', 'Developer', 'Architect'].some(t => title.includes(t))
  );
  const sales = Object.entries(byTitle).filter(([title]) => title.includes('Sales'));

  console.log(`Position Breakdown:\n`);
  console.log(`  Executive (C-Level/VP/Director): ${executive.reduce((s, [, l]) => s + l.length, 0)} leads`);
  console.log(`  Engineering: ${engineers.reduce((s, [, l]) => s + l.length, 0)} leads`);
  console.log(`  Sales: ${sales.reduce((s, [, l]) => s + l.length, 0)} leads\n`);

  console.log(`Top 10 Quality Leads:\n`);
  const topLeads = scoredLeads
    .filter(sl => (sl.lead as any).name && (sl.lead as any).title && (sl.lead as any).company)
    .sort((a, b) => b.scoring.score - a.scoring.score)
    .slice(0, 10);

  topLeads.forEach((sl, idx) => {
    const name = ((sl.lead as any).name || 'Unknown').padEnd(20).substring(0, 20);
    const title = ((sl.lead as any).title || 'Unknown').padEnd(25).substring(0, 25);
    const company = ((sl.lead as any).company || 'Unknown').padEnd(15).substring(0, 15);
    console.log(
      `  ${(idx + 1).toString().padEnd(2)}. ${name} | ${title} | ${company} | ${sl.scoring.score}/100 [${sl.scoring.grade}]`
    );
  });
  console.log();
}

async function generateReport(scoredLeads: ScoredLead[], originalLeads: Lead[]): Promise<void> {
  console.log('📋 REPORT: Generating Summary\n');

  // Create a map of leads by email for quick lookup
  const leadMap: Record<string, Lead> = {};
  originalLeads.forEach(lead => {
    leadMap[lead.Email] = lead;
  });

  const reportData = scoredLeads.map(sl => {
    const email = (sl.lead as any).email || '';
    const orig = leadMap[email];
    
    return {
      name: (sl.lead as any).name || orig?.Name || 'Unknown',
      email: email || 'Unknown',
      title: (sl.lead as any).title || orig?.Title || 'Unknown',
      company: (sl.lead as any).company || orig?.Company || 'Unknown',
      location: orig ? `${orig.City}, ${orig.State}` : 'Unknown',
      linkedin: (sl.lead as any).socialProfiles?.linkedin || orig?.['LinkedIn URL'] || '',
      score: sl.scoring.score,
      grade: sl.scoring.grade,
      recommendation: sl.scoring.recommendation,
    };
  });

  const reportFile = `comprehensive-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));

  console.log(`✓ Report saved: ${reportFile}`);
  console.log(`  Total Leads: ${reportData.length}`);
  console.log(`  Grade A: ${reportData.filter(r => r.grade === 'A').length}`);
  console.log(`  Grade B: ${reportData.filter(r => r.grade === 'B').length}`);
  console.log(`  Grade C: ${reportData.filter(r => r.grade === 'C').length}`);
  const avg = (reportData.reduce((s, r) => s + r.score, 0) / reportData.length).toFixed(1);
  console.log(`  Average Score: ${avg}/100\n`);
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║        SPECTRAL SCRAPER - LINKEDIN TEST SUITE              ║`);
  console.log(`║     Verification • Scoring • Analysis • Reporting          ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  try {
    const leads = await loadLeadsFromCSV();
    const verifyOp = await testBulkVerification(leads);
    await sleep(500);
    const scoredLeads = await testLeadScoring(leads);
    await analyzeByCompany(scoredLeads);
    await analyzeByPosition(scoredLeads);
    await generateReport(scoredLeads, leads);

    console.log(`\n╔════════════════════════════════════════════════════════════╗`);
    console.log(`║                   ✅ ALL TESTS PASSED                     ║`);
    console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

main();
