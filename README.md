1. INTRODUCTION
This project is meant to be a Pull Request Analyser, ie, 
we analyse a new branch that is has created and user is looking to merge,
so, if the owner of the main branch doesnt have the time to go through the intricacies
This tool is great for them, as it analyses all the differences, potential errors and 
returns a well documented plain text file.


2. How does it work?
The project is divided into 2 parts
1. We use the octokit library to inform the owner the changes made by the merge requester.
2. We use LLM Model's APIs to compare configuration etc, and inform the owner 
what is wrong, potential errors, areas of improvement. All this in a file.


3. Structure 
As the project is back end project, so the front end is non existant.
The structure of the back end,
- api folder: 1 folder that sends us to the one and only main page(Pull Request Analyser: PRA.js)
- conf folder: httpd.json, hostname.json and apiregistry
- lib folder: all the components/functions used in the main js file, PRA.js


4. Octokit : Official GIT JS library
Functions used in the Application
4.1 octokit.rest.repos.get: 
Function gives URL + Headers + Status + Data(name, desc, forks, stars, visibilty, default branch, timestamps, language etc.)
--
4.2 octokit.rest.repos.compareCommitsWithBasehead(owner, repo, basehead)
FUnctions returns Differences between the two repositories, namely:
- Commits
- Files changed
- Status
- Stats total commits ahead/behind + number of files changed

------------------------
UNDERSTANDING API 

I. The job is to : 
extract the right signals from GitHub → 
package them clearly → 
send them to the API → 
get a useful judgment back.

---

II. What matters most:
1. Instructions (system message) → what role it should play
2. Context (data you provide) → what it should analyze
3. Task (your question) → what you want it to do
If any of these are weak → output becomes useless.

---

III. For your project (PR analyzer)
You are building something like a **smart code reviewer**.
👉 The API does NOT:
* Fetch GitHub data
* Understand commits automatically
* Compare branches by itself
👉 YOU must provide:
* The diff / changes
* Context about the repo (optional but helpful) ******-> explained below
* What you want evaluated

---

IV. What you SHOULD send to the API

1. 🔥 The DIFF (most important)
2. 📁 File context (optional but powerful)
3. 🧾 Metadata about PR
4. 🎯 Your evaluation criteria (VERY IMPORTANT)
Review this PR for:
- Code quality
- Security issues
- Performance impact
- Best practices
- Whether it's safe to merge

Give:
1. Summary
2. Risks
3. Recommendation (Approve / Reject)

---

V. Example API Input (what you should send)

{
  "model": "gpt-5.3",
  "messages": [
    {
      "role": "system",
      "content": "You are a senior software engineer reviewing GitHub pull requests."
    },
    {
      "role": "user",
      "content": "
PR Title: Fix login bug

Diff:
- const password = \"123456\";
+ const password = process.env.PASSWORD;

Task:
Review this PR for:
- Security
- Code quality
- Best practices

Give:
- Summary
- Issues
- Recommendation (Approve/Reject)
"
    }
  ]
}

---

VI. What “surrounding context” actually means?

## 🟢 Level 1 — Local context (start here ALWAYS)
Grab ~10–20 lines before & after the change.`
👉 This helps the model understand:
* What the function does
* How the change fits in
---
## 🟡 Level 2 — Function-level context
If the change involves a function:
* Include the **full function definition**
👉 Now the model can:
* Evaluate logic correctness
* Detect bugs/security issues
---
## 🔵 Level 3 — Dependency context (only when needed)
Only include this if:
* A **new function is introduced**
* A function is **modified but defined elsewhere**
* The diff references something unclear
---
## 🔴 Level 4 — Call usage (advanced, optional)

You asked: “should I find wherever a function is called?”
👉 Only do this **selectively**, not globally.
Do it when:
* A function change could break other parts
* It’s a shared utility
👉 This helps the model detect:
* Breaking changes
* Side effects

---

VII.  Practical pipeline (what YOU should build)

Here’s a clean workflow for your project:

## Step 1: Get PR diff
---
## Step 2: For EACH changed file:  Surrounding lines (±10 lines)
---
## Step 3: Detect important patterns
If diff contains:
* Function name change → include full function
* New function → include its body
* External call → include definition (if local)
---
## Step 4: Build structured input


