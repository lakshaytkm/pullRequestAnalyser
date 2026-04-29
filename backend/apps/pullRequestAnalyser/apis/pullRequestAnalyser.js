const git = require("../lib/git.js");
const metadata = require("../lib/metadataPR.js");
const fs = require("fs");
const path = require("path");
const Mustache = require("mustache");
const url = 'https://neuranet.app:9090/apps/neuranet/llmflow';


exports.doService = async (jsonReq) => {
  if (!validateRequest(jsonReq)) {
    LOG.error("Validation failure."); 
    return false;
  }
  LOG.debug("Received API for analysing: " + jsonReq.ownerURL + " " + jsonReq.requesterURL);
  const prompt= await run(jsonReq);
  console.log(prompt);


const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': "<YOUR_TOKEN_HERE>"},
    body: JSON.stringify({  
       "id":"test@tekmonks.com",  
        "org": "tekmonks", 
        "question": prompt ,  
        "aiappid": "tkmgptapp",    
        "flow":"llm_flow"   
         })
};

  const result = await fetch(url, options);
  const response = await result.json();
  return response;
};


/* Function Definitions */
const validateRequest = (jsonReq) => (jsonReq && jsonReq.owner && jsonReq.repo && jsonReq.pull_number);

async function run(jsonReq) {
var gitreport      = await git.analyse(jsonReq.owner, jsonReq.repo, jsonReq.pull_number);
var metadatareport = await metadata.getMetadata(jsonReq.owner, jsonReq.repo, jsonReq.pull_number);

gitreport = JSON.stringify(gitreport, null, 2);
metadatareport = JSON.stringify(metadatareport, null, 2);
  
const templatePath = path.join(__dirname, "../lib/send2API.txt"); 
const template = await fs.promises.readFile(templatePath, "utf-8");
const finalPrompt = Mustache.render(template, {gitreport,metadatareport});
return finalPrompt;
}

