const path = require("path");
const { APP_CONSTANTS } = require("../lib/constants.js");
const { LIBDIR, CONFDIR } = APP_CONSTANTS;
const { Octokit } = require("@octokit/rest");
const { GITHUB_TOKEN } = require(path.join(CONFDIR, "pullRequestAnalyser.json"));

const octokit = new Octokit({ auth: GITHUB_TOKEN });


// -----------------------------
// Config
// -----------------------------

const ALLOWED_EXTENSIONS = [
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".py",
    ".java",
    ".go",
    ".rb",
    ".php",
    ".cs",
    ".cpp",
    ".c",
    ".json",
    ".yml",
    ".yaml",
    ".md"
];

const MAX_PATCH_LENGTH = 10000;


// -----------------------------
// Helpers
// -----------------------------

function isReviewableFile(filename) {
    return ALLOWED_EXTENSIONS.some(ext =>
        filename.toLowerCase().endsWith(ext)
    );
}

async function getFileLines(owner, repo, branch, filepath) {
    try {
        const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filepath,
            ref: branch
        });

        const content = Buffer
            .from(fileData.content, "base64")
            .toString("utf8");

        return content.split("\n");

    } catch (e) {
        return null;
    }
}

function parseChangedLines(patch) {
    const lineNumbers = [];

    const regex =
        /@@\s-\d+(?:,\d+)?\s\+(\d+)(?:,\d+)?\s@@/g;

    let match;

    while ((match = regex.exec(patch)) !== null) {
        lineNumbers.push(parseInt(match[1]));
    }

    return lineNumbers;
}

function getContext(lines, changedLine, contextSize = 5) {
    const start =
        Math.max(0, changedLine - contextSize - 1);

    const end =
        Math.min(lines.length, changedLine + contextSize);

    return lines
        .slice(start, end)
        .map((line, i) => `${start + i + 1}: ${line}`)
        .join("\n");
}


// -----------------------------
// Main
// -----------------------------

async function analyse(owner, repo, pull_number) {

    // -------------------------
    // Fetch PR
    // -------------------------

    const { data: pr } =
        await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number
        });

    // -------------------------
    // Source / Target
    // -------------------------

    const source = {
        owner:  pr.head.repo.owner.login,
        repo:   pr.head.repo.name,
        branch: pr.head.ref,
        url:    pr.head.repo.html_url
    };

    const target = {
        owner:  pr.base.repo.owner.login,
        repo:   pr.base.repo.name,
        branch: pr.base.ref,
        url:    pr.base.repo.html_url
    };

    console.log(
        `\nSource: ${source.owner}/${source.repo} (${source.branch})`
    );

    console.log(
        `Target: ${target.owner}/${target.repo} (${target.branch})`
    );

    // -------------------------
    // Compare branches
    // -------------------------

    const basehead =
        `${target.owner}:${target.branch}...${source.owner}:${source.branch}`;

    const { data: comparison } =
        await octokit.rest.repos.compareCommitsWithBasehead({
            owner: target.owner,
            repo: target.repo,
            basehead
        });

    // -------------------------
    // File analysis
    // -------------------------

    const files = [];

    for (const file of comparison.files || []) {

        // skip binary / unsupported files
        if (!isReviewableFile(file.filename)) {
            continue;
        }

        // skip missing patches
        if (!file.patch) {
            continue;
        }

        // skip huge diffs
        if (file.patch.length > MAX_PATCH_LENGTH) {
            continue;
        }

        const lines = await getFileLines(
            source.owner,
            source.repo,
            source.branch,
            file.filename
        );

        const context = [];

        if (lines) {

            const changedLines =
                parseChangedLines(file.patch);

            for (const changedLine of changedLines) {

                context.push({
                    around_line: changedLine,
                    code: getContext(lines, changedLine)
                });
            }
        }

        files.push({
            filename:  file.filename,
            status:    file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes:   file.changes,
            diff:      file.patch,
            context
        });
    }

    // -------------------------
    // Commit summaries
    // -------------------------

    const commits =
        (comparison.commits || []).map(commit => ({
            sha: commit.sha.slice(0, 7),
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            message: commit.commit.message.split("\n")[0]
        }));

    const latestCommit = comparison.commits?.[0];
    const oldestCommit =
        comparison.commits?.[comparison.commits.length - 1];

    // -------------------------
    // Final report
    // -------------------------

    return {

        pr: {
            number: pr.number,
            title: pr.title,
            body: pr.body || null,
            state: pr.state,
            created_at: pr.created_at,
            updated_at: pr.updated_at
        },

        source,

        target,

        author: {
            name:
                latestCommit?.commit.author.name || null,

            email:
                latestCommit?.commit.author.email || null,

            github_user:
                latestCommit?.author?.login || null
        },

        timestamps: {
            latest_commit:
                latestCommit?.commit.author.date || null,

            oldest_commit:
                oldestCommit?.commit.author.date || null
        },

        comparison: {
            status: comparison.status,
            ahead_by: comparison.ahead_by,
            behind_by: comparison.behind_by,

            total_files:
                comparison.files?.length || 0,

            reviewed_files:
                files.length,

            total_additions:
                comparison.files?.reduce(
                    (sum, f) => sum + f.additions,
                    0
                ) || 0,

            total_deletions:
                comparison.files?.reduce(
                    (sum, f) => sum + f.deletions,
                    0
                ) || 0
        },

        files,

        commits
    };
}

module.exports = { analyse };