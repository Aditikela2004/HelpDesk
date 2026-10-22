# Single source of truth for ServiceFlow documentation. Everything here is fictional or simulated unless marked otherwise.
COMPANY = "Northstar Studio"

ROLES = [
 ("CEO and executive sponsor", "Fund a one-day MVP and ask for one outcome: employees know who owns a request and what state it is in.", "Sponsor statement and proposed acceptance gates (simulated)."),
 ("CIO", "Accept a buildless, browser-local prototype for the demonstration and name what blocks production use.", "Technology rationale, security boundaries, production gap list."),
 ("Operations Director", "Supply the brief. Limit version 1 to IT, Facilities and HR with ownership and workload visibility.", "Simulated brief and pain points."),
 ("Department heads", "Require named owners per department and a view of active workload.", "Owner lists and workload requirements."),
 ("Employees and end users", "Submit once, then see owner and status without asking.", "Assumed personas and example requests."),
 ("Product Manager", "Prioritize with MoSCoW. Defer notifications, uploads, SLA enforcement and sign-in.", "Problem statement, PRD, roadmap."),
 ("Project Manager", "Plan the build as one day with five release gates and a short risk register.", "Charter, work breakdown, plan, RAID, decision log, release checklist, handover."),
 ("Program Manager", "Coordinate four workstreams around shared gates, and show what comes after version 1.", "Program view and dependency map."),
 ("Business Analyst", "Turn the brief into ten testable requirements with explicit business rules.", "R01 to R10, user stories, acceptance criteria, rules."),
 ("UI/UX Designer", "Design one submission flow and one assignment and resolution flow, with clear empty and error states.", "Information architecture, flows, wireframes, usability study proposal."),
 ("Visual Designer", "Keep the look restrained, with text labels on every status color.", "Design tokens and component states."),
 ("Developer", "Separate business logic from rendering, validate stored data, and escape user text.", "Source code and README."),
 ("Data Analyst", "Define each metric and prove the seed data reconciles by hand.", "Metric dictionary, seed reconciliation, sample CSV."),
 ("QA Tester", "Test every requirement automatically where possible and record only what was executed.", "Test strategy, automated tests, manual scripts, QA evidence."),
 ("Validation Lead", "Judge whether the prototype is fit for its stated intended use, and for nothing more.", "Intended-use assessment and release recommendation."),
 ("Software Environment Team", "Define development, preview and hosted environments, configuration, and the source freeze.", "Environment and configuration notes."),
 ("Deployment and Production Support Team", "Package, deploy, verify, and describe rollback and support ownership for a prototype.", "Deployment runbook and handover."),
]

DOWNLOADS = [
 ("Confluence_Handbook.md", "Product and technical handbook (Markdown)"),
 ("Engineering_Backlog.csv", "Engineering backlog (Jira import layout)"),
 ("Delivery_Tracker.csv", "Cross-functional delivery tracker (monday.com layout)"),
 ("Requirements_Traceability.csv", "Need to requirement to test to release disposition"),
 ("ServiceFlow_Wireframes.svg", "Editable SVG wireframes"),
 ("Sample_Requests.csv", "The 12 demonstration records as CSV"),
 ("Tool_Mapping.md", "Which tool holds what, and what was actually used"),
 ("QA_Evidence.md", "Executed test evidence, gaps and release recommendation"),
 ("Unit_Test_Results.txt", "Raw output of the unit tests"),
 ("Static_Checks.txt", "Raw output of the static checks"),
 ("Browser_Check_Results.txt", "Raw output of the browser checks"),
]

