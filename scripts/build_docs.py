import csv, io, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(__file__))
from content import *
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "dist", "delivery")
os.makedirs(OUT, exist_ok=True)

def w(name, text):
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="") as f:
        f.write(text)

def rd(name, default="(not yet generated)"):
    p = os.path.join(OUT, name)
    return open(p, encoding="utf-8").read() if os.path.exists(p) else default

def csv_text(header, rows):
    s = io.StringIO()
    cw = csv.writer(s, lineterminator="\r\n")
    cw.writerow(header)
    for r in rows: cw.writerow(r)
    return s.getvalue()

def md_table(header, rows):
    esc = lambda x: str(x).replace("|", "/").replace("\n", " ")
    out = ["| " + " | ".join(header) + " |", "|" + "|".join(["---"] * len(header)) + "|"]
    for r in rows: out.append("| " + " | ".join(esc(c) for c in r) + " |")
    return "\n".join(out) + "\n"

# ---- result facts (from real runs, if present)
unit = rd("Unit_Test_Results.txt", "")
browser = rd("Browser_Check_Results.txt", "")
static = rd("Static_Checks.txt", "")
def count(pat, s):
    m = re.search(pat, s); return m.group(1) if m else None
u_pass = count(r"# pass (\d+)", unit); u_fail = count(r"# fail (\d+)", unit); u_tests = count(r"# tests (\d+)", unit)
b_pass = count(r"(\d+) passed", browser); b_fail = count(r"(\d+) failed", browser)
s_pass = count(r"(\d+) passed", static); s_fail = count(r"(\d+) failed", static)
have_results = all([u_pass, b_pass, s_pass])
def res(a, b): return f"{a} passed, {b} failed" if a is not None else "not yet run"

# ---- CSVs
w("Engineering_Backlog.csv", csv_text(
 ["Key","Issue Type","Summary","Requirement","Owner role","MoSCoW","Size","Status","Acceptance criteria"], BACKLOG))
GATES = ["G1 Define","G2 Design","G3 Build","G4 Verify","G5 Release"]
TRACK = [
 ("Stakeholder brief and pain points","Product","Product Manager","G1 Define","Done","Brief section of handbook"),
 ("Charter, scope, MoSCoW","Product","Project Manager","G1 Define","Done","Handbook 3"),
 ("Requirements R01 to R10 and rules","Analysis","Business Analyst","G1 Define","Done","Requirements_Traceability.csv"),
 ("Information architecture and flows","Design","UI/UX Designer","G2 Design","Done","Handbook 6"),
 ("Wireframes (Overview, Create, Detail)","Design","UI/UX Designer","G2 Design","Done","ServiceFlow_Wireframes.svg"),
 ("Design tokens and component states","Design","Visual Designer","G2 Design","Done","Handbook 6"),
 ("Core logic module","Engineering","Developer","G3 Build","Done","dist/core.js"),
 ("Interface","Engineering","Developer","G3 Build","Done","dist/app.js, styles.css"),
 ("Metric dictionary and seed reconciliation","Data","Data Analyst","G3 Build","Done","Handbook 8"),
 ("Unit tests","Quality","QA Tester","G4 Verify","Done" if u_pass else "Planned","Unit_Test_Results.txt"),
 ("Static checks","Quality","QA Tester","G4 Verify","Done" if s_pass else "Planned","Static_Checks.txt"),
 ("Browser checks (Chromium)","Quality","QA Tester","G4 Verify","Done" if b_pass else "Planned","Browser_Check_Results.txt"),
 ("Manual acceptance scripts M01 to M10","Quality","QA Tester","G4 Verify","Pending human tester","QA_Evidence.md"),
 ("Intended-use assessment","Validation","Validation Lead","G4 Verify","Done","QA_Evidence.md"),
 ("Environment and configuration","Release","Software Environment Team","G5 Release","Done","vercel.json, README.md"),
 ("Deployment and verification","Release","Deployment and Production Support Team","G5 Release","See final handoff","Handbook 10"),
 ("Handover","Release","Project Manager","G5 Release","Done","Handbook 11"),
]
w("Delivery_Tracker.csv", csv_text(["Item","Workstream","Owner role","Gate","Status","Evidence"], TRACK))
w("Requirements_Traceability.csv", csv_text(
 ["Req ID","Requirement","Stakeholder need","MoSCoW","Business rule","Backlog","Implementation","Test evidence","Release disposition"], REQS))

