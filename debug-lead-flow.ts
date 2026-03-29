import * as fs from 'fs';
import axios from 'axios';

const CSV_FILE = 'linkedin-test-results-1774774198505.csv';
const API_BASE = 'http://localhost:3000';

async function loadLeadsFromCSV() {
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
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
  
  const leads = lines.slice(1).slice(0, 2).map((line, lineIdx) => {
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
    return obj;
  });

  return leads;
}

async function test() {
  const leads = await loadLeadsFromCSV();
  console.log('CSV Leads (first 2):');
  console.log(JSON.stringify(leads, null, 2));
  
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
    enrichmentLevel: 'complete',
    sources: ['linkedin', 'company-website'],
    socialProfiles: { linkedin: lead['LinkedIn URL'] },
  }));

  console.log('\nData sent to API (first 2):');
  console.log(JSON.stringify(leadData, null, 2));

  const response = await axios.post(`${API_BASE}/api/score`, { leads: leadData });
  
  console.log('\nAPI Response scoredLeads (first 2):');
  console.log(JSON.stringify(response.data.scoredLeads.slice(0, 2), null, 2));
}

test().catch(e => console.error(e.message));
