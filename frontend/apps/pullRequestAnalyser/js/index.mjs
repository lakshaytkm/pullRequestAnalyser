// 1: Import
import { APP_CONSTANTS } from "./constants.mjs";
import { apimanager } from "/framework/js/apimanager.mjs";


// 2: Constants
const API_PRA = "http://localhost:9090/apis/pullRequestAnalyser";
const API_FPR = "http://localhost:9090/apis/fetchPullReq"
const HEADERS = { "x-api-key": "secreT_Key-1May26", "content-encoding": "gzip" };
const parts = {};

// 3: Placeholders
const placeholders = ["Paste GitHub Repo link...", "Try: github.com/user/repo/", "Try: https://github.com/TekMonksGitHub/loginapp/"];
let index = 0;
const input = document.getElementById("PRLink");
setInterval(() => { index = (index + 1) % placeholders.length; input.placeholder = placeholders[index]; }, 1000);


// 4: Events
// 4.1: Theme
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('change', () => {
    document.documentElement.setAttribute(
        'data-theme',
        themeToggle.checked ? 'light' : 'dark'
    );
});

// 4.2: Input — debounced 600ms
let timer = null;
document.getElementById('PRLink').addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(() => { sendData(); }, 600);
});

// 4.3: If Analyse is hit, then callAPI is called
document.querySelector(".analyse").addEventListener('click', () => { callAPI(parts); });


// 5: Function Definitions

// 5.1 sendData: awaits parseLink, then passes result to callAPI
async function sendData() {
    // Clear stale data from previous call
    Object.keys(parts).forEach(k => delete parts[k]);
    document.querySelector(".analyse").classList.remove("active");

    const value = document.getElementById("PRLink").value.trim();
    const result = await parseLink(value);

    // parseLink returns null on any error — bail out early
    if (!result) return;

    Object.assign(parts, result);

    if (parts.hasOwnProperty("prNumber")) {
        document.querySelector(".analyse").classList.add("active");
    } else {
        getAllPulls(parts); // parts={owner: "abc", repo:"def"}
    }
}


// 5.2 parseLink: validates the URL, checks repo + PR via GitHub API
async function parseLink(url) {
    try {
        // 5.2.1 — ensure full URL
        if (!url.startsWith('http')) url = 'https://' + url;

        // 5.2.2 — match against GitHub repo pattern
        const githubRepoRegex = /^(https?:\/\/)?(www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\/.*)?$/;
        const match = url.match(githubRepoRegex);

        // 5.2.3 — no match or no repo segment → red
        if (!match || !match[4]) {
            setIndicator('radial-gradient(circle at 30% 30%, #ff6b6b, #cc0000)', 'state-red', 'Not a valid link');
            return null;
        }

        // 5.2.4 — only allow: bare repo, /pulls, or /pull/{number}
        const extraPath = match[5];
        const isAllowedPath = extraPath === undefined || extraPath === "/pulls" || /^\/pulls\/\d+$/.test(extraPath);

        if (!isAllowedPath) {
            setIndicator('radial-gradient(circle at 30% 30%, #ff6b6b, #cc0000)', 'state-red', 'Not a valid link');
            return null;
        }

        const owner = match[3];
        const repo  = match[4];

        // 5.2.5 — check if repo exists
        setLoading();
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { 'Accept': 'application/vnd.github+json' }
        });

        if (!repoRes.ok) {
            setIndicator('radial-gradient(circle at 30% 30%, #ffaa55, #e65c00)', 'state-orange', 'Repo not found');
            return null;
        }

        // 5.2.6 — repo exists, now check PR if present
        if (extraPath && /^\/pulls\/\d+$/.test(extraPath)) {
            const prNumber = extraPath.split('/')[2];
            const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
                headers: { 'Accept': 'application/vnd.github+json' }
            });

            if (!prRes.ok) {
                setIndicator('radial-gradient(circle at 30% 30%, #ffaa55, #e65c00)', 'state-orange', 'PR not found');
                return null;
            }

            setIndicator('radial-gradient(circle at 30% 30%, #69ff6b, #00aa00)', 'state-green', 'Valid PR');
            return { owner, repo, prNumber };
        }

        // 5.2.7 — valid bare repo
        setIndicator('radial-gradient(circle at 30% 30%, #69ff6b, #00aa00)', 'state-green', 'Valid repo');
        return { owner, repo };

    } catch (err) {
        console.error(err);
        setIndicator('radial-gradient(circle at 30% 30%, #ff6b6b, #cc0000)', 'state-red', 'Not a valid link');
        return null;
    }
}


// 5.3 getAllPulls: gets all the pulls for the repoasync function getAllPulls(parts) {
 
async function getAllPulls(parts){
 if (!parts) return;

    const box = document.getElementById("content-box");
    box.innerHTML = "Loading...";

    try {
        const res = await apimanager.rest(
            API_FPR,
            "POST",
            parts,
            false,
            false,
            false,
            false,
            true,
            undefined,
            HEADERS,
            false,
            1,
            false
        );

        if (!res || res.respErr) {
            box.innerHTML = `Error: ${res?.respErr?.statusText || "Request failed"}`;
            return;
        }

     const template =document.getElementById('pr-template').innerHTML;
            const rendered = Mustache.render(template, {prs: res});
            document.getElementById('tableBody').innerHTML =rendered;
    box.innerHTML= "List of Pull Requests has arrived. Select one for analysis."
}
catch (err) {
        console.error(err);
        
    }
}

// 5.4 callAPI: calls apimanager.rest, renders the response
async function callAPI(data) {
    if (!data) return;

    const box = document.getElementById("content-box");
    box.innerHTML = "Loading...";

    try {
        const res = await apimanager.rest(
            API_PRA,
            "POST",
            data,
            false,
            false,
            false,
            false,
            true,
            undefined,
            HEADERS,
            false,
            1,
            false
        );

        if (!res || res.respErr) {
            box.innerHTML = `Error: ${res?.respErr?.statusText || "Request failed"}`;
            return;
        }
           box.innerHTML = typeof res === "string" ? res : JSON.stringify(res, null, 2);
           

    } catch (err) {
        console.error(err);
        box.innerHTML = "Error fetching data";
    }
}


// HELPER FUNCTIONS
function setIndicator(gradientCSS, explainerClass, explainerText) {
    const indicator = document.getElementById('indicator');
    const explainer = document.getElementById('indicator-explainer');

    // Clear any leftover state classes first
    indicator.className = '';
    indicator.style.background = gradientCSS;
    indicator.style.boxShadow  = 'none';

    explainer.className   = explainerClass;
    explainer.textContent = explainerText;
}

function setLoading() {
    const indicator = document.getElementById('indicator');
    const explainer = document.getElementById('indicator-explainer');

    indicator.className = '';   // ← same here
    indicator.style.background = 'radial-gradient(circle at 30% 30%, #e0e0e0, #9ca3af)';
    indicator.style.boxShadow  = '';
    explainer.className   = '';
    explainer.textContent = 'Checking…';
}