# id, name, stakeholder need, MoSCoW, rule, backlog, implementation, tests, disposition
REQS = [
 ("R01", "Structured submission", "N1 Scattered intake and N2 incomplete information: ask for the same fields every time.", "Must",
  "Title 5-100, requester 1-60, description 10-2000 characters after trimming; department, priority and category from fixed lists.",
  "SFE-002, SFE-003", "core.js validateNewRequest; app.js New request dialog", "U03, U04, U05, U19; B03", "Verified (automated)"),
 ("R02", "Routing", "N3 Unclear department routing: every request lands with a department from the start.", "Must",
  "Unique SF- identifier; keeps selected department; starts Open and Unassigned; creation timestamp and first history entry.",
  "SFE-004, SFE-005", "core.js nextId, createRequest", "U01, U02, U18; B02", "Verified (automated)"),
 ("R03", "Ownership and lifecycle", "N4 Missing ownership and N5 repeated follow-ups: a named owner and a visible status.", "Must",
  "Statuses Open, In progress, Resolved. Owner must belong to the department. Owner required for In progress or Resolved. Reopening allowed.",
  "SFE-007, SFE-008, SFE-009", "core.js updateRequest; request detail dialog", "U06, U07, U08, U09, U20; B04, B05", "Verified (automated)"),
 ("R04", "History and timestamps", "N5 Repeated follow-ups: anyone can see what changed and when.", "Must",
  "History entry for each meaningful owner or status change. No entry when nothing changes. resolvedAt set on resolve, cleared on reopen, replaced on re-resolve.",
  "SFE-010, SFE-011", "core.js updateRequest; history list in detail dialog", "U07, U09, U10, U22; B04, B05, B06", "Verified (automated)"),
 ("R05", "Search and filtering", "N7 Limited visibility of completed work and N6 inconsistent views.", "Must",
  "Search ID, title, requester, description, owner. Combine with department, status, priority. Active = Open + In progress. High-priority review excludes Resolved. No-results state with Clear filters.",
  "SFE-013, SFE-014, SFE-015, SFE-016", "core.js filterRequests, highPriorityActive; Requests view", "U13, U14; B07, B08", "Verified (automated)"),
 ("R06", "Metrics", "N6 Inconsistent workload reporting: one set of records feeds every number.", "Must",
  "Metrics computed from the same records as the directory. Empty dataset gives zeros, a null average and no division error.",
  "SFE-018, SFE-019", "core.js computeMetrics; Overview and Analytics views", "U11, U12, U21, U23; B01, B09", "Verified (automated)"),
 ("R07", "Local persistence", "Keep the demonstration usable between visits without a server.", "Must",
  "Save to localStorage; validate on load; warn on missing, unreadable or full storage; keep working in memory; offer CSV export; explain the browser-and-origin limit.",
  "SFE-021, SFE-022, SFE-024", "core.js parseSaved, validateAll; app.js load, persist", "U16, U17; B02, B11, B14, B15", "Verified (automated); real quota exhaustion not tested"),
 ("R08", "Export", "Let leaders take the data into a spreadsheet.", "Must",
  "CSV of all current records; quotes escaped; leading = + - @ tab and CR neutralized in every text cell. Download tested separately from generation.",
  "SFE-023", "core.js toCsv, csvCell; app.js exportCsv", "U15; B10", "Verified (automated)"),
 ("R09", "Interface", "Usable on a laptop and a phone, with keyboard access.", "Must",
  "Responsive layouts, labeled inputs, visible focus, semantic navigation, text labels with status colors. No conformance claim.",
  "SFE-025, SFE-026", "index.html, styles.css, app.js dialogs", "B03, B12, B13, B19, B20; manual M08, M09", "Partly verified: automated checks only, no conformance audit, Chromium only"),
 ("R10", "Delivery evidence", "Show how the need became a release.", "Must",
  "Linked requirements, backlog, designs, source, test evidence, deployment configuration and handover.",
  "SFE-027, SFE-028, SFE-029", "dist/delivery artifacts; Delivery case study view", "S01 to S10 static checks; B17", "Verified (static checks and file review)"),
]

