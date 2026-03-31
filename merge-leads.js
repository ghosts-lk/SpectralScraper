const fs = require('fs');
const csv = require('csv-parse/sync');
const stringify = require('csv-stringify/sync');

const leads = {};
const sources = [];

// Parse GitHub leads
if (fs.existsSync('github-real-leads.csv')) {
  const content = fs.readFileSync('github-real-leads.csv', 'utf8');
  const records = csv.parse(content, { columns: true, skip_empty_lines: true });
  records.forEach(r => {
    const key = (r.Name || r.Username || r.Email || '').toLowerCase().trim();
    if (key) {
      leads[key] = { 
        name: r.Name || r.Username || '', 
        email: r.Email || '', 
        company: r.Company || '', 
        title: 'GitHub Developer',
        location: r.Location || '', 
        source: 'GitHub', 
        url: r['GitHub URL'] || r.LinkedIn || '',
        verified: 'Yes',
        score: 85
      };
      sources.push('GitHub');
    }
  });
  console.log(`✅ GitHub: ${records.length} leads`);
}

// Parse LinkedIn results
if (fs.existsSync('linkedin-test-results-1774774198505.csv')) {
  const content = fs.readFileSync('linkedin-test-results-1774774198505.csv', 'utf8');
  const records = csv.parse(content, { columns: true, skip_empty_lines: true });
  records.forEach(r => {
    const key = (r.Name || r.Email || '').toLowerCase().trim();
    if (key && key !== 'name') {
      leads[key] = { 
        name: r.Name || '', 
        email: r.Email || '', 
        company: r.Company || '', 
        title: r.Title || 'Professional',
        location: `${r.City || ''}${r.State ? ', ' + r.State : ''}`.trim(),
        source: 'LinkedIn',
        url: r['LinkedIn URL'] || '',
        verified: r.Verified === 'Yes' ? 'Yes' : 'Partial',
        score: parseInt(r.Score) || 75
      };
      sources.push('LinkedIn');
    }
  });
  console.log(`✅ LinkedIn: ${records.length} leads`);
}

// Parse Spectral leads
if (fs.existsSync('spectral-leads_2026-03-29.csv')) {
  const content = fs.readFileSync('spectral-leads_2026-03-29.csv', 'utf8');
  const records = csv.parse(content, { columns: true, skip_empty_lines: true });
  records.forEach(r => {
    const key = (r.Name || r.Email || '').toLowerCase().trim();
    if (key && key !== 'name' && r.Email) {
      leads[key] = { 
        name: r.Name || '', 
        email: r.Email || '', 
        company: r.Company || '', 
        title: r.Title || 'Contact',
        location: `${r.City || ''}${r.State ? ', ' + r.State : ''}`.trim(),
        source: 'Spectral Enrichment',
        url: r.LinkedIn || '',
        verified: r.Verified || 'No',
        score: parseInt(r.Score) || 60
      };
      sources.push('Spectral');
    }
  });
  console.log(`✅ Spectral: ${records.length} leads`);
}

// Convert to export format
const final = Object.values(leads).sort((a, b) => b.score - a.score);
const output = stringify(final, {
  header: true,
  columns: ['name', 'email', 'company', 'title', 'location', 'source', 'url', 'verified', 'score']
});

fs.writeFileSync('FINAL_MERGED_LEADS.csv', output);
console.log(`\n🎯 FINAL RESULT: ${final.length} deduplicated leads exported to FINAL_MERGED_LEADS.csv`);
