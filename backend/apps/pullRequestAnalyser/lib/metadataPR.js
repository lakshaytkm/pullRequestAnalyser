// Step 1: dependencies
const path = require("path");
const { Octokit } = require('@octokit/rest');
const { APP_CONSTANTS } = require("../lib/constants.js");
const { LIBDIR, CONFDIR } = APP_CONSTANTS;
const { GITHUB_TOKEN } = require(path.join(CONFDIR, "pullRequestAnalyser.json"));

// Step 2: initialising Octokit with our token
const octokit = new Octokit({ auth: GITHUB_TOKEN });

function parseGithubUrl(url) {
    const parts = url.replace('https://github.com/', '').split('/');
    const branch = parts[2] === 'tree' ? parts.slice(3).join('/') : 'main';
    return { owner: parts[0], repo: parts[1], branch };
}

async function getMetadata(ownerURL, requesterURL) {
    const source = parseGithubUrl(requesterURL);
    const target = parseGithubUrl(ownerURL);

    // fetch basic repo info for both
    const { data: sourceInfo } = await octokit.rest.repos.get({ owner: source.owner, repo: source.repo });
    const { data: targetInfo } = await octokit.rest.repos.get({ owner: target.owner, repo: target.repo });

    // fetch the last 5 commits on the source branch
    const { data: commits } = await octokit.rest.repos.listCommits({
        owner: source.owner,
        repo: source.repo,
        sha: source.branch,
        per_page: 5
    });

    // fetch comparison to get ahead/behind info
    const basehead = `${target.owner}:${target.branch}...${source.owner}:${source.branch}`;
    const { data: comparison } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: target.owner,
        repo: target.repo,
        basehead
    });

    const latest = commits[0];
    const oldest = commits[commits.length - 1];

    // build the JSON report
    const report = {
        source: {
            url:         requesterURL,
            name:        sourceInfo.full_name,
            branch:      source.branch,
            description: sourceInfo.description || null,
            language:    sourceInfo.language || null,
            visibility:  sourceInfo.visibility,
            created_at:  sourceInfo.created_at,
            updated_at:  sourceInfo.updated_at
        },
        target: {
            url:         ownerURL,
            name:        targetInfo.full_name,
            branch:      target.branch,
            description: targetInfo.description || null,
            language:    targetInfo.language || null,
            visibility:  targetInfo.visibility,
            created_at:  targetInfo.created_at,
            updated_at:  targetInfo.updated_at
        },
        comparison: {
            status:        comparison.status,  // ahead, behind, diverged, identical
            ahead_by:      comparison.ahead_by,
            behind_by:     comparison.behind_by,
            files_changed: comparison.files?.length || 0
        },
        author: {
            name:        latest?.commit.author.name || null,
            email:       latest?.commit.author.email || null,
            github_user: latest?.author?.login || null
        },
        timestamps: {
            latest_commit: latest?.commit.author.date || null,
            oldest_commit: oldest?.commit.author.date || null
        },
        recent_commits: commits.map(commit => ({
            sha:     commit.sha.slice(0, 7),
            author:  commit.commit.author.name,
            date:    commit.commit.author.date,
            message: commit.commit.message.split('\n')[0]
        }))
    };

    return report;
    // const outputPath = path.join(__dirname, 'pr_metadata.json');
    // fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    // console.log(`\nDone! Metadata saved to ${outputPath}`);
}
module.exports={getMetadata}