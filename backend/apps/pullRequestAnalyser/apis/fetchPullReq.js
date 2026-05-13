const path = require("path");

// const config = require(path.join(CONFDIR, "pullRequestAnalyser.json"));

const { APP_CONSTANTS } = require("../lib/constants.js");
const { LIBDIR, CONFDIR, ROOTDIR, MONKSHU_LIBDIR } = APP_CONSTANTS;
const fetcher = require(path.join(LIBDIR, "fetcher.js"));


exports.doService = async (jsonReq) => {
  if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return false;}

  LOG.debug("Received API for Fetching All Pull Requests");
  const pullReqList= await fetcher.getPRs(jsonReq);

  LOG.debug("Data being Sent");
  return pullReqList;
  
}

const validateRequest=(jsonReq)=>(jsonReq && jsonReq.owner && jsonReq.repo);

