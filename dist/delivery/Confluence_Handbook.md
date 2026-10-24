# HelpDesk Handbook

AI-assisted independent portfolio project. The fictional client is Northstar Studio, about 75 employees. All people, departments, data and approvals are simulated. Nothing here records a real approval, interview, survey, adoption or saving.

## 1. Purpose and scope

HelpDesk is a small employee service request portal. Employees submit a request to IT, Facilities or HR. Coordinators assign an owner and move the request through Open, In progress and Resolved. Leaders see workload and a few defined metrics. It runs in the browser from static files and saves to localStorage. It is a prototype for demonstration with synthetic data only.

Out of scope for version 1: sign-in and roles, notifications, file uploads, SLA enforcement, shared database or integrations. See the Won't items in the backlog.

## 2. Stakeholder brief and pain points

Simulated sponsor brief: requests reach IT, Facilities and HR through email and chat. People do not know who owns a request or what state it is in, and department heads lack a shared view of workload.

| ID | Pain point | What it looks like | Requirements |
|---|---|---|---|
| N1 | Scattered request intake | Requests arrive by email and chat and get lost. | R01, R02 |
| N2 | Incomplete information | Coordinators ask the same follow-up questions. | R01 |
| N3 | Unclear department routing | Nobody is sure which team should act. | R02 |
| N4 | Missing ownership | No named person owns a request. | R03 |
| N5 | Repeated status follow-ups | Employees chase for updates. | R03, R04 |
| N6 | Inconsistent workload reporting | Department heads cannot see current workload. | R05, R06 |
| N7 | Limited visibility into completed requests | Finished work is hard to find or count. | R05, R06 |

### Objectives and value hypothesis

If employees submit through one structured form and coordinators assign visible owners, fewer requests will arrive incomplete and employees will need fewer follow-ups. This is a hypothesis. No measurement exists.

### Assumptions, constraints and decision authority

- Assumption: the three departments each have two named coordinators (fictional).
- Assumption: employees can use a modern desktop or phone browser.
- Constraint: one-day scope, synthetic data only, no server and no accounts.
- Constraint: no real approvals exist. Roles in this document show what each role would decide, written by the author.
- Decision authority (simulated): scope and release go to the Product Manager and Project Manager; technology risk to the CIO; acceptance to the Validation Lead.

### Roles and decisions

| Role | Decision or position (simulated) | Deliverable |
|---|---|---|
| CEO and executive sponsor | Fund a one-day MVP and ask for one outcome: employees know who owns a request and what state it is in. | Sponsor statement and proposed acceptance gates (simulated). |
| CIO | Accept a buildless, browser-local prototype for the demonstration and name what blocks production use. | Technology rationale, security boundaries, production gap list. |
| Operations Director | Supply the brief. Limit version 1 to IT, Facilities and HR with ownership and workload visibility. | Simulated brief and pain points. |
| Department heads | Require named owners per department and a view of active workload. | Owner lists and workload requirements. |
| Employees and end users | Submit once, then see owner and status without asking. | Assumed personas and example requests. |
| Product Manager | Prioritize with MoSCoW. Defer notifications, uploads, SLA enforcement and sign-in. | Problem statement, PRD, roadmap. |
| Project Manager | Plan the build as one day with five release gates and a short risk register. | Charter, work breakdown, plan, RAID, decision log, release checklist, handover. |
| Program Manager | Coordinate four workstreams around shared gates, and show what comes after version 1. | Program view and dependency map. |
| Business Analyst | Turn the brief into ten testable requirements with explicit business rules. | R01 to R10, user stories, acceptance criteria, rules. |
| UI/UX Designer | Design one submission flow and one assignment and resolution flow, with clear empty and error states. | Information architecture, flows, wireframes, usability study proposal. |
| Visual Designer | Keep the look restrained, with text labels on every status color. | Design tokens and component states. |
| Developer | Separate business logic from rendering, validate stored data, and escape user text. | Source code and README. |
| Data Analyst | Define each metric and prove the seed data reconciles by hand. | Metric dictionary, seed reconciliation, sample CSV. |
| QA Tester | Test every requirement automatically where possible and record only what was executed. | Test strategy, automated tests, manual scripts, QA evidence. |
| Validation Lead | Judge whether the prototype is fit for its stated intended use, and for nothing more. | Intended-use assessment and release recommendation. |
| Software Environment Team | Define development, preview and hosted environments, configuration, and the source freeze. | Environment and configuration notes. |
| Deployment and Production Support Team | Package, deploy, verify, and describe rollback and support ownership for a prototype. | Deployment runbook and handover. |

