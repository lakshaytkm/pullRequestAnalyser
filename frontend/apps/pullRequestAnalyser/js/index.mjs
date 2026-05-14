// 1: Import
import { APP_CONSTANTS } from "./constants.mjs";
import { apimanager } from "/framework/js/apimanager.mjs";


// 2: Constants
const API_PRA = "http://localhost:9090/apis/pullRequestAnalyser";
const API_FPR = "http://localhost:9090/apis/fetchPullReq";
const API_PRD = "http://localhost:9090/apis/pullReqDetails";
const HEADERS = { "x-api-key": "secreT_Key-1May26", "content-encoding": "gzip" };
const parts = {};
let prDetails={};

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
let isProgrammaticSet = false;
document.getElementById('PRLink').addEventListener('input', function () {
    if (isProgrammaticSet) return;
    clearTimeout(timer);
    timer = setTimeout(() => { sendData(); }, 600);
});

// 4.3: Analyse button click
document.querySelector(".analyse").addEventListener('click', () => {
    if (prDetails.LinesChanged<2000 && prDetails.FilesChanged<25 && prDetails.Commits<10 && prDetails.PRDescriptionChars<1000)  callAPI(parts);
    else{
        const box= document.getElementById('content-box');
        box.innerHTML="This PR cannot be analyzed because its metrics exceed the supported limits."
    }
});

// 4.4: Click on a PR row in the aside list
document.querySelector('.pullRequestListDiv').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const row = e.target.closest('tr');
    if (!row) return;

    const anchor = row.querySelector('td:last-child a');
    if (!anchor) return;

    console.log("anchor.href:", anchor.href);          // ← what URL is it?
    console.log("parsedURL result:", parsedURL(anchor.href)); // ← what does it parse to?

        isProgrammaticSet = true;
        document.getElementById('PRLink').value = anchor.href;
        isProgrammaticSet = false;

        document.querySelector('.analyse').classList.add('active');

        const data = parsedURL(anchor.href);
        Object.keys(parts).forEach(k => delete parts[k]);
        Object.assign(parts, data);

        getPRDetails(data);
    });

// 5: Function Definitions

// 5.1 sendData
async function sendData() {
    Object.keys(parts).forEach(k => delete parts[k]);
    document.querySelector(".analyse").classList.remove("active");

    const value = document.getElementById("PRLink").value.trim();
    const result = await parseLink(value);

    if (!result) return;

    Object.assign(parts, result);

    if (parts.hasOwnProperty("prNumber")) {
        document.querySelector(".analyse").classList.add("active");
    } else {
        getAllPulls(parts);
    }
}


// 5.2 parseLink
async function parseLink(url) {
    try {
        if (!url.startsWith('http')) url = 'https://' + url;

        const githubRepoRegex = /^(https?:\/\/)?(www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\/.*)?$/;
        const match = url.match(githubRepoRegex);

        if (!match || !match[4]) {
            setIndicator('radial-gradient(circle at 30% 30%, #ff6b6b, #cc0000)', 'state-red', 'Not a valid link');
            return null;
        }

        const extraPath = match[5];
        const isAllowedPath = extraPath === undefined || extraPath === "/pulls" || /^\/pull\/\d+$/.test(extraPath);

        if (!isAllowedPath) {
            setIndicator('radial-gradient(circle at 30% 30%, #ff6b6b, #cc0000)', 'state-red', 'Not a valid link');
            return null;
        }

        const owner = match[3];
        const repo  = match[4];

        setLoading();
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { 'Accept': 'application/vnd.github+json' }
        });

        if (!repoRes.ok) {
            setIndicator('radial-gradient(circle at 30% 30%, #ffaa55, #e65c00)', 'state-orange', 'Repo not found');
            return null;
        }

        if (extraPath && /^\/pull\/\d+$/.test(extraPath)) {
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

        setIndicator('radial-gradient(circle at 30% 30%, #69ff6b, #00aa00)', 'state-green', 'Valid repo');
        return { owner, repo };

    } catch (err) {
        console.error(err);
        setIndicator('radial-gradient(circle at 30% 30%, #ff6b6b, #cc0000)', 'state-red', 'Not a valid link');
        return null;
    }
}