# sample requests from the real seed
node = "const c=require('./dist/core.js');process.stdout.write(c.toCsv(c.seedRequests()))"
seed_csv = subprocess.run(["node","-e",node],cwd=ROOT,capture_output=True,text=True,check=True).stdout
w("Sample_Requests.csv", seed_csv)

# ---- wireframes
def svg():
    W, H = 1200, 2000
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="system-ui, sans-serif" font-size="14">',
         '<title>ServiceFlow wireframes</title><desc>Editable low-fidelity wireframes for Overview, Create Request and Request Detail. Not a Figma file.</desc>',
         f'<rect width="{W}" height="{H}" fill="#f6f7f9"/>']
    def rect(x,y,wd,h,fill="#fff",stroke="#c9d0d6",r=8): o.append(f'<rect x="{x}" y="{y}" width="{wd}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}"/>')
    def text(x,y,t,size=14,fill="#19272e",weight="400"): o.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" font-weight="{weight}">{t}</text>')
    def frame(y,title):
        text(40,y-14,title,20,weight="700")
        rect(40,y,1120,600,"#fff","#9aa5ad",12)
        rect(40,y,220,600,"#14272e","#14272e",12)
        text(64,y+40,"ServiceFlow",18,"#fff","700")
        for i,n in enumerate(["Overview","Requests","Analytics","Delivery case study"]):
            text(64,y+90+i*36,n,14,"#dfe7ea")
        rect(280,y+16,860,36,"#fff1d6","#e0b45c",6); text(294,y+39,"Portfolio prototype: fictional data, stored in this browser only.",13,"#6b4400")
    # 1 Overview
    y=60; frame(y,"1. Overview")
    for i,(lab,val) in enumerate([("Total","12"),("Active","8"),("High-priority active","2"),("Resolution share","33.3%"),("Avg resolution","20.25 h")]):
        x=280+i*172; rect(x,y+72,160,80); text(x+12,y+100,lab,12,"#5a6770"); text(x+12,y+134,val,24,weight="700")
    rect(280,y+168,860,56,"#fde0de","#d98b85"); text(296,y+192,"2 active high-priority requests",14,"#8a1f17","700"); rect(900,y+180,224,32,"#305bd8","#305bd8",6); text(916,y+201,"Review high-priority requests",12,"#fff")
    text(280,y+256,"Recent requests",16,weight="700")
    for i in range(5): rect(280,y+270+i*34,540,30,"#fff"); text(292,y+290+i*34,"SF-#### | Title | Department | [Status]",12,"#5a6770")
    text(840,y+256,"Workload by department",16,weight="700")
    for i,d in enumerate(["IT","Facilities","HR"]): rect(840,y+270+i*44,300,38); text(852,y+294+i*44,f"{d}: Open / In progress / Resolved",12,"#5a6770")
    # 2 Create
    y=720; frame(y,"2. Create request")
    rect(480,y+70,440,500,"#fff","#305bd8",12); text(500,y+104,"New request",18,weight="700")
    fields=["Title","Requester","Department (IT / Facilities / HR)","Priority (High / Normal / Low)","Category","Description"]
    for i,f in enumerate(fields):
        yy=y+124+i*62; text(500,yy,f,12,"#5a6770"); rect(500,yy+8,400,34 if f!="Description" else 60,"#fff")
    text(500,y+520,"Field errors appear under each field. Focus moves to the first error.",11,"#8a1f17")
    rect(700,y+530,90,30,"#fff"); text(722,y+550,"Cancel",13); rect(800,y+530,100,30,"#305bd8","#305bd8",6); text(822,y+550,"Submit",13,"#fff")
    # 3 Detail
    y=1380; frame(y,"3. Request detail")
    rect(480,y+70,440,500,"#fff","#305bd8",12); text(500,y+104,"SF-#### Title",18,weight="700")
    text(500,y+130,"[Status badge]  [Priority badge]  Department",12,"#5a6770")
    rect(500,y+146,400,60,"#f6f7f9"); text(512,y+170,"Description and requester",12,"#5a6770")
    text(500,y+236,"Owner",12,"#5a6770"); rect(500,y+244,190,34,"#fff"); text(700,y+236,"Status",12,"#5a6770"); rect(700,y+244,200,34,"#fff")
    rect(500,y+292,100,30,"#305bd8","#305bd8",6); text(528,y+312,"Save",13,"#fff")
    text(500,y+356,"History",14,weight="700")
    for i in range(4): rect(500,y+368+i*36,400,30,"#fff"); text(512,y+388+i*36,"Date time - Assigned to X. / Status changed from ... to ...",11,"#5a6770")
    o.append("</svg>")
    return "\n".join(o)