PAIN = [
 ("N1", "Scattered request intake", "Requests arrive by email and chat and get lost.", "R01, R02"),
 ("N2", "Incomplete information", "Coordinators ask the same follow-up questions.", "R01"),
 ("N3", "Unclear department routing", "Nobody is sure which team should act.", "R02"),
 ("N4", "Missing ownership", "No named person owns a request.", "R03"),
 ("N5", "Repeated status follow-ups", "Employees chase for updates.", "R03, R04"),
 ("N6", "Inconsistent workload reporting", "Department heads cannot see current workload.", "R05, R06"),
 ("N7", "Limited visibility into completed requests", "Finished work is hard to find or count.", "R05, R06"),
]

# id, type, summary, requirement, role, moscow, size, status, acceptance
BACKLOG = [
 ("SFE-001","Epic","Request intake","R01, R02","Product Manager","Must","L","Done",""),
 ("SFE-002","Story","Validate submission fields with trimming and length limits","R01","Developer","Must","S","Done","Title 5-100, requester 1-60, description 10-2000 after trimming"),
 ("SFE-003","Story","Reject invalid department, priority, category and blank input","R01","Developer","Must","S","Done","Whitespace-only and unknown values return a field error"),
 ("SFE-004","Story","Create request with unique identifier and department routing","R02","Developer","Must","S","Done","ID is SF- plus next number; starts Open and Unassigned"),
 ("SFE-005","Story","Write initial history entry and timestamps","R02, R04","Developer","Must","XS","Done","createdAt, updatedAt, one history entry"),
 ("SFE-006","Epic","Ownership and lifecycle","R03, R04","Product Manager","Must","L","Done",""),
 ("SFE-007","Story","Assign an owner from the request's department","R03","Developer","Must","S","Done","Owners from another department are rejected"),
 ("SFE-008","Story","Change status with owner required for In progress and Resolved","R03","Developer","Must","S","Done","Unassigned requests cannot move forward"),
 ("SFE-009","Story","Reopen a resolved request","R03, R04","Developer","Must","XS","Done","Status can leave Resolved; resolvedAt cleared"),
 ("SFE-010","Story","Record owner and status changes; skip no-op saves","R04","Developer","Must","S","Done","No history entry when nothing changes"),
 ("SFE-011","Story","Maintain resolvedAt on resolve, reopen and re-resolve","R04","Developer","Must","S","Done","New resolution time recorded each time"),
 ("SFE-012","Epic","Find and filter requests","R05","Product Manager","Must","M","Done",""),
 ("SFE-013","Story","Search across ID, title, requester, description, owner","R05","Developer","Must","S","Done","Case-insensitive, trimmed"),
 ("SFE-014","Story","Combine search with department, status, priority and Active","R05","Developer","Must","S","Done","Active = Open + In progress"),
 ("SFE-015","Story","High-priority review action excludes resolved requests","R05","Developer","Must","XS","Done","Shows only active High requests"),
 ("SFE-016","Story","No-results state and Clear filters","R05","UI/UX Designer","Must","XS","Done","Message and one-click reset"),
 ("SFE-017","Epic","Metrics and analytics","R06","Data Analyst","Must","M","Done",""),
 ("SFE-018","Story","Overview cards, recent requests and department workload","R06","Developer","Must","M","Done","Numbers match the directory"),
 ("SFE-019","Story","Analytics view with definitions and empty-data handling","R06","Data Analyst","Must","M","Done","No NaN or division error with zero records"),
 ("SFE-020","Epic","Persistence and export","R07, R08","Developer","Must","M","Done",""),
 ("SFE-021","Story","Save to localStorage and validate on load","R07","Developer","Must","S","Done","Malformed data is rejected, not partly loaded"),
 ("SFE-022","Story","Warn when storage is missing, unreadable or full","R07","Developer","Must","S","Done","Visible warning; memory use continues; CSV offered"),
 ("SFE-023","Story","CSV export with escaping and formula protection","R08","Developer","Must","S","Done","Quotes escaped; leading = + - @ neutralized"),
 ("SFE-024","Story","Reset demonstration data after confirmation","R07","Developer","Should","XS","Done","Cancel keeps data; confirm restores 12 records"),
 ("SFE-025","Story","Responsive layout, labeled inputs, visible focus, text status labels","R09","UI/UX Designer","Must","M","Done","Works at 375 px wide without page scroll"),
 ("SFE-026","Story","Dialog keyboard behavior and focus return","R09","Developer","Must","S","Done","Escape closes; focus returns to opener or heading"),
 ("SFE-027","Story","Delivery case study view with downloads","R10","Project Manager","Must","S","Done","Every download link resolves"),
 ("SFE-028","Story","Automated unit, static and browser checks with recorded results","R10","QA Tester","Must","M","Done","Results files list pass and fail"),
 ("SFE-029","Story","Hosting configuration and deployment verification","R10","Deployment and Production Support Team","Must","S","Done","Deployed files match tested files"),
 ("SFE-030","Story","Sign-in and roles","None (v1)","Product Manager","Won't","XL","Deferred","Not in version 1"),
 ("SFE-031","Story","Email or chat notifications","None (v1)","Product Manager","Won't","L","Deferred","Not in version 1"),
 ("SFE-032","Story","File uploads on requests","None (v1)","Product Manager","Won't","L","Deferred","Not in version 1"),
 ("SFE-033","Story","SLA targets and automated enforcement","None (v1)","Product Manager","Won't","L","Deferred","Not in version 1"),
 ("SFE-034","Story","Shared database, sync and enterprise integrations","None (v1)","CIO","Won't","XL","Deferred","Not in version 1"),
]

