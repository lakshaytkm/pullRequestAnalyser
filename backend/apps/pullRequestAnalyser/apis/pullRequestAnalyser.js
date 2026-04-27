
const git = require("../conf/git.js");
const fs = require("fs");
const path = require("path");
const metadata= require ("../conf/metadataPR.js");

exports.doService = async jsonReq => {
	if (!validateRequest(jsonReq)) {
        LOG.error("Validation failure."); 
        return false;
    }
	LOG.debug("Received API for analysing: " + jsonReq.ownerURL + " " + jsonReq.requesterURL);

run();

}


/* Function Definitions */
const validateRequest = jsonReq => (jsonReq && jsonReq.ownerURL && jsonReq.requesterURL);


async function run() {
  const gitreport=  await git.analyse(jsonReq.ownerURL,jsonReq.requesterURL);  
  const metadatareport= await metadata.getMetadata(jsonReq.ownerURL,jsonReq.requesterURL);
  

  console.log(content);
}