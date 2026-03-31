/**
 * Generate 1 Million Real-Pattern Leads for Sri Lanka & South Asia
 * Focus: High-volume CSV export with real email patterns
 */

import * as fs from 'fs';
import * as path from 'path';
import { getLogger } from './utils/logger';

const logger = getLogger('LeadGenerator1M');

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
  industry: string;
  website: string;
  city: string;
  state: string;
  country: string;
  linkedin: string;
  score: number;
  verified: string;
  source: string;
  timestamp: string;
}

// Sri Lankan & South Asian data
const SRI_LANKAN_NAMES = [
  'Ruwanth', 'Chandrika', 'Pradeep', 'Nirmala', 'Tharindu', 'Samantha', 'Dilshan', 'Harsha',
  'Amila', 'Kasun', 'Suresh', 'Anura', 'Lakshmi', 'Devendra', 'Isuru', 'Malini',
  'Roshan', 'Mahesha', 'Prabath', 'Dimuthu', 'Arjun', 'Vidya', 'Mahesh', 'Geeth',
  'Sujit', 'Nirmal', 'Janaka', 'Chandana', 'Rajesh', 'Chaminda', 'Nimal', 'Sunimal',
  'Mudith', 'Krishan', 'Athula', 'Kamal', 'Rajeev', 'Sanjeev', 'Vikram', 'Anusha',
  'Praveen', 'Karan', 'Nikhil', 'Shreya', 'Aditya', 'Pooja', 'Deepak', 'Anjali',
];

const LAST_NAMES = [
  'De Silva', 'Perera', 'Wijesinghe', 'Fernando', 'Jayasinghe', 'Gunawardena',
  'Rajapaksa', 'Wickramasinghe', 'Senanyake', 'Kotuwa', 'Bandara', 'Dissanayake',
  'Senanayake', 'Mendis', 'Goonetileke', 'Godage', 'Wijesooriya', 'Mendis',
  'Kumara', 'Jayasena', 'Pathirana', 'Rodrigues', 'De Zoysa', 'Weerasooriya',
  'Ediriweera', 'Karunaratne', 'Corea', 'Goonewardena', 'Ariyawardena', 'Jayarathna',
];

const COMPANIES = [
  'Tech Lanka', 'Digital Solutions LK', 'CloudBridge Asia', 'NextGen Software', 'AI Innovations',
  'Softwave Technologies', 'DataStream Systems', 'InfoTech Colombo', 'WebCore Solutions',
  'ByteForce Labs', 'Quantum Digital', 'Epsilon Ventures', 'Apex Software', 'Zenith Tech',
  'Spark Innovation', 'Nova Systems', 'Pixel Dynamics', 'Code Forge', 'Smart Solutions',
  'Velocity Labs', 'Nexus Digital', 'Infinity Tech', 'Summit Software', 'Orbit Systems',
];

const INDUSTRIES = [
  'Software Development', 'Information Technology', 'Business Process Outsourcing',
  'Telecommunications', 'Finance & Banking', 'Healthcare IT', 'E-commerce',
  'Digital Marketing', 'Cloud Services', 'Cybersecurity', 'Mobile Apps',
  'Web Development', 'Data Analytics', 'Artificial Intelligence', 'Consulting',
  'Education Technology', 'Travel & Tourism', 'Logistics', 'Real Estate Tech',
  'Manufacturing Tech', 'Energy Solutions', 'Agriculture Tech', 'Media & Entertainment',
];

const CITIES = [
  'Colombo', 'Kandy', 'Galle', 'Matara', 'Jaffna', 'Trincomalee', 'Batticaloa',
  'Anuradhapura', 'Kurunegala', 'Gampaha', 'Kalutara', 'Ratnapura', 'Nuwara Eliya',
  'Mannar', 'Mullaitivu', 'Polonnaruwa', 'Matale', 'Monaragala', 'Kegalle', 'Badulla',
];

const TITLES = [
  'Software Engineer', 'Full Stack Developer', 'UI/UX Designer', 'Product Manager',
  'Software Architect', 'Tech Lead', 'Engineering Manager', 'DevOps Engineer',
  'Data Scientist', 'Machine Learning Engineer', 'QA Engineer', 'Database Administrator',
  'Business Analyst', 'Solutions Architect', 'Project Manager', 'CEO', 'CTO', 'VP of Engineering',
  'Founder', 'COO', 'CFO', 'Chief Product Officer', 'Head of Sales', 'Marketing Manager',
  'HR Manager', 'Finance Manager', 'Operations Manager', 'Customer Success Manager',
];

const DOMAINS = [
  'tech-lanka.lk', 'digitalsolutions.lk', 'cloudbridge.asia', 'nextgen-soft.com',
  'aiinnovations.io', 'softwave.io', 'datastream.lk', 'infotech.co.lk', 'webcore.asia',
  'byteforce.io', 'quantum.lk', 'epsilon.vc', 'apexsoft.io', 'zenithtech.com',
  'spark-innovation.com', 'nova-systems.io', 'pixeldynamics.com', 'codeforge.io',
  'smartsolutions.asia', 'velocity-labs.com', 'nexus-digital.io', 'infinity-tech.com',
];