RISKS = [
 ("K1","Risk","Local data is editable and not shared; readers may mistake the demo for a system of record","High","High","Banner on every screen, README and case study; no real data","Project Manager","Open (accepted for prototype)"),
 ("K2","Risk","Two browser tabs overwrite each other (last write wins)","Medium","Low","Documented limitation; no live sync in v1","Developer","Open (accepted)"),
 ("K3","Risk","Browser storage unavailable or full","Medium","Medium","Warning, in-memory mode, CSV export; tested with blocked and unreadable storage","Developer","Mitigated"),
 ("K4","Risk","Metrics misread as SLA compliance","Medium","High","Metric definitions on the Analytics view and in the dictionary","Data Analyst","Mitigated"),
 ("K5","Risk","Formula injection in exported CSV","Medium","High","Leading = + - @ tab CR neutralized; unit-tested","Developer","Mitigated"),
 ("K6","Risk","Accessibility claimed without testing","Medium","Medium","No conformance claim; automated checks only; manual review pending","QA Tester","Open"),
 ("K7","Risk","Scope grows beyond one day","High","Medium","MoSCoW list and Won't items fixed in the charter","Product Manager","Mitigated"),
 ("K8","Risk","Hosting is unavailable or access is blocked","Low","Medium","Runnable source and manual deployment steps in the handbook","Deployment and Production Support Team","Mitigated"),
 ("I1","Issue","First browser run of the narrow layout scrolled sideways because the content grid grew with wide tables","","","Fixed grid tracks to minmax(0, 1fr); rechecked","Developer","Closed"),
 ("I2","Issue","Three of the first browser checks failed because of script errors, not product defects (line endings, a wrong status assumption, dialog focus wording)","","","Corrected the checks and reran all 20","QA Tester","Closed"),
]

