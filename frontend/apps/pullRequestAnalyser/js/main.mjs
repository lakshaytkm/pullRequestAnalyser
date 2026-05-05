 const api="http://localhost:8080//apis/pullRequestAnalyser.js"
 

 // placeholders
 const placeholders = [
    "Paste GitHub PR link...",
    "Enter owner/repo/pull-number...",
    "Try: github.com/user/repo/pull/1",
    "Try: https://github.com/TekMonksGitHub/loginapp/pull/11"
  ];

  let index = 0;
  const input = document.getElementById("linkBox");

  setInterval(() => {
    index = (index + 1) % placeholders.length;
    input.placeholder = placeholders[index];
  }, 2000);
// ---------------


// call API 
function callAPI(data) {
  if (!data) {
    
    return;
  }

  fetch("/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api": "secreT_Key-1May26"
    },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then();  // !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
}
//--------------


// parseLink
function parseLink(url) {
  try {
    if (!url.startsWith("http")) {
      url = "https://github.com/" + url;
    }

    const parts = new URL(url).pathname.split("/").filter(Boolean);

    if (parts.length < 4 || parts[2] !== "pull") {
      return null;
    }

    const [owner, repo, , pull_number] = parts;

    return { owner, repo, pull_number };

  } catch (err) {
    return null;
  }
}
//----------