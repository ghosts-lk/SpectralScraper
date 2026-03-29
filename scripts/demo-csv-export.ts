#!/usr/bin/env node

/**
 * Quick demo of CSV export with realistic lead data
 */

import * as fs from 'fs';
import * as path from 'path';
import { Lead } from '../src/types';
import { exportLeadsToCSV } from '../src/index';

// Generate realistic sample leads
const sampleLeads: Lead[] = [
  {
    id: 'lead-001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-415-555-0123',
    title: 'CEO',
    company: 'TechCorp Inc',
    industry: 'Software',
    website: 'www.techcorp.com',
    location: { city: 'San Francisco', state: 'CA', country: 'USA' },
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/sarah-johnson',
      twitter: '@sarahtech',
    },
    score: 92,
    sources: ['company_website', 'linkedin'],
    enrichmentLevel: 'enriched',
    confidence: 0.95,
    lastUpdated: new Date(),
    verified: true,
    tags: ['founder', 'investor'],
  },
  {
    id: 'lead-002', 
    name: 'Michael Chen',
    email: 'm.chen@datalab.io',
    phone: '+1-650-555-0456',
    title: 'CTO',
    company: 'DataLab AI',
    industry: 'Artificial Intelligence',
    website: 'www.datalab.io',
    location: { city: 'Mountain View', state: 'CA', country: 'USA' },
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/michael-chen',
      github: 'https://github.com/mchen',
    },
    score: 88,
    sources: ['github', 'company_website'],
    enrichmentLevel: 'enriched',
    confidence: 0.92,
    lastUpdated: new Date(),
    verified: true,
  },
  {
    id: 'lead-003',
    name: 'Emma Rodriguez',
    email: 'emma@cloudservices.net',
    phone: '+1-206-555-0789',
    title: 'VP Product',
    company: 'CloudServices Pro',
    industry: 'Cloud Computing',
    website: 'www.cloudservices.net',
    location: { city: 'Seattle', state: 'WA', country: 'USA' },
    socialProfiles: {
      linkedin: 'https://linkedin.com/in/emma-rodriguez',
      twitter: '@emmaprod',
    },
    score: 85,
    sources: ['company_website', 'hunter_io'],
    enrichmentLevel: 'enriched',
    confidence: 0.88,
    lastUpdated: new Date(),
    verified: true,
  },
];

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   CSV EXPORT DEMO WITH REAL LEADS     ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📊 Exporting ${sampleLeads.length} sample leads to CSV...\n`);

  try {
    const csvPath = await exportLeadsToCSV(sampleLeads, 'sample-leads');
    
    // Read and display the CSV
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log('✅ CSV Created Successfully!\n');
    console.log('📁 File:', csvPath);
    console.log('📊 Size:', (fs.statSync(csvPath).size / 1024).toFixed(2), 'KB\n');
    
    console.log('📋 CSV Preview:\n');
    const lines = csvContent.split('\n');
    lines.slice(0, 5).forEach(line => console.log(line));
    if (lines.length > 5) {
      console.log('...');
    }
    
    console.log('\n✨ Demo complete! You can now:');
    console.log('   1. Scale up to 100k leads with: npm run scrape:100k');
    console.log('   2. Customize queries and domains in scripts/batch-scraper.ts');
    console.log('   3. Integrate with your CRM or database\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