DECISIONS = [
 ("D-01","Use a buildless static site","No install or build step; fits a one-day scope and any static host.","CIO, Developer"),
 ("D-02","Keep business logic out of the rendering file","core.js can be unit tested in Node with no browser.","Developer"),
 ("D-03","Store data in localStorage only","No server, no accounts, no real data. Limits are stated everywhere.","CIO"),
 ("D-04","Owners come from fixed department lists","Meets the ownership rule without a user directory.","Business Analyst"),
 ("D-05","Reject the whole saved set if any record is invalid","Partial loading could hide corruption.","Developer, QA Tester"),
 ("D-06","Keep Reset demo data as a Should","Needed for demonstration, not for the business need.","Product Manager"),
 ("D-07","Show metric definitions next to the numbers","Prevents resolution share being read as SLA compliance.","Data Analyst"),
 ("D-08","Use one backlog (Jira layout) and one tracker (monday.com layout)","Avoids conflicting completion records.","Project Manager"),
 ("D-09","Host privately first","Public sharing is a separate, deliberate step.","Deployment and Production Support Team"),
]

TECH_DECISIONS = [
 ("TD-01","Plain JavaScript, no framework or dependency","Fewer moving parts, nothing to patch, easy to review."),
 ("TD-02","UMD-style core.js","Same file runs in Node for tests and in the browser."),
 ("TD-03","DOM built with textContent, never innerHTML","User text cannot become markup."),
 ("TD-04","ISO 8601 UTC timestamps","Unambiguous storage; shown in the viewer's locale."),
 ("TD-05","Native dialog element","Built-in focus containment and Escape handling."),
 ("TD-06","Identifier is the highest existing number plus one","Unique without a counter; never reused within a dataset."),
]

CHANGE = ("CR-001 (example)", "Add an Active filter and a high-priority review action",
 "Raised during build review by the simulated Operations Director: 'Resolved items clutter what my teams must do today.'",
 "R05 originally listed department, status and priority filters. Added Active (Open + In progress) and a review action that excludes Resolved.",
 "Effort: small. Risk: low. Tests added: U14, B08. No schedule change.",
 "Approved by the simulated Product Manager. This is an illustrative change-control record, not a real approval.")

RELEASE_CHECKLIST = [
 "Source frozen and application file hashes recorded",
 "All unit tests pass",
 "Static checks pass",
 "Browser checks pass in Chromium",
 "Deployment configuration matches the release",
 "Deployed files match the tested files",
 "Access status confirmed (private)",
 "Known gaps and limitations documented",
 "Handover notes written",
 "Release recommendation recorded",
]

PERSONAS = [
 ("Maya, requester (assumed)", "Submits a laptop issue between meetings.", "Wants one place to ask, and to see who owns it without asking again."),
 ("Marcus, department coordinator (assumed)", "Picks up IT requests each morning.", "Wants complete requests, a clear owner field, and an easy way to mark progress."),
 ("Hana, department head (assumed)", "Plans the week for a small team.", "Wants active workload by department and what is unassigned."),
]

STORIES = [
 ("US-01","As an employee, I submit a request with the required details so the right team can act.","Invalid or blank fields show a message next to the field and nothing is created.","R01"),
 ("US-02","As an employee, I choose a department so my request goes to the right team.","The request keeps that department and starts Open and Unassigned.","R02"),
 ("US-03","As a coordinator, I assign an owner from my department so everyone knows who is responsible.","Only owners from the same department can be chosen.","R03"),
 ("US-04","As a coordinator, I change status so requesters can see progress.","I cannot set In progress or Resolved without an owner.","R03"),
 ("US-05","As a coordinator, I reopen a request that was closed too early.","The resolved time clears and the history says Reopened.","R03, R04"),
 ("US-06","As an employee, I see a dated history of changes so I do not need to ask for updates.","Each owner or status change adds one dated entry; a save with no change adds none.","R04"),
 ("US-07","As a coordinator, I search and filter so I can find work quickly.","Search combines with department, status, priority and Active.","R05"),
 ("US-08","As a department head, I see what is active, high priority and unassigned.","The high-priority action shows no resolved requests.","R05, R06"),
 ("US-09","As an operations director, I see totals, resolution share and average resolution time.","Numbers come from the same records as the directory and define themselves.","R06"),
 ("US-10","As a presenter, I keep my records between visits and know when they are not saved.","A warning appears when storage fails; CSV export is offered.","R07"),
 ("US-11","As an analyst, I export all requests to CSV and open them safely in a spreadsheet.","Quotes are escaped and formula characters are neutralized.","R08"),
 ("US-12","As a reviewer, I download the project's artifacts from one place.","Every download link opens a real file.","R10"),
]

