const path = require("path");
const { APP_CONSTANTS } = require("./constants.js");
const { LIBDIR, CONFDIR } = APP_CONSTANTS;
const { Octokit } = require("@octokit/rest");
const { GITHUB_TOKEN } = require(path.join(CONFDIR, "pullRequestAnalyser.json"));

const octokit = new Octokit({ auth: GITHUB_TOKEN });

async function getPRs(object) {
    const response = await octokit.rest.pulls.list({
        owner: object.owner,
        repo:  object.repo,
        state: "open" 
    });
    const filteredPRs = response.data.map(
    pr => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.html_url,
})
);
return filteredPRs;
}
module.exports = { getPRs };