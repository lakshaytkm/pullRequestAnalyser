// Step 1: dependencies
const { Octokit } = require('octokit');
const fs = require('fs');
const path = require('path');
const { GITHUB_TOKEN } = require('../conf/pullRequestAnalyser.json');
const octokit = new Octokit({ auth: GITHUB_TOKEN });


// if URL has /tree/branchname → extract that branch
// if URL is just owner/repo → default to 'main'
function parseGithubUrl(url) {
    const parts = url.replace('https://github.com/', '').split('/');
    const branch = parts[2] === 'tree' ? parts.slice(3).join('/') : 'main';
    return { owner: parts[0], repo: parts[1], branch };
}

// 4.6 Fetches file content from GitHub and returns it as an array of lines
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

// 4.7 Parses the @@ line from a patch to extract the starting line number
// patch line looks like: @@ -23,6 +23,7 @@ some context
// the number after + is the line number in the new/source file
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

async function analyse(ownerURL, requesterURL) {
    const source = parseGithubUrl(requesterURL);
    const target = parseGithubUrl(ownerURL);

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

    // 5.3 Build the JSON report
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
            filename:   file.filename,
            status:     file.status,       // added, modified, deleted, renamed
            additions:  file.additions,
            deletions:  file.deletions,
            diff:       file.patch || null,
            context
        });
    }

    const report = {
        source: {
            url:    sourceRepoUrl,
            owner:  source.owner,
            repo:   source.repo,
            branch: source.branch
        },
        target: {
            url:    targetRepoUrl,
            owner:  target.owner,
            repo:   target.repo,
            branch: target.branch
        },
        comparison: {
            status:         comparison.status,   // ahead, behind, diverged, identical
            ahead_by:       comparison.ahead_by,
            behind_by:      comparison.behind_by,
            total_files:    comparison.files?.length || 0,
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
    return report;

//    const outputPath = path.join(__dirname, 'pr_diff.json');
//   return fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
} 

