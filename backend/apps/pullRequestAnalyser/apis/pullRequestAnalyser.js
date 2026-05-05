const path = require("path");
const fs = require("fs");
const Mustache = require("mustache");

const { APP_CONSTANTS } = require("../lib/constants.js");
const { LIBDIR, CONFDIR, ROOTDIR } = APP_CONSTANTS;

const git = require(path.join(LIBDIR, "git.js"));
const metadata = require(path.join(LIBDIR, "metadataPR.js"));

const httpClient = require(
  path.join(ROOTDIR, "monkshu", "backend", "server", "lib", "httpClient.js")
);

const config = require(path.join(CONFDIR, "pullRequestAnalyser.json"));
const { NeuraNetURL, NeuraNetauthToken } = config;


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
        'Authorization': NeuraNetauthToken
    },
    body: JSON.stringify({  
       "id":"test@tekmonks.com",  
        "org": "tekmonks", 
        "question": prompt ,  
        "aiappid": "tkmgptapp",    
        "flow":"llm_flow"   
         })
};

const result = await fetch(NeuraNetURL, options);
if (result.error || result.status >= 400) {
  throw new Error(error || `Request failed with status ${status}`);
}
const response = await result.json();
  return response;
};

/* Function Definitions */
const validateRequest = (jsonReq) => (jsonReq && jsonReq.ownerURL && jsonReq.requesterURL);


async function run(jsonReq) {
 var gitreport=  await git.analyse(jsonReq.ownerURL,jsonReq.requesterURL);  
 var metadatareport= await metadata.getMetadata(jsonReq.ownerURL,jsonReq.requesterURL);

 gitreport = JSON.stringify(gitreport, null, 2);
 metadatareport = JSON.stringify(metadatareport, null, 2);
  
const templatePath = path.join(__dirname, "../lib/send2API.txt"); 
 const template = await fs.promises.readFile(templatePath, "utf-8");
 const finalPrompt = Mustache.render(template, {gitreport,metadatareport});
 return finalPrompt;
}



// fetch(url, options)
//     .then(response => response.json())
//     .then(data => {
//         console.log(data);
//     })
//     .catch(error => {
//         console.error('Error:', error);
//     });