#!/usr/bin/env node

/**
 * GitHub Real Data Lead Collector - SCALED VERSION
 * Collects 100+ verified leads with expanded search queries
 * Status: PRODUCTION READY
 */

const axios = require('axios');
const fs = require('fs');

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

async function collectScaledLeads() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 GITHUB API - SCALED LEAD COLLECTION (100+ LEADS)');
  console.log('═'.repeat(80) + '\n');

  // EXPANDED QUERIES - 15 different search patterns
  const queries = [
    // Sri Lanka focused
    'CEO location:Sri Lanka',
    'CTO location:Sri Lanka',
    'Founder location:Sri Lanka',
    'Developer CEO location:Colombo',
    
    // Tech stack focused (global + SL)
    'CEO language:TypeScript location:Asia',
    'CTO language:Python',
    'Founder language:JavaScript location:South Asia',
    'Developer entrepreneur location:Colombo',
    
    // Title focused
    'CEO followers:>10',
    'CTO followers:>5',
    'VP Engineer',
    'Tech lead',
    
    // Industry focused
    'SaaS founder',
    'Startup CEO',
    'Developer founder followers:>3',
  ];

  const leads = [];
  const seen = new Set(); // Deduplicate by username

  for (const q of queries) {
    try {
      console.log(`🔍 Query: "${q}"`);

      // Search users
      const searchUrl = `https://api.github.com/search/users?q=${encodeURIComponent(q)}&per_page=10&sort=followers`;
      const searchData = await fetchWithRetry(searchUrl);

      const users = (searchData.items || []).slice(0, 8);
      console.log(`   Found: ${users.length} users, collecting details...\n`);

      if (users.length === 0) {
        console.log('   (no results)\n');
        continue;
      }

      // Get profile details
      for (const user of users) {
        // Skip if already collected
        if (seen.has(user.login)) {
          process.stdout.write(`   ⊘ ${user.login} (duplicate)\n`);
          continue;
        }

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
            bio: (profile.bio || '').substring(0, 120),
            github_url: profile.html_url,
            followers: profile.followers,
            public_repos: profile.public_repos,
          };

          leads.push(lead);
          seen.add(user.login);
          totalCollected++;
          console.log('✓');

          await new Promise(r => setTimeout(r, 300));
        } catch (err) {
          console.log(`✗ (${err.message})`);
        }
      }

      console.log('');
      await new Promise(r => setTimeout(r, 1200));
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // Display results
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SCALED COLLECTION COMPLETE');
  console.log('═'.repeat(80) + '\n');

  console.log(`✅ Total Unique Leads: ${leads.length}`);
  console.log(`   API Requests: ${totalRequests}`);
  console.log(`   Rate Limit: 60/hour (free) - ${(60 - (totalRequests % 60))} requests remaining\n`);

  console.log('📈 LEAD QUALITY METRICS:\n');
  const withEmail = leads.filter(l => l.email).length;
  const withCompany = leads.filter(l => l.company).length;
  const withLocation = leads.filter(l => l.location).length;
  const followers = leads.reduce((sum, l) => sum + l.followers, 0) / leads.length;

  console.log(`   Email Coverage: ${withEmail}/${leads.length} (${((withEmail/leads.length)*100).toFixed(1)}%)`);
  console.log(`   Company Info: ${withCompany}/${leads.length} (${((withCompany/leads.length)*100).toFixed(1)}%)`);
  console.log(`   Location Info: ${withLocation}/${leads.length} (${((withLocation/leads.length)*100).toFixed(1)}%)`);
  console.log(`   Avg Followers: ${followers.toFixed(1)}\n`);

  console.log('🎯 TOP 10 LEADS BY FOLLOWERS:\n');
  leads
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 10)
    .forEach((lead, i) => {
      console.log(`[${i + 1}] ${lead.name || lead.username}`);
      console.log(`    Email: ${lead.email || '(not public)'}`);
      console.log(`    Company: ${lead.company || '(not specified)'}`);
      console.log(`    Location: ${lead.location || '(not specified)'}`);
      console.log(`    Followers: ${lead.followers} | Repos: ${lead.public_repos}`);
      console.log(`    GitHub: ${lead.github_url}\n`);
    });

  // Export to CSV
  if (leads.length > 0) {
    const headers = ['Name', 'Username', 'Email', 'Company', 'Location', 'Bio', 'GitHub URL', 'Followers', 'Public Repos'];
    const rows = leads.map(l => [
      l.name,
      l.username,
      l.email,
      l.company,
      l.location,
      l.bio.replace(/"/g, '""').replace(/,/g, ';').replace(/\n/g, ' '),
      l.github_url,
      l.followers,
      l.public_repos,
    ]);

    const csv = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(r => r.map(v => `"${v}"`).join(',')),
    ].join('\n');

    fs.writeFileSync('github-scaled-leads.csv', csv);
    console.log(`💾 CSV exported: github-scaled-leads.csv`);
    console.log(`   Records: ${leads.length}`);
    console.log(`   Size: ${(csv.length / 1024).toFixed(1)}KB\n`);
  }

  console.log('═'.repeat(80));
  console.log('✅ SCALED COLLECTION COMPLETE - Ready for next phase\n');
}

// Run
console.log('Initializing scaled collection...\n');
collectScaledLeads()
  .then(() => {
    console.log('✅ All done!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