## 3. Product and business analysis

### Assumed personas

| Persona | Situation | Need |
|---|---|---|
| Maya, requester (assumed) | Submits a laptop issue between meetings. | Wants one place to ask, and to see who owns it without asking again. |
| Marcus, department coordinator (assumed) | Picks up IT requests each morning. | Wants complete requests, a clear owner field, and an easy way to mark progress. |
| Hana, department head (assumed) | Plans the week for a small team. | Wants active workload by department and what is unassigned. |

Personas are assumptions made for the exercise. No interviews were conducted.

### Requirements

| ID | Requirement | MoSCoW | Rule |
|---|---|---|---|
| R01 | Structured submission | Must | Title 5-100, requester 1-60, description 10-2000 characters after trimming; department, priority and category from fixed lists. |
| R02 | Routing | Must | Unique SF- identifier; keeps selected department; starts Open and Unassigned; creation timestamp and first history entry. |
| R03 | Ownership and lifecycle | Must | Statuses Open, In progress, Resolved. Owner must belong to the department. Owner required for In progress or Resolved. Reopening allowed. |
| R04 | History and timestamps | Must | History entry for each meaningful owner or status change. No entry when nothing changes. resolvedAt set on resolve, cleared on reopen, replaced on re-resolve. |
| R05 | Search and filtering | Must | Search ID, title, requester, description, owner. Combine with department, status, priority. Active = Open + In progress. High-priority review excludes Resolved. No-results state with Clear filters. |
| R06 | Metrics | Must | Metrics computed from the same records as the directory. Empty dataset gives zeros, a null average and no division error. |
| R07 | Local persistence | Must | Save to localStorage; validate on load; warn on missing, unreadable or full storage; keep working in memory; offer CSV export; explain the browser-and-origin limit. |
| R08 | Export | Must | CSV of all current records; quotes escaped; leading = + - @ tab and CR neutralized in every text cell. Download tested separately from generation. |
| R09 | Interface | Must | Responsive layouts, labeled inputs, visible focus, semantic navigation, text labels with status colors. No conformance claim. |
| R10 | Delivery evidence | Must | Linked requirements, backlog, designs, source, test evidence, deployment configuration and handover. |

### Business rules

| ID | Rule | Requirement |
|---|---|---|
| BR-01 | Text fields are trimmed before length checks. | R01 |
| BR-02 | A request keeps the department it was submitted to. | R02 |
| BR-03 | New requests are Open and Unassigned. | R02 |
| BR-04 | Owners must belong to the request's department. | R03 |
| BR-05 | An owner is required before In progress or Resolved. | R03 |
| BR-06 | A request can be reopened from Resolved. | R03 |
| BR-07 | History records only changes to owner or status. | R04 |
| BR-08 | resolvedAt is set on resolve, cleared on reopen, replaced on re-resolve. | R04 |
| BR-09 | Active means Open plus In progress. | R05 |
| BR-10 | Resolution share is resolved divided by all requests. It is not SLA compliance. | R06 |
| BR-11 | Average resolution time covers requests currently Resolved, from createdAt to resolvedAt. | R06 |

### User stories and acceptance criteria

