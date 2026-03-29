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

  console.log(`Total lines: ${lines.length}`);
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  console.log(`Headers: ${JSON.stringify(headers)}`);
  
  const leads: Lead[] = lines.slice(1).map((line, lineIdx) => {
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
    
    if (lineIdx < 3) {
      console.log(`\nLead ${lineIdx + 1}:`);
      console.log(JSON.stringify(obj, null, 2));
    }
    
    return obj as Lead;
  });

  return leads;
}

loadLeadsFromCSV().then(leads => {
  console.log(`\n✓ Loaded ${leads.length} leads`);
  console.log(`First lead company: "${leads[0].Company}"`);
  console.log(`First lead title: "${leads[0].Title}"`);
});
