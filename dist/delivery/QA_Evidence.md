# QA evidence

Results below come from commands run against the final source. Raw output is in the linked files.

| Check set | Result | Raw output |
|---|---|---|
| Unit tests (node:test) | 26 passed, 0 failed | Unit_Test_Results.txt |
| Static checks | 14 passed, 0 failed | Static_Checks.txt |
| Browser checks (Chromium via Playwright) | 23 passed, 0 failed | Browser_Check_Results.txt |

## Traceability

| Req | Requirement | Tests | Disposition |
|---|---|---|---|
| R01 | Structured submission | U03, U04, U05, U19; B03 | Verified (automated) |
| R02 | Routing | U01, U02, U18; B02 | Verified (automated) |
| R03 | Ownership and lifecycle | U06, U07, U08, U09, U20; B04, B05 | Verified (automated) |
| R04 | History and timestamps | U07, U09, U10, U22; B04, B05, B06 | Verified (automated) |
| R05 | Search and filtering | U13, U14; B07, B08 | Verified (automated) |
| R06 | Metrics | U11, U12, U21, U23; B01, B09 | Verified (automated) |
| R07 | Local persistence | U16, U17; B02, B11, B14, B15 | Verified (automated); real quota exhaustion not tested |
| R08 | Export | U15; B10 | Verified (automated) |
| R09 | Interface | B03, B12, B13, B19, B20; manual M08, M09 | Partly verified: automated checks only, no conformance audit, Chromium only |
| R10 | Delivery evidence | S01 to S10 static checks; B17 | Verified (static checks and file review) |

## Manual acceptance scripts

Not executed by a human tester. Status: pending.

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

## Known gaps

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

## Intended-use assessment

Fit for a private concept demonstration with synthetic data. Not fit for real, personal or confidential data. No accessibility conformance, privacy review or load testing was done.

## Release recommendation

Release as a private concept demonstration only.