w("ServiceFlow_Wireframes.svg", svg())

# ---- handbook markdown (single source for docx too)
def handbook():
    M = []
    a = M.append
    a("# ServiceFlow Handbook\n")
    a(f"AI-assisted independent portfolio project. The fictional client is {COMPANY}, about 75 employees. All people, departments, data and approvals are simulated. Nothing here records a real approval, interview, survey, adoption or saving.\n")
    a("## 1. Purpose and scope\n")
    a("ServiceFlow is a small employee service request portal. Employees submit a request to IT, Facilities or HR. Coordinators assign an owner and move the request through Open, In progress and Resolved. Leaders see workload and a few defined metrics. It runs in the browser from static files and saves to localStorage. It is a prototype for demonstration with synthetic data only.\n")
    a("Out of scope for version 1: sign-in and roles, notifications, file uploads, SLA enforcement, shared database or integrations. See the Won't items in the backlog.\n")
    a("## 2. Stakeholder brief and pain points\n")
    a("Simulated sponsor brief: requests reach IT, Facilities and HR through email and chat. People do not know who owns a request or what state it is in, and department heads lack a shared view of workload.\n")
    a(md_table(["ID","Pain point","What it looks like","Requirements"], PAIN))
    a("### Objectives and value hypothesis\n")
    a(VALUE_HYPOTHESIS + "\n")
    a("### Assumptions, constraints and decision authority\n")
    for t in ["Assumption: the three departments each have two named coordinators (fictional).",
              "Assumption: employees can use a modern desktop or phone browser.",
              "Constraint: one-day scope, synthetic data only, no server and no accounts.",
              "Constraint: no real approvals exist. Roles in this document show what each role would decide, written by the author.",
              "Decision authority (simulated): scope and release go to the Product Manager and Project Manager; technology risk to the CIO; acceptance to the Validation Lead."]:
        a("- " + t)
    a("\n### Roles and decisions\n")
    a(md_table(["Role","Decision or position (simulated)","Deliverable"], ROLES))
    a("## 3. Product and business analysis\n")
    a("### Assumed personas\n")
    a(md_table(["Persona","Situation","Need"], PERSONAS))
    a("Personas are assumptions made for the exercise. No interviews were conducted.\n")
    a("### Requirements\n")
    a(md_table(["ID","Requirement","MoSCoW","Rule"], [(r[0],r[1],r[3],r[4]) for r in REQS]))
    a("### Business rules\n")
    a(md_table(["ID","Rule","Requirement"], BUSINESS_RULES))
    a("### User stories and acceptance criteria\n")
    a(md_table(["ID","Story","Acceptance criteria","Requirement"], STORIES))
    a("### Roadmap\n")
    a("- Version 1 (this project): requirements R01 to R10 as a local prototype.\n- Next, if a pilot is approved: sign-in, shared storage, notifications, and a working-hours definition of resolution time.\n- Later: SLA targets, integrations and reporting once real timestamps exist.\n")
    a("## 4. Project management\n")
    a("### Charter\n")
    a("Build and deploy a private prototype that meets R01 to R10, with documentation and recorded test evidence, inside one working day. Success is judged against the acceptance gates below, not against business results.\n")
    a("### Work breakdown and gates\n")
    a(md_table(["Gate","Exit condition"], [("G1 Define","Brief, requirements and rules written"),("G2 Design","Flows, wireframes and tokens written"),("G3 Build","Core logic and interface complete"),("G4 Verify","Unit, static and browser checks run; gaps listed"),("G5 Release","Deployed files match tested files; handover written")]))
    a("The delivery tracker lists each item with its gate, owner role and evidence. Effort estimates are not given because no time tracking was kept.\n")
    a("### RAID log\n")
    a(md_table(["ID","Type","Description","Likelihood","Impact","Response","Owner","Status"], RISKS))
    a("### Decision log\n")
    a(md_table(["ID","Decision","Reason","Roles"], DECISIONS))
    a("### Change control example\n")
    a(md_table(["Field","Entry"], list(zip(["Reference","Change","Origin","Effect on scope","Impact","Disposition"], CHANGE))))
    a("### Release checklist\n")
    for t in RELEASE_CHECKLIST: a("- [ ] " + t)
    a("\n### Program view\n")
    a("Four workstreams (Product and analysis, Design, Engineering, Quality and release) share gates G1 to G5. Design cannot close G2 until requirements are written; Engineering cannot close G3 until flows exist; Quality cannot close G4 until the build is frozen; Release cannot close G5 until G4 is recorded. Later phases (sign-in, shared storage, notifications) would form a second program increment. This is a simulated program view inside one independent project.\n")
    a("## 5. Delivery tracker and backlog\n")
    a("See Engineering_Backlog.csv (34 items; 29 done, 5 deferred) and Delivery_Tracker.csv. The backlog is the source of truth for engineering status; the tracker is the source of truth for cross-functional gates.\n")
    a("## 6. UI/UX and visual design\n")
    a("### Information architecture\n")
    a("Four views reached from the sidebar (top bar on narrow screens): Overview, Requests, Analytics, Delivery case study. Two dialogs: New request and Request detail. One confirmation dialog: Reset demo data.\n")
    a("### Flows\n")
    a("Submit: Requests or Overview, New request, fill fields, Submit, toast, request appears Open and Unassigned.\nAssign and resolve: Requests, open a row, choose owner, set status, Save, history updates.\nReview: Overview, Review high-priority requests, filtered list.\n")
    a("### Wireframes\n")
    a("ServiceFlow_Wireframes.svg holds low-fidelity wireframes for Overview, Create request and Request detail. It is an editable SVG. There is no Figma file.\n")
    a("### Design tokens\n")
    a(md_table(["Token","Value","Use"], TOKENS))
    a("### Component states\n")
    a(md_table(["Component","States"], STATES))
    a("### Responsive and accessibility intent\n")
    a("Layouts adapt at 900 px and 480 px. Tables scroll inside their own box. Inputs have labels, errors are linked to fields, focus is visible and dialogs return focus. Status is never shown by color alone. Intent is stated; conformance has not been audited.\n")
    a("### " + STUDY[0] + "\n")
    for t in STUDY[1]: a("- " + t)
    a("\n## 7. Development and architecture\n")
    a("Static files in dist/: index.html, styles.css, config.js (runtime settings, token empty in source), core.js (logic, no DOM), track.js (anonymous usage events) and app.js (rendering). core.js runs in Node for unit tests and in the browser. Data lives in localStorage under serviceflow.v1 as {version, requests}. User text is inserted with textContent. Departments, owners, statuses and priorities come from fixed lists. The Reset and Export CSV actions live on the Requests view.\n")
    a(md_table(["ID","Decision","Reason"], TECH_DECISIONS))
    a("### Security boundaries\n")
    a("No server and no sign-in. The app makes no network calls unless an analytics token is configured, which only the deployed demo does (see Product analytics below). Department filters are views, not permissions. Anyone with the page open can edit the stored data in developer tools. Do not enter real or confidential information.\n")
    a("### Storage behavior\n")
    a("Valid saved data loads on start. Missing data starts from the 12 seed records. Corrupt or invalid data triggers a warning and demo data in memory, and nothing is overwritten until the next change or reset. Unavailable storage triggers a warning and CSV export is offered. A failed save shows a warning. Two tabs overwrite each other (last write wins).\n")
    a("### Production gaps\n")
    a("Authentication and authorization, shared database, backups, audit trail, notifications, accessibility audit, privacy review and monitoring would all be needed for production.\n")
    a("## 8. Data analysis\n")
    a("### Metric dictionary\n")
    a(md_table(["Metric","Population","Formula","Seed value"], METRICS))
    a("### Seed reconciliation\n")
    a("Twelve seed requests: Open 5, In progress 3, Resolved 4; IT 5, Facilities 4, HR 3; two active high-priority. Resolved elapsed hours are 20, 25, 16 and 20, total 81, mean 20.25. Resolution share is 4 of 12, 33.3%. Active is 5 plus 3, 8.\n")
    a("### Data quality checks\n")
    a("On load: valid JSON, version 1, every record has valid enums, length-limited text, department-matching owner, owner present for In progress and Resolved, resolvedAt only when Resolved, history entries present. Any failure rejects the whole set.\n")
    a("### Interpretation limits\n")
    a("Resolution share is not SLA compliance. Average resolution time is elapsed clock time for currently resolved requests, not working hours. Twelve seeded records cannot show trends or support statistical claims.\n")
    a("### Product analytics instrumentation\n")
    a("ServiceFlow can send anonymous usage events to Mixpanel through track.js. Tracking is off unless config.js carries a project token; the source and the project package keep that value empty, and only the deployed copy sets it. Nine events are defined: request_form_opened, request_submitted, request_validation_error, owner_assigned, status_changed, request_resolved, filter_used, csv_exported and high_priority_review_clicked. Properties are limited to department, priority, category, status, previous status, the name of the field that failed validation, the filter type, hours to resolve and a record count. Titles, requester names, descriptions and owner names are never sent, autocapture is not used, and the browser's Do Not Track setting turns tracking off. Unit tests U25 and U26 and browser checks B21 and B22 verify these limits. Any event volume shown in a dashboard is synthetic demonstration data unless a real reviewer used the site, and it is not evidence of adoption.\n")
    a("### Extended sample data\n")
    a("The Requests view can load an extended sample of 60 synthetic records (the 12 seed records plus 48 generated ones). The generator is deterministic and the records pass the same validation as real input. The seed metrics above refer to the default 12 records only. Unit test U24 and browser check B23 cover the extended sample.\n")
    a("### Baseline and pilot plan (not run)\n")
    for t in FUTURE_BASELINE: a("- " + t)
    a("\n## 9. Quality assurance and validation\n")
    a("### Strategy\n")
    a("Unit tests exercise core.js. Browser checks drive the real page in Chromium. Static checks verify files, links, syntax and configuration. Manual scripts cover what a person should confirm. Results are recorded only after execution; see QA_Evidence.md.\n")
    a("### Executed results\n")
    a(md_table(["Check set","Result"],[("Unit tests (node:test)",res(u_pass,u_fail)),("Static checks",res(s_pass,s_fail)),("Browser checks (Chromium, Playwright)",res(b_pass,b_fail))]))
    a("### Manual acceptance scripts (pending a human tester)\n")
    a(md_table(["ID","Title","Steps","Expected"], MANUAL))
    a("### Traceability\n")
    a(md_table(["Req","Requirement","Backlog","Tests","Disposition"], [(r[0],r[1],r[5],r[7],r[8]) for r in REQS]))
    a("### Known gaps\n")
    a(md_table(["ID","Gap","Status"], GAPS))
    a("### Intended-use assessment and release recommendation\n")
    a("Intended use: demonstrate a request portal concept to reviewers with synthetic data. Fit for that use, subject to the gaps above. Not fit for real, personal or confidential data and not a production system. Recommendation: release as a private concept demonstration only.\n")
    a("## 10. Environments and deployment\n")
    a(md_table(["Environment","Description","Owner role"], ENVS))
    a("Configuration: vercel.json sets the output directory to dist and basic security headers. No server-side secrets. The hosted copy carries the analytics project token only in its own config.js, which is not part of the source or the project package. Source freeze: files in dist/ are hashed before deployment and compared after.\n")
    a("Deployment: upload dist/ to the Vercel project with Vercel Authentication on. Verify by comparing deployed file contents against local hashes. Rollback: redeploy the previous deployment or the last tagged source. Support ownership: the author; no on-call, no monitoring, no uptime target.\n")
    a("## 11. Handover\n")
    a("Run locally: serve dist/ with any static server, or open dist/index.html. Run tests: node --test tests/*.cjs, python3 -I tests/browser_check.py <port>. Change data model: edit core.js and its tests together, bump the storage version, and add a migration. Next steps are listed in the roadmap.\n")
    a("## 12. Tool mapping\n")
    a("See Tool_Mapping.md. Only the tools listed there as used were used.\n")
    return "\n".join(M)
