// Step 1: dependencies
const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const { GITHUB_TOKEN } = require('../conf/pullRequestAnalyser.json');
const octokit = new Octokit({ auth: GITHUB_TOKEN });



function parseGithubUrl(url) {
    const parts = url.replace('https://github.com/', '').split('/');
    const branch = parts[2] === 'tree' ? parts.slice(3).join('/') : 'main';
    return { owner: parts[0], repo: parts[1], branch };
}


async function getFileLines(owner, repo, branch, filepath) {
    try {
        const { data: fileData } = await octokit.rest.repos.getContent({
            owner, repo, path: filepath, ref: branch
        });
        // content comes back as base64 encoded, so decode it first
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        return content.split('\n');
    } catch (e) {
        return null; 
    }
}
/* 
example:
Input:  owner='VivekKumar', repo='loginapp', branch='main', filepath='index.js'
Output: ['const express = require("express");', 'const port = 3000;', ...]
*/

function parseChangedLines(patch) {
    const lineNumbers = [];
    const regex = /@@\s-\d+(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/g;
    let match;
    while ((match = regex.exec(patch)) !== null) {
        lineNumbers.push(parseInt(match[1]));
    }
    return lineNumbers;
}
/*
example

*/

function getContext(lines, changedLine, contextSize = 10) {
    const start = Math.max(0, changedLine - contextSize - 1);
    const end = Math.min(lines.length, changedLine + contextSize);
    return lines.slice(start, end)
        .map((line, i) => `${start + i + 1}: ${line}`)
        .join('\n');
}
/*
example
changedLine = 23, contextSize = 10
start = 13, end = 33
Output: 
"13: const express = require('express');
 14: const port = 3000;
 ...
 23: const port = 8080;   ← the changed line
 ...
 33: }"
 */
async function analyse(ownerURL, requesterURL) {
    const forked = parseGithubUrl(requesterURL);
    const upstream = parseGithubUrl(ownerURL);

    console.log(`Requester: ${forked.owner}/${forked.repo} (branch: ${forked.branch})`);
    console.log(`Target: ${upstream.owner}/${upstream.repo} (branch: ${upstream.branch})`);

    
    console.log('\nComparing branches...');
    const basehead = `${upstream.owner}:${upstream.branch}...${forked.owner}:${forked.branch}`;
    const { data: comparison } = await octokit.rest.repos.compareCommitsWithBasehead({
        owner: upstream.owner,
        repo: upstream.repo,
        basehead
    });

    const files = [];
    for (const file of comparison.files || []) {

        // fetch surrounding context for each changed file
        const lines = await getFileLines(forked.owner, forked.repo, forked.branch, file.filename);
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
            url:    requesterURL,
            owner:  forked.owner,
            repo:   forked.repo,
            branch: forked.branch
        },
        target: {
            url:    ownerURL,
            owner:  upstream.owner,
            repo:   upstream.repo,
            branch: upstream.branch
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

module.exports={analyse}
