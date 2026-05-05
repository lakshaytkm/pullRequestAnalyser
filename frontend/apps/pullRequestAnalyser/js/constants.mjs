const path = require("path");

const ROOTDIR = path.resolve(__dirname, "../../../../../");

const APPDIR = path.join(ROOTDIR, "pullRequestAnalyser");
const BASEDIR= path.join(APPDIR, "frontend", "apps", "pullRequestAnalyser");

const CONFDIR = path.join(BASEDIR, "conf"); 
const IMGDIR  = path.join(BASEDIR, "img"); 
const JSDIR  = path.join(BASEDIR, "js");


const constants = {
  ROOTDIR,
  BASEDIR,
  CONFDIR,
  IMGDIR,
  JSDIR,
};

module.exports = {
  constants,
  APP_CONSTANTS: constants
};