w("Confluence_Handbook.md", handbook())

# ---- Tool mapping
TOOLMAP = """# Tool mapping

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
"""
w("Tool_Mapping.md", TOOLMAP)

# ---- QA evidence
def qa():
    s = ["# QA evidence\n",
         "Results below come from commands run against the final source. Raw output is in the linked files.\n",
         md_table(["Check set","Result","Raw output"],[("Unit tests (node:test)",res(u_pass,u_fail),"Unit_Test_Results.txt"),("Static checks",res(s_pass,s_fail),"Static_Checks.txt"),("Browser checks (Chromium via Playwright)",res(b_pass,b_fail),"Browser_Check_Results.txt")]),
         "## Traceability\n",
         md_table(["Req","Requirement","Tests","Disposition"],[(r[0],r[1],r[7],r[8]) for r in REQS]),
         "## Manual acceptance scripts\n\nNot executed by a human tester. Status: pending.\n",
         md_table(["ID","Title","Steps","Expected"], MANUAL),
         "## Known gaps\n", md_table(["ID","Gap","Status"], GAPS),
         "## Intended-use assessment\n\nFit for a private concept demonstration with synthetic data. Not fit for real, personal or confidential data. No accessibility conformance, privacy review or load testing was done.\n",
         "## Release recommendation\n\nRelease as a private concept demonstration only.\n"]
    return "\n".join(s)
w("QA_Evidence.md", qa())

# ---- patch app.js
ap = os.path.join(ROOT, "dist", "app.js")
src = open(ap, encoding="utf-8").read()
src = re.sub(r"/\*ROLES_START\*/.*?/\*ROLES_END\*/", lambda m: "/*ROLES_START*/" + json.dumps(ROLES, ensure_ascii=False) + "/*ROLES_END*/", src, flags=re.S)
src = re.sub(r"/\*DOWNLOADS_START\*/.*?/\*DOWNLOADS_END\*/", lambda m: "/*DOWNLOADS_START*/" + json.dumps(DOWNLOADS, ensure_ascii=False) + "/*DOWNLOADS_END*/", src, flags=re.S)
open(ap, "w", encoding="utf-8").write(src)

# ---- export JSON for docx
json.dump(dict(handbook=handbook(), have_results=have_results), open(os.path.join(ROOT,"scripts","handbook.json"),"w"))
print("built", sorted(os.listdir(OUT)))
