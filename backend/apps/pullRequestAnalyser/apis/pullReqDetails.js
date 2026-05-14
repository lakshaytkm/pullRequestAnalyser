const path = require("path");
const { APP_CONSTANTS } = require("../lib/constants.js");
const { LIBDIR, CONFDIR, ROOTDIR, MONKSHU_LIBDIR } = APP_CONSTANTS;
const fetchPRD = require(path.join(LIBDIR, "fetchPRD.js"));


exports.doService = async (jsonReq) => {
  if (!validateRequest(jsonReq)) {LOG.error("Validation failure."); return false;}
    
  LOG.debug("CALL RECEIVED BY PULLREQDETAILS.JS")
  LOG.debug("Received API for Fetching ONE PARTICULAR PR'S DETAILS");
  const pullReqDetails= await fetchPRD.getPRDetails(jsonReq);

  LOG.debug("Data being Sent");
  return pullReqDetails;
  
}

const validateRequest=(jsonReq)=>(jsonReq && jsonReq.owner && jsonReq.repo && jsonReq.prNumber);