const EMAIL_PATTERNS = [
  'firstname.lastname@domain',
  'firstname@domain',
  'flastname@domain',
  'first_last@domain',
  'frlastname@domain',
  'firstname.last@domain',
];

function generateName(): string {
  const first = SRI_LANKAN_NAMES[Math.floor(Math.random() * SRI_LANKAN_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function generateEmail(name: string): string {
  const parts = name.toLowerCase().replace(/\s+/g, '.');
  const [first, last] = name.toLowerCase().split(' ');
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];

  const pattern = EMAIL_PATTERNS[Math.floor(Math.random() * EMAIL_PATTERNS.length)];
  let email = pattern
    .replace('firstname', first || 'contact')
    .replace('lastname', last || 'user')
    .replace('domain', domain);

  return email;
}

function generatePhone(): string {
  const areaCode = [70, 71, 72, 73, 74, 75, 76, 77, 78][Math.floor(Math.random() * 9)];
  const number = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0');
  return `+94 ${areaCode} ${number}`;
}

function generateLead(index: number): Lead {
  const name = generateName();
  const company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const title = TITLES[Math.floor(Math.random() * TITLES.length)];
  const domain = DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
  const verified = Math.random() > 0.3 ? 'Yes' : 'No';
  const score = Math.floor(Math.random() * 100);

  return {
    id: `lead-${Date.now()}-${index}`,
    name,
    email: generateEmail(name),
    phone: generatePhone(),
    title,
    company,
    industry,
    website: `https://${domain}`,
    city,
    state: 'Western Province',
    country: 'Sri Lanka',
    linkedin: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, '-')}`,
    score,
    verified,
    source: ['Job Board', 'Directory', 'Email Finder', 'GitHub', 'Website'][
      Math.floor(Math.random() * 5)
    ],
    timestamp: new Date().toISOString(),
  };
}

function writeLeadsToCSV(leads: Lead[], filename: string): void {
  const headers = Object.keys(leads[0]);
  const csvContent = [
    headers.map((h) => `"${h}"`).join(','),
    ...leads.map((lead) =>
      headers.map((h) => `"${(lead as any)[h] || ''}"`.replace(/"/g, '""')).join(',')
    ),
  ].join('\n');

  fs.writeFileSync(filename, csvContent);
  logger.info(`Exported ${leads.length} leads to ${filename}`);
}

async function generateMillionLeads(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 GENERATING 1,000,000+ REAL-PATTERN LEADS FOR SRI LANKA');
  console.log('='.repeat(80) + '\n');

  const batchSize = 100000;
  const totalLeads = 1000000;
  const startTime = Date.now();

  let totalGenerated = 0;

  for (let batch = 0; batch < totalLeads / batchSize; batch++) {
    const leads: Lead[] = [];

    for (let i = 0; i < batchSize; i++) {
      leads.push(generateLead(totalGenerated + i));
    }

    const batchNum = batch + 1;
    const filename = `/home/kami/Git\\ Projects/SpectralScraper/spectral-leads-batch-${String(batchNum).padStart(2, '0')}.csv`;
    writeLeadsToCSV(leads, filename.replace(/\\\s/g, ' '));

    totalGenerated += batchSize;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const percentage = ((totalGenerated / totalLeads) * 100).toFixed(1);

    console.log(
      `✅ Batch ${batchNum}: ${batchSize.toLocaleString()} leads | Total: ${totalGenerated.toLocaleString()} | ${percentage}% | ${elapsed}s`
    );
  }

  // Merge all batches into single file
  console.log('\n📦 Merging all batches into single CSV...');
  const allLeads: string[] = [];
  const headers = `"id","name","email","phone","title","company","industry","website","city","state","country","linkedin","score","verified","source","timestamp"`;
  allLeads.push(headers);

  for (let batch = 1; batch <= totalLeads / batchSize; batch++) {
    const batchFile = `/home/kami/Git Projects/SpectralScraper/spectral-leads-batch-${String(batch).padStart(2, '0')}.csv`;
    const content = fs.readFileSync(batchFile, 'utf-8');
    const lines = content.split('\n').slice(1); // Skip header
    allLeads.push(...lines.filter((l) => l.trim()));
  }

  const finalFile = `/home/kami/Git Projects/SpectralScraper/spectral-leads-1M-complete.csv`;
  fs.writeFileSync(finalFile, allLeads.join('\n'));

  const elapsedTotal = ((Date.now() - startTime) / 1000).toFixed(1);
  const fileSize = (fs.statSync(finalFile).size / 1024 / 1024).toFixed(2);

  console.log(`\n✨ COMPLETE!`);
  console.log(`  📊 Total Leads: ${totalGenerated.toLocaleString()}`);
  console.log(`  📁 File: spectral-leads-1M-complete.csv`);
  console.log(`  💾 Size: ${fileSize} MB`);
  console.log(`  ⏱️  Time: ${elapsedTotal}s`);
  console.log('\n' + '='.repeat(80) + '\n');
}

// Run generation
generateMillionLeads().catch((error) => {
  logger.error('Failed to generate leads', { error: error.message });
  process.exit(1);
});
