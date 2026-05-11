/**
 * index.mjs - Browser compatible version
 * Replaces Node.js require/path with ES module imports
 */

import { APP_CONSTANTS } from "./constants.mjs";
import  {apimanager}  from "/framework/js/apimanager.mjs";

const API_URL = "http://localhost:9090/apis/pullRequestAnalyser";

const HEADERS = {
//  "Content-Type": "application/json",
  "x-api-key": "secreT_Key-1May26",
  "content-encoding":"gzip"
};

// -----------------------------------------------------------------
// Placeholders
const placeholders = [
  "Paste GitHub PR link...",
  "Enter owner/repo/pull-number...",
  "Try: github.com/user/repo/pull/1",
  "Try: https://github.com/TekMonksGitHub/loginapp/pull/11",
];

let index = 0;
const input = document.getElementById("PRLink");

setInterval(() => {
  index = (index + 1) % placeholders.length;
  input.placeholder = placeholders[index];
}, 2000);
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// Events: Click or Enter
document.getElementById("submit-btn").addEventListener("click", sendData);

document.getElementById("PRLink").addEventListener("keypress", function (e) {
  if (e.key === "Enter") sendData();
});
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// sendData calls parseLink to get an object, then passes it to callAPI
function sendData() {
  const value = document.getElementById("PRLink").value.trim();
  const parts = parseLink(value);

  if (!parts) {
    alert("Invalid GitHub PR link or format");
    return;
  }

  callAPI(parts);
}
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// callAPI: calls apimanager.rest, renders the response
async function callAPI(data) {
  if (!data) return;

  const box = document.getElementById("content-box");
  box.innerHTML = "Loading...";

  try {
  const res = await apimanager.rest(
  API_URL,
  "POST",
  data,
  false,   // sendToken
  false,   // extractToken
  false,   // canUseCache
  false,   // dontGZIP
  true,    // sendErrResp
  undefined, // timeout (or a number)
  HEADERS,   // headers
  false,     // provideHeaders
  1,         // retries
  false      //sseURL
);

    if (!res || res.respErr) {
      box.innerHTML = `Error: ${res?.respErr?.statusText || "Request failed"}`;
      return;
    }

    box.innerHTML =
      typeof res === "string" ? res : JSON.stringify(res, null, 2);
  } catch (err) {
    console.error(err);
    box.innerHTML = "Error fetching data";
  }
}
// -----------------------------------------------------------------

// -----------------------------------------------------------------
// parseLink: parse GitHub PR link into { owner, repo, pull_number }
function parseLink(url) {
  try {
    if (!url.startsWith("http")) url = "https://github.com/" + url;

    const parts = new URL(url).pathname.split("/").filter(Boolean);

    if (parts.length < 4 || parts[2] !== "pull") return null;

    return {
      owner: parts[0],
      repo: parts[1],
      pull_number: parts[3],
    };
  } catch (err) {
    return null;
  }
}
// -----------------------------------------------------------------