| ID | Story | Acceptance criteria | Requirement |
|---|---|---|---|
| US-01 | As an employee, I submit a request with the required details so the right team can act. | Invalid or blank fields show a message next to the field and nothing is created. | R01 |
| US-02 | As an employee, I choose a department so my request goes to the right team. | The request keeps that department and starts Open and Unassigned. | R02 |
| US-03 | As a coordinator, I assign an owner from my department so everyone knows who is responsible. | Only owners from the same department can be chosen. | R03 |
| US-04 | As a coordinator, I change status so requesters can see progress. | I cannot set In progress or Resolved without an owner. | R03 |
| US-05 | As a coordinator, I reopen a request that was closed too early. | The resolved time clears and the history says Reopened. | R03, R04 |
| US-06 | As an employee, I see a dated history of changes so I do not need to ask for updates. | Each owner or status change adds one dated entry; a save with no change adds none. | R04 |
| US-07 | As a coordinator, I search and filter so I can find work quickly. | Search combines with department, status, priority and Active. | R05 |
| US-08 | As a department head, I see what is active, high priority and unassigned. | The high-priority action shows no resolved requests. | R05, R06 |
| US-09 | As an operations director, I see totals, resolution share and average resolution time. | Numbers come from the same records as the directory and define themselves. | R06 |
| US-10 | As a presenter, I keep my records between visits and know when they are not saved. | A warning appears when storage fails; CSV export is offered. | R07 |
| US-11 | As an analyst, I export all requests to CSV and open them safely in a spreadsheet. | Quotes are escaped and formula characters are neutralized. | R08 |
| US-12 | As a reviewer, I download the project's artifacts from one place. | Every download link opens a real file. | R10 |

### Roadmap

- Version 1 (this project): requirements R01 to R10 as a local prototype.
- Next, if a pilot is approved: sign-in, shared storage, notifications, and a working-hours definition of resolution time.
- Later: SLA targets, integrations and reporting once real timestamps exist.

## 4. Project management

### Charter

Build and deploy a private prototype that meets R01 to R10, with documentation and recorded test evidence, inside one working day. Success is judged against the acceptance gates below, not against business results.

### Work breakdown and gates

| Gate | Exit condition |
|---|---|
| G1 Define | Brief, requirements and rules written |
| G2 Design | Flows, wireframes and tokens written |
| G3 Build | Core logic and interface complete |
| G4 Verify | Unit, static and browser checks run; gaps listed |
| G5 Release | Deployed files match tested files; handover written |

The delivery tracker lists each item with its gate, owner role and evidence. Effort estimates are not given because no time tracking was kept.

### RAID log

| ID | Type | Description | Likelihood | Impact | Response | Owner | Status |
|---|---|---|---|---|---|---|---|
| K1 | Risk | Local data is editable and not shared; readers may mistake the demo for a system of record | High | High | Banner on every screen, README and case study; no real data | Project Manager | Open (accepted for prototype) |
| K2 | Risk | Two browser tabs overwrite each other (last write wins) | Medium | Low | Documented limitation; no live sync in v1 | Developer | Open (accepted) |
| K3 | Risk | Browser storage unavailable or full | Medium | Medium | Warning, in-memory mode, CSV export; tested with blocked and unreadable storage | Developer | Mitigated |
| K4 | Risk | Metrics misread as SLA compliance | Medium | High | Metric definitions on the Analytics view and in the dictionary | Data Analyst | Mitigated |
| K5 | Risk | Formula injection in exported CSV | Medium | High | Leading = + - @ tab CR neutralized; unit-tested | Developer | Mitigated |
| K6 | Risk | Accessibility claimed without testing | Medium | Medium | No conformance claim; automated checks only; manual review pending | QA Tester | Open |
| K7 | Risk | Scope grows beyond one day | High | Medium | MoSCoW list and Won't items fixed in the charter | Product Manager | Mitigated |
| K8 | Risk | Hosting is unavailable or access is blocked | Low | Medium | Runnable source and manual deployment steps in the handbook | Deployment and Production Support Team | Mitigated |
| I1 | Issue | First browser run of the narrow layout scrolled sideways because the content grid grew with wide tables |  |  | Fixed grid tracks to minmax(0, 1fr); rechecked | Developer | Closed |
| I2 | Issue | Three of the first browser checks failed because of script errors, not product defects (line endings, a wrong status assumption, dialog focus wording) |  |  | Corrected the checks and reran all 20 | QA Tester | Closed |

### Decision log

