const path = require("path");

const { APP_CONSTANTS } = require("../lib/constants.js");
const { LIBDIR, CONFDIR, ROOTDIR, MONKSHU_LIBDIR } = APP_CONSTANTS;

const git = require(path.join(LIBDIR, "git.js"));

const fs = require("fs");
const Mustache = require("mustache");

const httpClient = require(`${CONSTANTS.LIBDIR}/httpClient.js`);

const config = require(path.join(CONFDIR, "pullRequestAnalyser.json"));
const { NeuraNetURL, NeuraNetauthToken } = config;

exports.doService = async (jsonReq) => {
  if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return false;}

  LOG.debug("Received API for analysing");
  if (jsonReq.body.pull_number){
  const prompt= await run(jsonReq);
  const options = {
    method: 'POST',
    headers: {'Content-Type': 'application/json','Authorization': NeuraNetauthToken},
    body: JSON.stringify({  "id":"test@tekmonks.com",  "org": "tekmonks", "question": prompt , "aiappid": "tkmgptapp","flow":"llm_flow"  })
};

LOG.info("Call sent to Neuranet");
const result = await fetch(NeuraNetURL, options);
if (result.error || result.status >= 400) { throw new Error(error || `Request failed with status ${status}`);}

const response = await result.json();
LOG.info("Response Received from Neuranet");
  return response;
} 
else{
  
}
};

/* Function Definitions */
const validateRequest = (jsonReq) => (jsonReq && jsonReq.owner && jsonReq.repo);


async function run(jsonReq) {
    // Fetch git analysis report
    const gitreport = await git.analyse(jsonReq.owner,jsonReq.repo,jsonReq.pull_number);
    const prettyGitReport = JSON.stringify(gitreport, null,2);
    const templatePath = path.join(__dirname,"../lib/send2API.txt");
    const template = await fs.promises.readFile(templatePath,"utf-8");
    const finalPrompt = Mustache.render(template, {gitreport: prettyGitReport });
    return finalPrompt;
}
