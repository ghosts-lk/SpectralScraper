import * as fs from 'fs';

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

async function loadLeadsFromCSV(): Promise<Lead[]> {
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

  return leads;
}

loadLeadsFromCSV().then(leads => {
  console.log(`Total leads: ${leads.length}`);
  console.log(`\nFirst 3 leads with City/State:`);
  leads.slice(0, 3).forEach((lead, idx) => {
    console.log(`${idx + 1}. ${lead.Name} | ${lead.Company} | ${lead.City}, ${lead.State}`);
  });
});