| ID | Decision | Reason | Roles |
|---|---|---|---|
| D-01 | Use a buildless static site | No install or build step; fits a one-day scope and any static host. | CIO, Developer |
| D-02 | Keep business logic out of the rendering file | core.js can be unit tested in Node with no browser. | Developer |
| D-03 | Store data in localStorage only | No server, no accounts, no real data. Limits are stated everywhere. | CIO |
| D-04 | Owners come from fixed department lists | Meets the ownership rule without a user directory. | Business Analyst |
| D-05 | Reject the whole saved set if any record is invalid | Partial loading could hide corruption. | Developer, QA Tester |
| D-06 | Keep Reset demo data as a Should | Needed for demonstration, not for the business need. | Product Manager |
| D-07 | Show metric definitions next to the numbers | Prevents resolution share being read as SLA compliance. | Data Analyst |
| D-08 | Use one backlog (Jira layout) and one tracker (monday.com layout) | Avoids conflicting completion records. | Project Manager |
| D-09 | Host privately first | Public sharing is a separate, deliberate step. | Deployment and Production Support Team |

### Change control example

| Field | Entry |
|---|---|
| Reference | CR-001 (example) |
| Change | Add an Active filter and a high-priority review action |
| Origin | Raised during build review by the simulated Operations Director: 'Resolved items clutter what my teams must do today.' |
| Effect on scope | R05 originally listed department, status and priority filters. Added Active (Open + In progress) and a review action that excludes Resolved. |
| Impact | Effort: small. Risk: low. Tests added: U14, B08. No schedule change. |
| Disposition | Approved by the simulated Product Manager. This is an illustrative change-control record, not a real approval. |

### Release checklist

- [ ] Source frozen and application file hashes recorded
- [ ] All unit tests pass
- [ ] Static checks pass
- [ ] Browser checks pass in Chromium
- [ ] Deployment configuration matches the release
- [ ] Deployed files match the tested files
- [ ] Access status confirmed (private)
- [ ] Known gaps and limitations documented
- [ ] Handover notes written
- [ ] Release recommendation recorded

### Program view

Four workstreams (Product and analysis, Design, Engineering, Quality and release) share gates G1 to G5. Design cannot close G2 until requirements are written; Engineering cannot close G3 until flows exist; Quality cannot close G4 until the build is frozen; Release cannot close G5 until G4 is recorded. Later phases (sign-in, shared storage, notifications) would form a second program increment. This is a simulated program view inside one independent project.

## 5. Delivery tracker and backlog

See Engineering_Backlog.csv (34 items; 29 done, 5 deferred) and Delivery_Tracker.csv. The backlog is the source of truth for engineering status; the tracker is the source of truth for cross-functional gates.

## 6. UI/UX and visual design

### Information architecture

Four views reached from the sidebar (top bar on narrow screens): Overview, Requests, Analytics, Delivery case study. Two dialogs: New request and Request detail. One confirmation dialog: Reset demo data.

### Flows

Submit: Requests or Overview, New request, fill fields, Submit, toast, request appears Open and Unassigned.
Assign and resolve: Requests, open a row, choose owner, set status, Save, history updates.
Review: Overview, Review high-priority requests, filtered list.

### Wireframes

HelpDesk_Wireframes.svg holds low-fidelity wireframes for Overview, Create request and Request detail. It is an editable SVG. There is no Figma file.

### Design tokens

| Token | Value | Use |
|---|---|---|
| Sidebar | #14272e | Navigation background |
| Main text | #19272e | Body text and headings |
| Background | #f6f7f9 | Page background |
| Panel | #ffffff | Cards, tables, dialogs |
| Primary action | #305bd8 | Primary buttons and focus-adjacent accents |
| Focus ring | #f2a900 | 3 px outline on keyboard focus |
| Open | #fff1d6 on #6b4400 | Status badge, always with the word Open |
| In progress | #dbe8ff on #1b3f9a | Status badge, always with the words In progress |
| Resolved | #d9f2e3 on #14573a | Status badge, always with the word Resolved |
| High priority | #fde0de on #8a1f17 | Priority badge, always with the word High |
| Type | System sans-serif, 16 px base | No web fonts, no external requests |
| Spacing and radius | 8 / 12 / 16 px steps; 8-10 px radius | Comfortable density, subtle borders |

