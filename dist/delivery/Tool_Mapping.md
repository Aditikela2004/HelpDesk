# Tool mapping

ServiceFlow is an AI-assisted independent portfolio project. This file says which tools were actually used and which have only a portable file for later import.

## Source-of-truth choices

| Purpose | Single source of truth | Form in this project |
|---|---|---|
| Engineering backlog | Jira | Jira project SF (ServiceFlow, Scrum, team-managed) holds the 34 backlog items as 5 epics and 29 stories, plus synthetic demonstration activity. Engineering_Backlog.csv is the portable copy. |
| Cross-functional tracker | monday.com layout | Delivery_Tracker.csv. A board could not be created (permission error). |
| Charter, ideation, plan and budget | Notion | Private draft pages. Simulated and assumption-based; nothing signed or spent. |
| Handbook | Confluence | Published in the Software Development space under a ServiceFlow Handbook page with child pages. Confluence_Handbook.md is the portable copy. |
| Wireframes | Editable SVG | ServiceFlow_Wireframes.svg. No Figma file exists. |
| Source | Git | Local repository in the project folder. |
| Hosting | Vercel | Private static deployment of the app files only (index.html, styles.css, config.js, core.js, track.js, app.js). The deployed config.js sets the analytics token; the source copy keeps it empty. Delivery artifacts are in the project package, not hosted. |

## Actually used

- Vercel: project creation and deployment of the six app files, with deployment verification by file hash.
- Notion: private draft pages for the project charter, ideation, plan and budget, usability study protocol (written, not run) and analytics plan. The budget is an assumption; actual cash spent is zero.
- Jira and Confluence (Atlassian): project SF with 34 issues and demonstration activity; handbook pages in the Software Development space. All people, roles, approvals and comments in them are simulated.
- Mixpanel: instrumentation of the deployed demo, and synthetic demonstration events. Event data is not user research.
- Local tools: Node (unit tests), Python with Playwright (browser checks), LibreOffice (rendering the Word plan for inspection).

## Not used, portable file only

- Figma: no Figma file was created. ServiceFlow_Wireframes.svg can be opened in Figma or any SVG editor.
- Asana: not used.
- monday.com: the account was reachable, but board and doc creation were refused with a permission error (403). No board exists. Import Delivery_Tracker.csv into a new board to use it.
- Amplitude: not used. Mixpanel is the analytics tool.

## Notes

- Do not keep the same item in two trackers. Pick the backlog for engineering status and the tracker for gates.
- Roles in the documents are simulated decisions and deliverables. No real person approved anything.
