#!/usr/bin/env node
/**
 * Fetch GitHub contribution stats for OllyCohen across APM Steam repos.
 * Outputs data/github-stats.json for the static site.
 *
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/fetch-github-stats.js
 */

const fs = require('fs');
const path = require('path');

const GITHUB_API = 'https://api.github.com';
const USERNAME = process.env.GITHUB_USERNAME || 'OllyCohen';
const ORG = process.env.GITHUB_ORG || 'apm-apps';
const REPOS = (process.env.GITHUB_REPOS || 'apm-steam-mobile,apm-steam-web,apm-steam-api,apm-steam-azure-functions').split(',');
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '90', 10);
const BATCH_SIZE = 10;

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

const headers = {
  'Authorization': `token ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'ollycohen.com-stats'
};

async function fetchJSON(url) {
  const res = await fetch(url, { headers });
  if (res.status === 409) return null; // Empty repo
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function fetchAllPages(url) {
  let results = [];
  let page = 1;
  while (true) {
    const sep = url.includes('?') ? '&' : '?';
    const pageUrl = `${url}${sep}per_page=100&page=${page}`;
    const res = await fetch(pageUrl, { headers });
    if (res.status === 409) return []; // Empty repo
    if (!res.ok) throw new Error(`${res.status}: ${pageUrl}`);
    const data = await res.json();
    if (data.length === 0) break;
    results = results.concat(data);
    page++;
  }
  return results;
}

async function fetchCommitStats(owner, repo, sha) {
  const data = await fetchJSON(`${GITHUB_API}/repos/${owner}/${repo}/commits/${sha}`);
  if (!data) return { additions: 0, deletions: 0, total: 0 };
  return data.stats || { additions: 0, deletions: 0, total: 0 };
}

async function batchFetch(items, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + BATCH_SIZE < items.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return results;
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - DAYS_BACK);

  const since = startDate.toISOString();
  const until = endDate.toISOString();

  console.log(`Fetching stats for ${USERNAME} across ${ORG} repos`);
  console.log(`Date range: ${toDateStr(startDate)} to ${toDateStr(endDate)}`);

  const daily = {};
  const byRepo = {};
  let totalCommits = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const repo of REPOS) {
    console.log(`\n--- ${ORG}/${repo} ---`);

    let commits;
    try {
      commits = await fetchAllPages(
        `${GITHUB_API}/repos/${ORG}/${repo}/commits?author=${USERNAME}&since=${since}&until=${until}`
      );
    } catch (err) {
      console.warn(`  Skipping (${err.message})`);
      byRepo[repo] = { commits: 0, additions: 0, deletions: 0 };
      continue;
    }

    console.log(`  ${commits.length} commits found. Fetching stats...`);

    const statsResults = await batchFetch(commits, (commit) =>
      fetchCommitStats(ORG, repo, commit.sha).then(stats => ({
        date: toDateStr(new Date(commit.commit.author.date)),
        stats
      }))
    );

    byRepo[repo] = { commits: 0, additions: 0, deletions: 0 };

    for (const { date, stats } of statsResults) {
      if (!daily[date]) {
        daily[date] = { commits: 0, additions: 0, deletions: 0, by_repo: {} };
      }
      daily[date].commits++;
      daily[date].additions += stats.additions;
      daily[date].deletions += stats.deletions;

      if (!daily[date].by_repo[repo]) {
        daily[date].by_repo[repo] = { commits: 0, additions: 0, deletions: 0 };
      }
      daily[date].by_repo[repo].commits++;
      daily[date].by_repo[repo].additions += stats.additions;
      daily[date].by_repo[repo].deletions += stats.deletions;

      byRepo[repo].commits++;
      byRepo[repo].additions += stats.additions;
      byRepo[repo].deletions += stats.deletions;

      totalCommits++;
      totalAdditions += stats.additions;
      totalDeletions += stats.deletions;
    }

    console.log(`  ${byRepo[repo].commits} commits, +${byRepo[repo].additions}/-${byRepo[repo].deletions}`);
  }

  // Calculate streaks and active days
  let activeDays = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateStr = toDateStr(cursor);
    if (daily[dateStr] && daily[dateStr].commits > 0) {
      activeDays++;
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  const output = {
    generated_at: new Date().toISOString(),
    date_range: { start: toDateStr(startDate), end: toDateStr(endDate) },
    summary: {
      total_commits: totalCommits,
      total_additions: totalAdditions,
      total_deletions: totalDeletions,
      active_days: activeDays,
      longest_streak: longestStreak
    },
    daily,
    by_repo: byRepo
  };

  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'github-stats.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\nWrote ${outPath}`);
  console.log(`Summary: ${totalCommits} commits, +${totalAdditions}/-${totalDeletions}, ${activeDays} active days, ${longestStreak}-day streak`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
