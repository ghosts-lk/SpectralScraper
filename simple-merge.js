const fs = require('fs');

function parseCSV(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map(line => {
    const obj = {};
    let col = 0;
    let inQuotes = false;
    let current = '';
    for (let char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) {
        obj[header[col++]] = current.replace(/^"|"$/g, '').trim();
        current = '';
      } else {
        current += char;
      }
    }
    if (col < header.length) obj[header[col]] = current.replace(/^"|"$/g, '').trim();
    return obj;
  });
}

const leads = new Map();

// GitHub
try {
  const gh = parseCSV('github-real-leads.csv');
  gh.forEach(r => {
    const key = (r.Name || r.Username || '').toLowerCase();
    if (key) leads.set(key, { name: r.Name || r.Username, email: r.Email || '', company: r.Company || '', title: 'Developer', location: r.Location || '', source: 'GitHub', url: r['GitHub URL'] || '', verified: 'Yes', score: '85' });
  });
  console.log(`✅ GitHub: ${gh.length} leads`);
} catch(e) { console.error('GitHub error:', e.message); }

// LinkedIn
try {
  const li = parseCSV('linkedin-test-results-1774774198505.csv');
  li.forEach(r => {
    const key = (r.Name || '').toLowerCase();
    if (key && key !== 'name') leads.set(key, { name: r.Name || '', email: r.Email || '', company: r.Company || '', title: r.Title || '', location: r.City || '', source: 'LinkedIn', url: r['LinkedIn URL'] || '', verified: r.Verified === 'Yes' ? 'Yes' : 'Partial', score: r.Score || '75' });
  });
  console.log(`✅ LinkedIn: ${li.length} leads`);
} catch(e) { console.error('LinkedIn error:', e.message); }

// Spectral
try {
  const sp = parseCSV('spectral-leads_2026-03-29.csv');
  sp.forEach(r => {
    if (r.Email && r.Email !== 'Email') {
      const key = (r.Email).toLowerCase();
      if (!leads.has(key)) leads.set(key, { name: r.Name || '', email: r.Email, company: r.Company || '', title: r.Title || '', location: r.City || '', source: 'Spectral', url: '', verified: 'Partial', score: '60' });
    }
  });
  console.log(`✅ Spectral: ${sp.length} leads`);
} catch(e) { console.error('Spectral error:', e.message); }

// Export
const sorted = Array.from(leads.values()).sort((a, b) => b.score - a.score);
let csv = 'name,email,company,title,location,source,url,verified,score\n';
sorted.forEach(l => {
  csv += `"${l.name}","${l.email}","${l.company}","${l.title}","${l.location}","${l.source}","${l.url}","${l.verified}",${l.score}\n`;
});
fs.writeFileSync('FINAL_MERGED_LEADS.csv', csv);
console.log(`\n🎯 MERGED: ${leads.size} deduplicated real leads saved to FINAL_MERGED_LEADS.csv`);
