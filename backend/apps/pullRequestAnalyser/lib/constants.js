const path = require("path");

const ROOTDIR = path.resolve(__dirname, "../../../../../");

const APPDIR = path.join(ROOTDIR, "pullRequestAnalyser");
const BASEDIR= path.join(APPDIR, "backend", "apps", "pullRequestAnalyser");

const CONFDIR = path.join(BASEDIR, "conf"); 
const LIBDIR  = path.join(BASEDIR, "lib"); 
const APIDIR  = path.join(BASEDIR, "apis");

const MONKSHU_LIBDIR = path.join(
  ROOTDIR,
  "monkshu",
  "backend",
  "server",
  "lib"
);

const constants = {
  ROOTDIR,
  BASEDIR,
  CONFDIR,
  LIBDIR,
  APIDIR,
  MONKSHU_LIBDIR
};

module.exports = {
  constants,
  APP_CONSTANTS: constants
};