### Component states

| Component | States |
|---|---|
| Button | Default, hover (border darkens), focus (3 px amber outline), disabled (50% opacity) |
| Text input and select | Default, focus, error (message below, field marked invalid) |
| Status and priority badge | One style per value; the value is always printed as text |
| Requests table | Populated, empty (no records), no results (filters matched nothing), scrollable at narrow width |
| New request dialog | Empty, validation error per field, success (dialog closes, toast confirms) |
| Request detail dialog | Viewing, saved, no changes, error (owner required or invalid) |
| Storage warning | Hidden, unreadable data, storage unavailable, save failed |
| Loading | A single 'Loading HelpDesk' line until the first render; no spinners because data is local |

### Responsive and accessibility intent

Layouts adapt at 900 px and 480 px. Tables scroll inside their own box. Inputs have labels, errors are linked to fields, focus is visible and dialogs return focus. Status is never shown by color alone. Intent is stated; conformance has not been audited.

### Proposed usability study (not run)

- Participants: five or so employees of any organization, with consent; no confidential data.
- Tasks: submit a request; find who owns an existing request; (coordinator role) assign and resolve a request; find unresolved high-priority requests.
- Measures: task outcome (alone, with help, could not), ease rating 1 to 7, errors, quotes.
- Report counts and quotes. Five sessions find common problems but do not support percentages for all users.

## 7. Development and architecture

Static files in dist/: index.html, styles.css, config.js (runtime settings, token empty in source), core.js (logic, no DOM), track.js (anonymous usage events) and app.js (rendering). core.js runs in Node for unit tests and in the browser. Data lives in localStorage under serviceflow.v1 as {version, requests}. User text is inserted with textContent. Departments, owners, statuses and priorities come from fixed lists. The Reset and Export CSV actions live on the Requests view.

| ID | Decision | Reason |
|---|---|---|
| TD-01 | Plain JavaScript, no framework or dependency | Fewer moving parts, nothing to patch, easy to review. |
| TD-02 | UMD-style core.js | Same file runs in Node for tests and in the browser. |
| TD-03 | DOM built with textContent, never innerHTML | User text cannot become markup. |
| TD-04 | ISO 8601 UTC timestamps | Unambiguous storage; shown in the viewer's locale. |
| TD-05 | Native dialog element | Built-in focus containment and Escape handling. |
| TD-06 | Identifier is the highest existing number plus one | Unique without a counter; never reused within a dataset. |

### Security boundaries

No server and no sign-in. The app makes no network calls unless an analytics token is configured, which only the deployed demo does (see Product analytics below). Department filters are views, not permissions. Anyone with the page open can edit the stored data in developer tools. Do not enter real or confidential information.

### Storage behavior

Valid saved data loads on start. Missing data starts from the 12 seed records. Corrupt or invalid data triggers a warning and demo data in memory, and nothing is overwritten until the next change or reset. Unavailable storage triggers a warning and CSV export is offered. A failed save shows a warning. Two tabs overwrite each other (last write wins).

### Production gaps

Authentication and authorization, shared database, backups, audit trail, notifications, accessibility audit, privacy review and monitoring would all be needed for production.

## 8. Data analysis

### Metric dictionary

| Metric | Population | Formula | Seed value |
|---|---|---|---|
| Total requests | All records | Count of records | 12 |
| Open | All records | Count where status is Open | 5 |
| In progress | All records | Count where status is In progress | 3 |
| Resolved | All records | Count where status is Resolved | 4 |
| Active requests | All records | Open + In progress | 8 |
| High-priority active | Active records | Count where priority is High | 2 |
| Resolution share | All records | Resolved / Total x 100; 0 if there are no records | 4 / 12 x 100 = 33.3% |
| Average resolution time | Records currently Resolved | Mean of (resolvedAt - createdAt) in hours; empty if none | 81 / 4 = 20.25 hours |
| Department distribution | All records | Count per department | IT 5, Facilities 4, HR 3 |
| Status distribution | All records | Count per status | Open 5, In progress 3, Resolved 4 |

### Seed reconciliation

