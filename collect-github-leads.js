#!/usr/bin/env node

/**
 * GitHub Real Data Lead Collector - Plain Node.js
 * No TypeScript, no build step needed
 */

const axios = require('axios');
const fs = require('fs');
const https = require('https');

// Track stats
let totalCollected = 0;
let totalRequests = 0;

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      totalRequests++;
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SpectralScraper/1.0 RealLeads',
        },
        timeout: 8000,
      });
      return response.data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
}

async function collectGitHubLeads() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 GITHUB API - REAL LEAD COLLECTION');
  console.log('═'.repeat(80) + '\n');

  const queries = [
    'CEO location:Sri Lanka',
    'CTO location:Sri Lanka',
    'Founder language:TypeScript location:Colombo',
    'CEO followers:>50',
    'Developer CEO:true',
  ];

  const leads = [];

  for (const q of queries) {
    try {
      console.log(`\n📍 Query: "${q}"`);

      // Search users
      const searchUrl = `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=8&sort=followers`;
      const searchData = await fetchWithRetry(searchUrl);

      const users = (searchData.items || []).slice(0, 6);
      console.log(`   Found: ${users.length} users`);

      if (users.length === 0) continue;

      // Get profile details
      for (const user of users) {
        try {
          process.stdout.write(`   Fetching ${user.login}... `);
          
          const profileUrl = `https://api.github.com/users/${user.login}`;
          const profile = await fetchWithRetry(profileUrl);

          const lead = {
            name: profile.name || user.login,
            username: profile.login,
            email: profile.email || '',
            company: profile.company || '',
            location: profile.location || '',
            bio: (profile.bio || '').substring(0, 100),
            github_url: profile.html_url,
            followers: profile.followers,
            public_repos: profile.public_repos,
          };

          leads.push(lead);
          totalCollected++;
          console.log('✓');

          // Respect API limits
          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          console.log(`✗ (${err.message})`);
        }
      }

      // Pause between queries
      await new Promise(r => setTimeout(r, 1200));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Display results
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 COLLECTION COMPLETE');
  console.log('═'.repeat(80) + '\n');

  console.log(`✅ Total Leads: ${leads.length}`);
  console.log(`   API Requests: ${totalRequests} (free API: 60/hour limit)`);
  console.log(`   Quality: 100% real, verified GitHub profiles\n`);

  console.log('🎯 SAMPLE LEADS:\n');
  leads.slice(0, 5).forEach((lead, i) => {
    console.log(`[${i + 1}] ${lead.name}`);
    console.log(`    GitHub: ${lead.username}`);
    console.log(`    Email: ${lead.email || '(not public)'}`);
    console.log(`    Company: ${lead.company || '(not specified)'}`);
    console.log(`    Location: ${lead.location || '(not specified)'}`);
    console.log(`    URL: ${lead.github_url}`);
    console.log('');
  });

  // Export CSV
  if (leads.length > 0) {
    const headers = ['Name', 'Username', 'Email', 'Company', 'Location', 'Bio', 'GitHub URL', 'Followers', 'Public Repos'];
    const rows = leads.map(l => [
      l.name,
      l.username,
      l.email,
      l.company,
      l.location,
      l.bio.replace(/"/g, '""').replace(/,/g, ';'),
      l.github_url,
      l.followers,
      l.public_repos,
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(',')),
    ].join('\n');

    fs.writeFileSync('github-real-leads.csv', csv);
    console.log(`💾 CSV exported: github-real-leads.csv (${leads.length} records)\n`);
  }
}

// Run
collectGitHubLeads()
  .then(() => {
    console.log('✅ All done!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
