
const _base = new URL("../../../../../", window.location.href).href;

const ROOTDIR              = _base;
const APPDIR               = new URL("pullRequestAnalyser/", ROOTDIR).href;
const BASEDIR              = new URL("frontend/apps/pullRequestAnalyser/", APPDIR).href;
const CONFDIR              = new URL("conf/", BASEDIR).href;
const IMGDIR               = new URL("img/", BASEDIR).href;
const JSDIR                = new URL("js/", BASEDIR).href;
const MONKSHU_APIM = "/framework/js/apimanager.mjs";


export const APP_CONSTANTS = {
  ROOTDIR,
  APPDIR,
  BASEDIR,
  CONFDIR,
  IMGDIR,
  JSDIR,
  MONKSHU_APIM
};

export const constants = APP_CONSTANTS;