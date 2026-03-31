/**
 * Quick GitHub Real Data Collector
 * Minimal dependencies - pure axios
 */

import axios from 'axios';

async function quickGitHubScrape() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 QUICK GITHUB REAL DATA COLLECTION');
  console.log('═'.repeat(80) + '\n');

  const queries = [
    'CEO location:Sri Lanka',
    'CTO location:Colombo', 
    'Founder language:TypeScript location:Asia',
  ];

  const client = axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SpectralScraper/1.0',
    },
    timeout: 10000,
  });

  const allLeads: any[] = [];

  for (const query of queries) {
    try {
      console.log(`\n🔍 Searching: "${query}"`);
      
      const resp = await client.get(
        `/search/users?q=${encodeURIComponent(query)}&per_page=10&sort=followers`
      );

      const users = resp.data.items || [];
      console.log(`   Found: ${users.length} profiles\n`);

      for (const user of users.slice(0, 5)) {
        try {
          const profileResp = await client.get(`/users/${user.login}`);
          const profile = profileResp.data;

          const lead = {
            username: profile.login,
            name: profile.name || profile.login,
            email: profile.email || '',
            company: profile.company || '',
            location: profile.location || '',
            bio: profile.bio || '',
            url: profile.html_url,
            followers: profile.followers,
          };

          allLeads.push(lead);
          
          console.log(`   ✓ ${lead.name} (${lead.company || 'no company'}) - ${lead.location}`);

          await new Promise(r => setTimeout(r, 400));
        } catch (e) {
          // skip
        }
      }

      await new Promise(r => setTimeout(r, 1500));
    } catch (error) {
      console.error(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ RESULTS');
  console.log('═'.repeat(80) + '\n');
  console.log(`Total Real Leads: ${allLeads.length}\n`);

  allLeads.forEach((lead, idx) => {
    console.log(`[${idx + 1}] ${lead.name}`);
    console.log(`    Email: ${lead.email || '(not public)'}`);
    console.log(`    Company: ${lead.company}`);
    console.log(`    Location: ${lead.location}`);
    console.log(`    GitHub: ${lead.url}`);
    console.log('');
  });

  // Export to CSV
  const csv = [
    ['Name', 'Username', 'Email', 'Company', 'Location', 'Bio', 'GitHub URL', 'Followers'],
    ...allLeads.map(l => [
      l.name,
      l.username,
      l.email,
      l.company,
      l.location,
      l.bio.replace(/,/g, ';'),
      l.url,
      l.followers,
    ]),
  ]
    .map(row => row.map(v => `"${v}"`).join(','))
    .join('\n');

  const fs = require('fs');
  fs.writeFileSync('github-real-leads.csv', csv);
  console.log('💾 Exported: github-real-leads.csv\n');
}

quickGitHubScrape().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