BUSINESS_RULES = [
 ("BR-01","Text fields are trimmed before length checks.","R01"),
 ("BR-02","A request keeps the department it was submitted to.","R02"),
 ("BR-03","New requests are Open and Unassigned.","R02"),
 ("BR-04","Owners must belong to the request's department.","R03"),
 ("BR-05","An owner is required before In progress or Resolved.","R03"),
 ("BR-06","A request can be reopened from Resolved.","R03"),
 ("BR-07","History records only changes to owner or status.","R04"),
 ("BR-08","resolvedAt is set on resolve, cleared on reopen, replaced on re-resolve.","R04"),
 ("BR-09","Active means Open plus In progress.","R05"),
 ("BR-10","Resolution share is resolved divided by all requests. It is not SLA compliance.","R06"),
 ("BR-11","Average resolution time covers requests currently Resolved, from createdAt to resolvedAt.","R06"),
]

METRICS = [
 ("Total requests","All records","Count of records","12"),
 ("Open","All records","Count where status is Open","5"),
 ("In progress","All records","Count where status is In progress","3"),
 ("Resolved","All records","Count where status is Resolved","4"),
 ("Active requests","All records","Open + In progress","8"),
 ("High-priority active","Active records","Count where priority is High","2"),
 ("Resolution share","All records","Resolved / Total x 100; 0 if there are no records","4 / 12 x 100 = 33.3%"),
 ("Average resolution time","Records currently Resolved","Mean of (resolvedAt - createdAt) in hours; empty if none","81 / 4 = 20.25 hours"),
 ("Department distribution","All records","Count per department","IT 5, Facilities 4, HR 3"),
 ("Status distribution","All records","Count per status","Open 5, In progress 3, Resolved 4"),
]

TOKENS = [
 ("Sidebar","#14272e","Navigation background"),
 ("Main text","#19272e","Body text and headings"),
 ("Background","#f6f7f9","Page background"),
 ("Panel","#ffffff","Cards, tables, dialogs"),
 ("Primary action","#305bd8","Primary buttons and focus-adjacent accents"),
 ("Focus ring","#f2a900","3 px outline on keyboard focus"),
 ("Open","#fff1d6 on #6b4400","Status badge, always with the word Open"),
 ("In progress","#dbe8ff on #1b3f9a","Status badge, always with the words In progress"),
 ("Resolved","#d9f2e3 on #14573a","Status badge, always with the word Resolved"),
 ("High priority","#fde0de on #8a1f17","Priority badge, always with the word High"),
 ("Type","System sans-serif, 16 px base","No web fonts, no external requests"),
 ("Spacing and radius","8 / 12 / 16 px steps; 8-10 px radius","Comfortable density, subtle borders"),
]

STATES = [
 ("Button","Default, hover (border darkens), focus (3 px amber outline), disabled (50% opacity)"),
 ("Text input and select","Default, focus, error (message below, field marked invalid)"),
 ("Status and priority badge","One style per value; the value is always printed as text"),
 ("Requests table","Populated, empty (no records), no results (filters matched nothing), scrollable at narrow width"),
 ("New request dialog","Empty, validation error per field, success (dialog closes, toast confirms)"),
 ("Request detail dialog","Viewing, saved, no changes, error (owner required or invalid)"),
 ("Storage warning","Hidden, unreadable data, storage unavailable, save failed"),
 ("Loading","A single 'Loading ServiceFlow' line until the first render; no spinners because data is local"),
]