Twelve seed requests: Open 5, In progress 3, Resolved 4; IT 5, Facilities 4, HR 3; two active high-priority. Resolved elapsed hours are 20, 25, 16 and 20, total 81, mean 20.25. Resolution share is 4 of 12, 33.3%. Active is 5 plus 3, 8.

### Data quality checks

On load: valid JSON, version 1, every record has valid enums, length-limited text, department-matching owner, owner present for In progress and Resolved, resolvedAt only when Resolved, history entries present. Any failure rejects the whole set.

### Interpretation limits

Resolution share is not SLA compliance. Average resolution time is elapsed clock time for currently resolved requests, not working hours. Twelve seeded records cannot show trends or support statistical claims.

### Product analytics instrumentation

HelpDesk can send anonymous usage events to Mixpanel through track.js. Tracking is off unless config.js carries a project token; the source and the project package keep that value empty, and only the deployed copy sets it. Nine events are defined: request_form_opened, request_submitted, request_validation_error, owner_assigned, status_changed, request_resolved, filter_used, csv_exported and high_priority_review_clicked. Properties are limited to department, priority, category, status, previous status, the name of the field that failed validation, the filter type, hours to resolve and a record count. Titles, requester names, descriptions and owner names are never sent, autocapture is not used, and the browser's Do Not Track setting turns tracking off. Unit tests U25 and U26 and browser checks B21 and B22 verify these limits. Any event volume shown in a dashboard is synthetic demonstration data unless a real reviewer used the site, and it is not evidence of adoption.

### Extended sample data

The Requests view can load an extended sample of 60 synthetic records (the 12 seed records plus 48 generated ones). The generator is deterministic and the records pass the same validation as real input. The seed metrics above refer to the default 12 records only. Unit test U24 and browser check B23 cover the extended sample.

### Baseline and pilot plan (not run)

- Baseline before any pilot: sample 30 days of requests from the current email and chat channels. Record how many arrived incomplete, how long until someone replied, and how many follow-up messages each needed.
- Pilot measures: share of requests submitted with all fields, time from submission to first owner assigned, follow-up messages per request, active requests per department each week, and coordinator and employee satisfaction ratings.
- Compare the pilot with the baseline over the same length of time. Treat differences as hypotheses until the sample is large enough and other changes are ruled out.
- Do not report SLA compliance until targets exist and timestamps are trustworthy.

## 9. Quality assurance and validation

### Strategy

Unit tests exercise core.js. Browser checks drive the real page in Chromium. Static checks verify files, links, syntax and configuration. Manual scripts cover what a person should confirm. Results are recorded only after execution; see QA_Evidence.md.

### Executed results

| Check set | Result |
|---|---|
| Unit tests (node:test) | 26 passed, 0 failed |
| Static checks | 14 passed, 0 failed |
| Browser checks (Chromium, Playwright) | 23 passed, 0 failed |

### Manual acceptance scripts (pending a human tester)

| ID | Title | Steps | Expected |
|---|---|---|---|
| M01 | Submit a valid request | Open New request, fill every field with valid values, submit. | New request appears in Requests as Open and Unassigned; toast confirms. |
| M02 | Submit an invalid request | Leave title blank, enter a 4-character title, enter a 9-character description. | Each field shows its message; no request is created. |
| M03 | Assign and progress | Open an unassigned request, try In progress, then assign an owner and retry. | Error first, then success; history shows both changes. |
| M04 | Resolve and reopen | Resolve a request, then reopen it. | Resolved time appears, then clears; history says Reopened. |
| M05 | Filter and search | Search an owner name, then add department and status filters. | Results narrow; count updates; Clear filters restores all. |
| M06 | Export | Click Export CSV and open the file in a spreadsheet. | All records present; a title beginning with = appears as text. |
| M07 | Reset | Click Reset demo data, cancel, then repeat and confirm. | Cancel keeps data; confirm restores the 12 records. |
| M08 | Keyboard only | Complete M01 and M03 using the keyboard alone. | Every control reachable; focus visible; Escape closes dialogs. |
| M09 | Phone width | Repeat M01 and M05 at about 375 px wide. | No clipped controls; tables scroll inside their box. |
| M10 | Storage warning | Open the site in a private window that blocks storage. | A warning explains that nothing will be saved; CSV export is offered. |