// 5.3 getAllPulls
async function getAllPulls(parts) {
    if (!parts) return;

    const box = document.getElementById("content-box");
    box.classList.remove("empty");
    box.innerHTML = "Loading pull requests...";

    try {
        const res = await apimanager.rest(
            API_FPR,
            "POST",
            parts,
            false, false, false, false,
            true,
            undefined,
            HEADERS,
            false, 1, false
        );

        if (!res || res.respErr) {
            box.innerHTML = `Error: ${res?.respErr?.statusText || "Request failed"}`;
            return;
        }

        // Render into the aside PR list
        const template = document.getElementById('pr-template').innerHTML;
        const rendered = Mustache.render(template, { prs: res });
        document.getElementById('tableBody').innerHTML = rendered;

        box.innerHTML = "Pull requests loaded. Click one from the list to select it for analysis.";

    } catch (err) {
        console.error(err);
        box.innerHTML = "Error fetching pull requests.";
    }
}


// 5.4 callAPI
async function callAPI(data) {
    if (!data) return;

    const box = document.getElementById("content-box");
    box.classList.remove("empty");
    box.innerHTML = "Loading analysis...";

    try {
        const res = await apimanager.rest(
            API_PRA,
            "POST",
            data,
            false, false, false, false,
            true,
            undefined,
            HEADERS,
            false, 1, false
        );

        if (!res || res.respErr) {
            box.innerHTML = `Error: ${res?.respErr?.statusText || "Request failed"}`;
            return;
        }

        const text = typeof res === "string" ? res : JSON.stringify(res, null, 2);
        box.innerHTML = marked.parse(text);

    } catch (err) {
        console.error(err);
        box.innerHTML = "Error fetching analysis.";
    }
}


// 5.5 getPRDetails
async function getPRDetails(data) {
    if (!data) return;

    const box = document.getElementById("content-box");

    try {
        const res = await apimanager.rest(
            API_PRD,
            "POST",
            data,
            false, false, false, false,
            true,
            undefined,
            HEADERS,
            false, 1, false
        );

        if (!res || res.respErr) {
            box.innerHTML = `Error: ${res?.respErr?.statusText || "Request failed"}`;
            return;
        }
        prDetails= res;
        // Render metrics into Table 1
        const template = document.getElementById('pr-metrics-template').innerHTML;
        const rendered = Mustache.render(template, { prs: res });
        document.getElementById('prMetricsBody').innerHTML = rendered;

        box.classList.remove("empty");
        box.innerHTML = "PR details loaded. Click Analyse to run the AI analysis.";

    } catch (err) {
        console.error(err);
        box.innerHTML = "Error fetching PR details.";
    }
}


// HELPER FUNCTIONS
function setIndicator(gradientCSS, explainerClass, explainerText) {
    const indicator = document.getElementById('indicator');
    const explainer = document.getElementById('indicator-explainer');
    indicator.className = '';
    indicator.style.background = gradientCSS;
    indicator.style.boxShadow  = 'none';
    explainer.className   = explainerClass;
    explainer.textContent = explainerText;
}

function setLoading() {
    const indicator = document.getElementById('indicator');
    const explainer = document.getElementById('indicator-explainer');
    indicator.className = '';
    indicator.style.background = 'radial-gradient(circle at 30% 30%, #e0e0e0, #9ca3af)';
    indicator.style.boxShadow  = '';
    explainer.className   = '';
    explainer.textContent = 'Checking…';
}

function parsedURL(url) {
    const abc = url.trim().replace(/\/$/, '').split('/');
    return { owner: abc[3], repo: abc[4], prNumber: abc[6] };
}