// Step 1: dependencies
const { Octokit } = require('@octokit/rest');
const { GITHUB_TOKEN } = require('../conf/pullRequestAnalyser.json');

const octokit = new Octokit({ auth: GITHUB_TOKEN });


async function getFileLines(owner, repo, branch, filepath) {
    try {
        const { data: fileData } = await octokit.rest.repos.getContent({
            owner, repo, path: filepath, ref: branch
        });
        // content comes back as base64 encoded, so decode it first
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        return content.split('\n');
    } catch (e) {
        return null; // file may not exist in one of the repos (e.g. newly added file)
    }
}

function parseChangedLines(patch) {
    const lineNumbers = [];
    const regex = /@@\s-\d+(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/g;
    let match;
    while ((match = regex.exec(patch)) !== null) {
        lineNumbers.push(parseInt(match[1]));
    }
    return lineNumbers;
}

// 4.8 Extracts 10 lines above and below a changed line from the file
function getContext(lines, changedLine, contextSize = 10) {
    const start = Math.max(0, changedLine - contextSize - 1);
    const end = Math.min(lines.length, changedLine + contextSize);
    return lines.slice(start, end)
        .map((line, i) => `${start + i + 1}: ${line}`)
        .join('\n');
}

// Main function - takes owner, repo and pull_number instead of two URLs
async function analyse(owner, repo, pull_number) {

    // fetch the PR info first — this gives us source and target repo/branch
    const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number });

    // extract source (the requester's repo and branch)
    const source = {
        owner:  pr.head.repo.owner.login,
        repo:   pr.head.repo.name,
        branch: pr.head.ref,
        url:    pr.head.repo.html_url
    };

    // extract target (the main repo and branch)
    const target = {
        owner:  pr.base.repo.owner.login,
        repo:   pr.base.repo.name,
        branch: pr.base.ref,
        url:    pr.base.repo.html_url
    };

    console.log(`\nSource: ${source.owner}/${source.repo} (branch: ${source.branch})`);
    console.log(`Target: ${target.owner}/${target.repo} (branch: ${target.branch})`);

    // Comparing source branch against target branch
    /*
    basehead format: targetOwner:targetBranch...sourceOwner:sourceBranch
    base → the starting branch (the target/main)
    head → the branch you're comparing against (the source/feature)
    */
    console.log('\nComparing branches...');
    const basehead = `${target.owner}:${target.branch}...${source.owner}:${source.branch}`;
    const { data: comparison } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: target.owner,
        repo:  target.repo,
        basehead
    });

    // Build the JSON report
    const files = [];
    for (const file of comparison.files || []) {

        // fetch surrounding context for each changed file
        const lines = await getFileLines(source.owner, source.repo, source.branch, file.filename);
        const context = [];
        if (lines && file.patch) {
            const changedLines = parseChangedLines(file.patch);
            for (const changedLine of changedLines) {
                context.push({
                    around_line: changedLine,
                    code: getContext(lines, changedLine)
                });
            }
        }

        files.push({
            filename:  file.filename,
            status:    file.status,   // added, modified, deleted, renamed
            additions: file.additions,
            deletions: file.deletions,
            diff:      file.patch || null,
            context
        });
    }

    return {
        source,
        target,
        comparison: {
            status:          comparison.status,  // ahead, behind, diverged, identical
            ahead_by:        comparison.ahead_by,
            behind_by:       comparison.behind_by,
            total_files:     comparison.files?.length || 0,
            total_additions: comparison.files?.reduce((sum, f) => sum + f.additions, 0) || 0,
            total_deletions: comparison.files?.reduce((sum, f) => sum + f.deletions, 0) || 0
        },
        files,
        commits: (comparison.commits || []).map(commit => ({
            sha:     commit.sha.slice(0, 7),
            author:  commit.commit.author.name,
            date:    commit.commit.author.date,
            message: commit.commit.message.split('\n')[0]
        }))
    };
}

module.exports = { analyse };