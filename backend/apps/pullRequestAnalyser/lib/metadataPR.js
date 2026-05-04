// Step 1: dependencies
const path = require("path");
const { Octokit } = require('@octokit/rest');
const { APP_CONSTANTS } = require("../lib/constants.js");
const { LIBDIR, CONFDIR } = APP_CONSTANTS;
const { GITHUB_TOKEN } = require(path.join(CONFDIR, "pullRequestAnalyser.json"));

// Step 2: initialising Octokit with our token
const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Main function - takes owner, repo and pull_number instead of two URLs
async function getMetadata(owner, repo, pull_number) {

    // fetch the PR info first — this gives us source and target repo/branch
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number });

    // extract source and target from the PR object
    const source = {
        owner:  pr.head.repo.owner.login,
        repo:   pr.head.repo.name,
        branch: pr.head.ref
    };
    const target = {
        owner:  pr.base.repo.owner.login,
        repo:   pr.base.repo.name,
        branch: pr.base.ref
    };

    // fetch basic repo info for both
    const { data: sourceInfo } = await octokit.rest.repos.get({ owner: source.owner, repo: source.repo });
    const { data: targetInfo } = await octokit.rest.repos.get({ owner: target.owner, repo: target.repo });

    // fetch the last 5 commits on the source branch
    const { data: commits } = await octokit.rest.repos.listCommits({
        owner:    source.owner,
        repo:     source.repo,
        sha:      source.branch,
        per_page: 5
    });

    // fetch comparison to get ahead/behind info
    const basehead = `${target.owner}:${target.branch}...${source.owner}:${source.branch}`;
    const { data: comparison } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: target.owner,
        repo:  target.repo,
        basehead
    });

    const latest = commits[0];
    const oldest = commits[commits.length - 1];

    return {
        pr: {
            number: pr.number,
            title:  pr.title,
            body:   pr.body || null,
            state:  pr.state
        },
        source: {
            url:         pr.head.repo.html_url,
            name:        sourceInfo.full_name,
            branch:      source.branch,
            description: sourceInfo.description || null,
            language:    sourceInfo.language || null,
            visibility:  sourceInfo.visibility,
            created_at:  sourceInfo.created_at,
            updated_at:  sourceInfo.updated_at
        },
        target: {
            url:         pr.base.repo.html_url,
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
}

module.exports = { getMetadata };