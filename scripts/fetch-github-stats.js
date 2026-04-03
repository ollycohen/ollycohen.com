#!/usr/bin/env node
/**
 * Fetch GitHub contribution stats for a user across ALL accessible repos.
 * Discovers repos from personal account + org, fetches commits + LOC.
 * Outputs data/github-stats.json for the static site.
 *
 * Usage: GITHUB_TOKEN=ghp_xxx node scripts/fetch-github-stats.js
 */

const fs = require('fs');
const path = require('path');

const GITHUB_API = 'https://api.github.com';
const USERNAME = process.env.GITHUB_USERNAME || 'OllyCohen';
const ORGS = (process.env.GITHUB_ORGS || 'apm-apps').split(',');
const DAYS_BACK = parseInt(process.env.DAYS_BACK || '365', 10);
const BATCH_SIZE = 10;

const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('Error: GITHUB_TOKEN environment variable is required');
  process.exit(1);
}

const headers = {
  Authorization: `token ${TOKEN}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'ollycohen.com-stats',
};

async function fetchJSON(url) {
  const res = await fetch(url, { headers });
  if (res.status === 409) return null;
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
    if (res.status === 409) return [];
    if (res.status === 404) return [];
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
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return results;
}

function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

async function discoverRepos(since) {
  const repos = new Map(); // key: "owner/name"

  // Personal repos
  console.log(`Discovering repos for ${USERNAME}...`);
  const personal = await fetchAllPages(
    `${GITHUB_API}/users/${USERNAME}/repos?sort=pushed&direction=desc`
  );
  for (const r of personal) {
    if (new Date(r.pushed_at) >= since) {
      repos.set(r.full_name, { owner: r.owner.login, name: r.name });
    }
  }
  console.log(
    `  ${personal.length} personal repos, ${repos.size} with recent activity`
  );

  // Org repos
  for (const org of ORGS) {
    const orgRepos = await fetchAllPages(
      `${GITHUB_API}/orgs/${org}/repos?sort=pushed&direction=desc`
    );
    let added = 0;
    for (const r of orgRepos) {
      if (new Date(r.pushed_at) >= since && !repos.has(r.full_name)) {
        repos.set(r.full_name, { owner: r.owner.login, name: r.name });
        added++;
      }
    }
    console.log(
      `  ${orgRepos.length} repos in ${org}, ${added} new with recent activity`
    );
  }

  return Array.from(repos.values());
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - DAYS_BACK);

  const since = startDate.toISOString();
  const until = endDate.toISOString();

  console.log(`Fetching stats for ${USERNAME} across all accessible repos`);
  console.log(`Date range: ${toDateStr(startDate)} to ${toDateStr(endDate)}\n`);

  // Discover repos with recent activity
  const repos = await discoverRepos(startDate);
  console.log(`\nTotal repos to scan: ${repos.length}\n`);

  const daily = {};
  const byRepo = {};
  let totalCommits = 0;
  let totalAdditions = 0;
  let totalDeletions = 0;
  const reposWithActivity = [];

  for (const { owner, name } of repos) {
    const fullName = `${owner}/${name}`;

    let commits;
    try {
      commits = await fetchAllPages(
        `${GITHUB_API}/repos/${owner}/${name}/commits?author=${USERNAME}&since=${since}&until=${until}`
      );
    } catch (err) {
      console.log(`  ${fullName}: skipped (${err.message})`);
      continue;
    }

    if (commits.length === 0) {
      console.log(`  ${fullName}: 0 commits`);
      continue;
    }

    console.log(
      `  ${fullName}: ${commits.length} commits — fetching stats...`
    );
    reposWithActivity.push(fullName);

    const statsResults = await batchFetch(commits, (commit) =>
      fetchCommitStats(owner, name, commit.sha).then((stats) => ({
        date: toDateStr(new Date(commit.commit.author.date)),
        stats,
      }))
    );

    byRepo[name] = { commits: 0, additions: 0, deletions: 0 };

    for (const { date, stats } of statsResults) {
      if (!daily[date]) {
        daily[date] = { commits: 0, additions: 0, deletions: 0, by_repo: {} };
      }
      daily[date].commits++;
      daily[date].additions += stats.additions;
      daily[date].deletions += stats.deletions;

      if (!daily[date].by_repo[name]) {
        daily[date].by_repo[name] = { commits: 0, additions: 0, deletions: 0 };
      }
      daily[date].by_repo[name].commits++;
      daily[date].by_repo[name].additions += stats.additions;
      daily[date].by_repo[name].deletions += stats.deletions;

      byRepo[name].commits++;
      byRepo[name].additions += stats.additions;
      byRepo[name].deletions += stats.deletions;

      totalCommits++;
      totalAdditions += stats.additions;
      totalDeletions += stats.deletions;
    }

    console.log(
      `    → ${byRepo[name].commits} commits, +${byRepo[name].additions}/-${byRepo[name].deletions}`
    );
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
    username: USERNAME,
    date_range: { start: toDateStr(startDate), end: toDateStr(endDate) },
    repos_scanned: reposWithActivity,
    summary: {
      total_commits: totalCommits,
      total_additions: totalAdditions,
      total_deletions: totalDeletions,
      active_days: activeDays,
      longest_streak: longestStreak,
    },
    daily,
    by_repo: byRepo,
  };

  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'github-stats.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\nWrote ${outPath}`);
  console.log(
    `Repos with activity: ${reposWithActivity.length} (${reposWithActivity.join(', ')})`
  );
  console.log(
    `Summary: ${totalCommits} commits, +${totalAdditions}/-${totalDeletions}, ${activeDays} active days, ${longestStreak}-day streak`
  );
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
