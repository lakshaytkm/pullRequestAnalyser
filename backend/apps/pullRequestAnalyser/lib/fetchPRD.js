const path = require("path");
const { APP_CONSTANTS } = require("./constants.js");
const { LIBDIR, CONFDIR } = APP_CONSTANTS;
const { Octokit } = require("@octokit/rest");
const { GITHUB_TOKEN } = require(path.join(CONFDIR, "pullRequestAnalyser.json"));

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getPRDetails(object) {
    const response = await octokit.rest.pulls.get({
        owner: object.owner,
        repo: object.repo,
        pull_number: object.prNumber,
    });

    const filteredPR = {
        FilesChanged: response.data.changed_files,
        LinesChanged: response.data.additions + response.data.deletions,
        Commits: response.data.commits,
        Comments: response.data.comments,
        PRDescriptionChars: response.data.body?.length ?? 0
    };

    return filteredPR;
}
module.exports = { getPRDetails };