ENVS = [
 ("Development","A developer's machine. Open dist/index.html or serve dist/ with any static server. Run node --test tests/core.test.cjs.","Developer"),
 ("Preview / test","Local static server plus the browser checks; a Vercel preview deployment would serve the same files.","QA Tester"),
 ("Hosted prototype","One Vercel project, static files from dist/, Vercel Authentication on (private). Not a production service.","Deployment and Production Support Team"),
]

GAPS = [
 ("G1","Manual acceptance scripts M01 to M10 have not been executed by a human tester. The browser checks cover similar ground automatically.","Open"),
 ("G2","Accessibility conformance has not been tested with a screen reader or audit. Only automated checks ran.","Open"),
 ("G3","Browser coverage is Chromium only. Firefox and Safari were not tested.","Open"),
 ("G4","Storage-full behavior was tested by simulating blocked storage, not by exhausting the real quota.","Open"),
 ("G5","Two tabs open at once overwrite each other. Not handled.","Open (accepted)"),
 ("G6","History and records can be edited in browser developer tools. There is no tamper-proof audit trail.","Open (accepted)"),
 ("G7","Average resolution time uses elapsed clock time, not working hours.","Open (by design)"),
 ("G8","The usability study is proposed, not run. No user research exists.","Open"),
]

MANUAL = [
 ("M01","Submit a valid request","Open New request, fill every field with valid values, submit.","New request appears in Requests as Open and Unassigned; toast confirms."),
 ("M02","Submit an invalid request","Leave title blank, enter a 4-character title, enter a 9-character description.","Each field shows its message; no request is created."),
 ("M03","Assign and progress","Open an unassigned request, try In progress, then assign an owner and retry.","Error first, then success; history shows both changes."),
 ("M04","Resolve and reopen","Resolve a request, then reopen it.","Resolved time appears, then clears; history says Reopened."),
 ("M05","Filter and search","Search an owner name, then add department and status filters.","Results narrow; count updates; Clear filters restores all."),
 ("M06","Export","Click Export CSV and open the file in a spreadsheet.","All records present; a title beginning with = appears as text."),
 ("M07","Reset","Click Reset demo data, cancel, then repeat and confirm.","Cancel keeps data; confirm restores the 12 records."),
 ("M08","Keyboard only","Complete M01 and M03 using the keyboard alone.","Every control reachable; focus visible; Escape closes dialogs."),
 ("M09","Phone width","Repeat M01 and M05 at about 375 px wide.","No clipped controls; tables scroll inside their box."),
 ("M10","Storage warning","Open the site in a private window that blocks storage.","A warning explains that nothing will be saved; CSV export is offered."),
]

STUDY = ("Proposed usability study (not run)",
 ["Participants: five or so employees of any organization, with consent; no confidential data.",
  "Tasks: submit a request; find who owns an existing request; (coordinator role) assign and resolve a request; find unresolved high-priority requests.",
  "Measures: task outcome (alone, with help, could not), ease rating 1 to 7, errors, quotes.",
  "Report counts and quotes. Five sessions find common problems but do not support percentages for all users."])

FUTURE_BASELINE = [
 "Baseline before any pilot: sample 30 days of requests from the current email and chat channels. Record how many arrived incomplete, how long until someone replied, and how many follow-up messages each needed.",
 "Pilot measures: share of requests submitted with all fields, time from submission to first owner assigned, follow-up messages per request, active requests per department each week, and coordinator and employee satisfaction ratings.",
 "Compare the pilot with the baseline over the same length of time. Treat differences as hypotheses until the sample is large enough and other changes are ruled out.",
 "Do not report SLA compliance until targets exist and timestamps are trustworthy.",
]

VALUE_HYPOTHESIS = "If employees submit through one structured form and coordinators assign visible owners, fewer requests will arrive incomplete and employees will need fewer follow-ups. This is a hypothesis. No measurement exists."
