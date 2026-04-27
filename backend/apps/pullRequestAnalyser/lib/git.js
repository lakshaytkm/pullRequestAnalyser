// Step 1: dependencies
const { Octokit } = require('octokit');
const fs = require('fs');
const { GITHUB_TOKEN } = require('../conf/pullRequestAnalyser.json');

// Step 2: initialising Octokit with our token
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Step 3: reading repo URLs from command line
const sourceRepoUrl = process.argv[2]; // the file which is *not* the main
const targetRepoUrl = process.argv[3]; // the file which is the main

// Step 4: validate inputs
if (!sourceRepoUrl || !targetRepoUrl) {
    console.error("Usage: node git.js <source_repo_url> <target_repo_url>");
    console.error("Example: node git.js https://github.com/user/feature-repo https://github.com/user/main-repo");
    process.exit(1);
}

// 4.5 Extracts owner, repo and branch from a GitHub URL
// if URL has /tree/branchname → extract that branch
// if URL is just owner/repo → default to 'main'
function parseGithubUrl(url) {
    const parts = url.replace('https://github.com/', '').split('/');
    const branch = parts[2] === 'tree' ? parts.slice(3).join('/') : 'main';
    return { owner: parts[0], repo: parts[1], branch };
}

async function analyse() {
    const source = parseGithubUrl(sourceRepoUrl);
    const target = parseGithubUrl(targetRepoUrl);

    console.log(`\nSource: ${source.owner}/${source.repo} (branch: ${source.branch})`);
    console.log(`Target: ${target.owner}/${target.repo} (branch: ${target.branch})`);

    // 5.2 Comparing source branch against target branch across both repos
    /*
    basehead format: targetOwner:targetBranch...sourceOwner:sourceBranch
    base → the starting branch (the target/main)
    head → the branch you're comparing against (the source/feature)
    */
    console.log('\nComparing branches...');
    const basehead = `${target.owner}:${target.branch}...${source.owner}:${source.branch}`;
    const { data: comparison } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: target.owner,
        repo: target.repo,
        basehead
    });

    // 5.3 Build the report
    let report = '';
    report += `Source : ${sourceRepoUrl}\n`;
    report += `Target : ${targetRepoUrl}\n`;
    report += `Source Branch : ${source.branch}\n`;
    report += `Target Branch : ${target.branch}\n`;
    report += `Status        : ${comparison.status} | Ahead: ${comparison.ahead_by} | Behind: ${comparison.behind_by}\n\n`;

    // List each changed file with its line by line diff
    report += `FILES CHANGED (${comparison.files?.length || 0})\n`;
    report += `Total Additions : ${comparison.files?.reduce((sum, f) => sum + f.additions, 0) || 0}\n`;
    report += `Total Deletions : ${comparison.files?.reduce((sum, f) => sum + f.deletions, 0) || 0}\n`;
    for (const file of comparison.files || []) {
        report += `\n${file.status.toUpperCase()} : ${file.filename} (+${file.additions} -${file.deletions})\n`;
        if (file.patch) report += `${file.patch}\n`;
    }

    // List commits in source not in target
    report += `\nCOMMITS\n`;
    for (const commit of comparison.commits || []) {
        report += `- ${commit.sha.slice(0, 7)} | ${commit.commit.author.name} | ${commit.commit.message.split('\n')[0]}\n`;
    }

    const outputPath = require('path').join(__dirname, 'pr_analysis_part1.txt');
    fs.writeFileSync(outputPath, report, 'utf8');
    console.log(`\nDone! Report saved to ${outputPath}`);
}

analyse();