### Traceability

| Req | Requirement | Backlog | Tests | Disposition |
|---|---|---|---|---|
| R01 | Structured submission | SFE-002, SFE-003 | U03, U04, U05, U19; B03 | Verified (automated) |
| R02 | Routing | SFE-004, SFE-005 | U01, U02, U18; B02 | Verified (automated) |
| R03 | Ownership and lifecycle | SFE-007, SFE-008, SFE-009 | U06, U07, U08, U09, U20; B04, B05 | Verified (automated) |
| R04 | History and timestamps | SFE-010, SFE-011 | U07, U09, U10, U22; B04, B05, B06 | Verified (automated) |
| R05 | Search and filtering | SFE-013, SFE-014, SFE-015, SFE-016 | U13, U14; B07, B08 | Verified (automated) |
| R06 | Metrics | SFE-018, SFE-019 | U11, U12, U21, U23; B01, B09 | Verified (automated) |
| R07 | Local persistence | SFE-021, SFE-022, SFE-024 | U16, U17; B02, B11, B14, B15 | Verified (automated); real quota exhaustion not tested |
| R08 | Export | SFE-023 | U15; B10 | Verified (automated) |
| R09 | Interface | SFE-025, SFE-026 | B03, B12, B13, B19, B20; manual M08, M09 | Partly verified: automated checks only, no conformance audit, Chromium only |
| R10 | Delivery evidence | SFE-027, SFE-028, SFE-029 | S01 to S10 static checks; B17 | Verified (static checks and file review) |

### Known gaps

| ID | Gap | Status |
|---|---|---|
| G1 | Manual acceptance scripts M01 to M10 have not been executed by a human tester. The browser checks cover similar ground automatically. | Open |
| G2 | Accessibility conformance has not been tested with a screen reader or audit. Only automated checks ran. | Open |
| G3 | Browser coverage is Chromium only. Firefox and Safari were not tested. | Open |
| G4 | Storage-full behavior was tested by simulating blocked storage, not by exhausting the real quota. | Open |
| G5 | Two tabs open at once overwrite each other. Not handled. | Open (accepted) |
| G6 | History and records can be edited in browser developer tools. There is no tamper-proof audit trail. | Open (accepted) |
| G7 | Average resolution time uses elapsed clock time, not working hours. | Open (by design) |
| G8 | The usability study is proposed, not run. No user research exists. | Open |

### Intended-use assessment and release recommendation

Intended use: demonstrate a request portal concept to reviewers with synthetic data. Fit for that use, subject to the gaps above. Not fit for real, personal or confidential data and not a production system. Recommendation: release as a private concept demonstration only.

## 10. Environments and deployment

| Environment | Description | Owner role |
|---|---|---|
| Development | A developer's machine. Open dist/index.html or serve dist/ with any static server. Run node --test tests/core.test.cjs. | Developer |
| Preview / test | Local static server plus the browser checks; a Vercel preview deployment would serve the same files. | QA Tester |
| Hosted prototype | One Vercel project, static files from dist/, Vercel Authentication on (private). Not a production service. | Deployment and Production Support Team |

Configuration: vercel.json sets the output directory to dist and basic security headers. No server-side secrets. The hosted copy carries the analytics project token only in its own config.js, which is not part of the source or the project package. Source freeze: files in dist/ are hashed before deployment and compared after.

Deployment: upload dist/ to the Vercel project with Vercel Authentication on. Verify by comparing deployed file contents against local hashes. Rollback: redeploy the previous deployment or the last tagged source. Support ownership: the author; no on-call, no monitoring, no uptime target.

## 11. Handover

Run locally: serve dist/ with any static server, or open dist/index.html. Run tests: node --test tests/*.cjs, python3 -I tests/browser_check.py <port>. Change data model: edit core.js and its tests together, bump the storage version, and add a migration. Next steps are listed in the roadmap.

## 12. Tool mapping

See Tool_Mapping.md. Only the tools listed there as used were used.
