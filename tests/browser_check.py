"""Browser checks for ServiceFlow using Playwright (Chromium). Run: python3 tests/browser_check.py <port>
Serves nothing itself; start a static server for dist/ first. Prints one PASS/FAIL line per check."""
import re, sys, time
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else "8123"
BASE = f"http://localhost:{PORT}/index.html"
results = []

def check(name):
    def deco(fn):
        def run(b):
            try:
                fn(b); results.append((name, True, ""))
            except Exception as e:
                results.append((name, False, (str(e).splitlines() or [repr(e)])[0][:200]))
        run.__name__ = name
        return run
    return deco

def ctx(b, w=1280, h=900, **kw):
    c = b.new_context(viewport={"width": w, "height": h}, accept_downloads=True, **kw)
    p = c.new_page()
    errors = []
    p.on("pageerror", lambda e: errors.append(str(e)))
    p.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    return c, p, errors

def open_req(p, title):
    p.get_by_role("link", name="Requests", exact=True).click()
    p.locator("#view-requests").get_by_role("button", name=re.compile(re.escape(title))).first.click()

def create(p, title="Check the badge printer", requester="Test Person", dept="IT", prio="Normal", cat="Other", desc="The badge printer in reception jams on every second card."):
    p.get_by_role("button", name="New request").first.click()
    p.fill("#title", title); p.fill("#requester", requester)
    p.select_option("#department", dept); p.select_option("#priority", prio); p.select_option("#category", cat)
    p.fill("#description", desc)
    p.get_by_role("button", name="Submit request").click()

@check("B01 Overview shows seed metrics and high-priority notice")
def b01(b):
    c, p, errs = ctx(b); p.goto(BASE)
    cards = p.locator("#view-overview .card").all_inner_texts()
    flat = " ".join(cards)
    for needle in ["12\nTotal requests", "5\nOpen", "3\nIn progress", "4\nResolved"]:
        assert needle in flat.replace("\n\n", "\n") or needle.replace("\n", " ") in re.sub(r"\s+", " ", flat), needle
    assert "2 high-priority requests are still active" in p.locator("#view-overview").inner_text()
    assert len(p.locator("#view-overview tbody tr").all()) >= 5
    assert not errs, errs; c.close()

@check("B02 Create a request, see it listed, and keep it after a refresh")
def b02(b):
    c, p, errs = ctx(b); p.goto(BASE); create(p)
    assert "Created SF-1013" in p.locator("#toast").inner_text()
    assert p.get_by_role("button", name=re.compile("Check the badge printer")).count() == 1
    p.reload(); p.get_by_role("link", name="Requests", exact=True).click()
    assert p.get_by_role("button", name=re.compile("Check the badge printer")).count() == 1
    assert "Showing 13 of 13" in p.locator("#f-count").inner_text()
    assert not errs, errs; c.close()

@check("B03 Invalid and blank fields show errors, move focus, and create nothing")
def b03(b):
    c, p, errs = ctx(b); p.goto(BASE)
    p.get_by_role("button", name="New request").first.click()
    p.fill("#title", "   "); p.fill("#requester", "   "); p.fill("#description", "short")
    p.get_by_role("button", name="Submit request").click()
    assert "Title is required" in p.locator("#title-err").inner_text()
    assert "Requester name is required" in p.locator("#requester-err").inner_text()
    assert "10 to 2000" in p.locator("#description-err").inner_text()
    assert p.locator("#department-err").inner_text() != ""
    assert p.evaluate("document.activeElement.id") == "title"
    assert p.locator("#dlg-new").evaluate("d => d.open")
    p.keyboard.press("Escape")
    p.get_by_role("link", name="Requests", exact=True).click()
    assert "Showing 12 of 12" in p.locator("#f-count").inner_text(); c.close()

@check("B04 Assignment and lifecycle: owner required, then In progress, then Resolved, with history")
def b04(b):
    c, p, errs = ctx(b); p.goto(BASE); open_req(p, "Install design software")
    p.select_option("#d-status", "In progress"); p.get_by_role("button", name="Save changes").click()
    assert "Assign an owner" in p.locator("#d-owner-err").inner_text()
    p.select_option("#d-owner", "Elena Ruiz"); p.get_by_role("button", name="Save changes").click()
    assert "Saved" in p.locator("#dlg-detail").inner_text()
    p.select_option("#d-status", "In progress"); p.get_by_role("button", name="Save changes").click()
    p.select_option("#d-status", "Resolved"); p.get_by_role("button", name="Save changes").click()
    t = p.locator("#dlg-detail").inner_text()
    assert "Assigned to Elena Ruiz" in t and "Open to In progress" in t and "In progress to Resolved" in t, t
    assert "Not resolved" not in t
    assert not errs, errs; c.close()

@check("B05 Reopening clears the resolved time and is recorded in history")
def b05(b):
    c, p, errs = ctx(b); p.goto(BASE); open_req(p, "Replace failing laptop charger")
    assert "Not resolved" not in p.locator("#dlg-detail").inner_text()
    p.select_option("#d-status", "Open"); p.get_by_role("button", name="Save changes").click()
    t = p.locator("#dlg-detail").inner_text()
    assert "Not resolved" in t and "Reopened" in t, t
    c.close()

@check("B06 A save that changes nothing says so and adds no history")
def b06(b):
    c, p, errs = ctx(b); p.goto(BASE); open_req(p, "Conference room display")
    before = p.locator(".history li").count()
    p.get_by_role("button", name="Save changes").click()
    assert "No changes to save" in p.locator("#dlg-detail").inner_text()
    assert p.locator(".history li").count() == before; c.close()

@check("B07 Search combines with filters; no-results state and Clear filters work")
def b07(b):
    c, p, errs = ctx(b); p.goto(BASE); p.get_by_role("link", name="Requests", exact=True).click()
    p.fill("#f-query", "elena"); assert "Showing 2 of 12" in p.locator("#f-count").inner_text()
    p.select_option("#f-dept", "IT"); p.select_option("#f-status", "Active"); p.select_option("#f-prio", "High")
    assert "Showing 1 of 12" in p.locator("#f-count").inner_text()
    p.fill("#f-query", "zzzz-nothing")
    assert "No requests match these filters" in p.locator("#f-table").inner_text()
    p.locator("#f-table").get_by_role("button", name="Clear filters").click()
    assert "Showing 12 of 12" in p.locator("#f-count").inner_text()
    p.select_option("#f-status", "Active"); assert "Showing 8 of 12" in p.locator("#f-count").inner_text(); c.close()

@check("B08 Review high-priority action shows only active high-priority requests")
def b08(b):
    c, p, errs = ctx(b); p.goto(BASE)
    p.get_by_role("button", name="Review high-priority requests").click()
    assert "Showing 2 of 12" in p.locator("#f-count").inner_text()
    rows = p.locator("#f-table tbody tr").all_inner_texts()
    assert all("Resolved" not in r and "High" in r for r in rows), rows; c.close()

@check("B09 Analytics shows 8 active, 2 high, 33.3 percent and 20.25 hours with definitions")
def b09(b):
    c, p, errs = ctx(b); p.goto(BASE + "#analytics")
    t = re.sub(r"\s+", " ", p.locator("#view-analytics").inner_text())
    for needle in ["8 Active requests", "2 High-priority active", "33.3% Resolution share", "20.25 h Average resolution time", "not SLA compliance"]:
        assert needle in t, needle
    assert "5 (42%)" in t and "IT" in t; c.close()

@check("B10 CSV download works, has all records, and neutralizes formula text")
def b10(b):
    c, p, errs = ctx(b); p.goto(BASE); create(p, title='=SUM(1,1) risky title')
    p.get_by_role("link", name="Requests", exact=True).click()
    with p.expect_download() as dl:
        p.get_by_role("button", name="Export CSV").click()
    d = dl.value
    assert re.match(r"serviceflow-requests-\d{4}-\d{2}-\d{2}\.csv", d.suggested_filename), d.suggested_filename
    text = open(d.path(), encoding="utf-8", newline="").read()
    lines = [l for l in text.split("\r\n") if l.startswith("SF-") or l.startswith("id,")]
    assert len(lines) == 14, len(lines)
    assert "'=SUM(1,1) risky title" in text or "\"'=SUM(1,1) risky title\"" in text
    c.close()

@check("B11 Reset asks for confirmation; cancel keeps data, confirm restores demo data")
def b11(b):
    c, p, errs = ctx(b); p.goto(BASE); create(p)
    p.get_by_role("button", name="Reset demo data").click()
    assert p.locator("#dlg-reset").evaluate("d => d.open")
    p.get_by_role("button", name="Cancel").click()
    assert "Showing 13 of 13" in p.locator("#f-count").inner_text()
    p.get_by_role("button", name="Reset demo data").click()
    p.locator("#dlg-reset").get_by_role("button", name="Reset demo data").click()
    assert "Showing 12 of 12" in p.locator("#f-count").inner_text()
    p.reload(); p.get_by_role("link", name="Requests", exact=True).click()
    assert "Showing 12 of 12" in p.locator("#f-count").inner_text(); c.close()

@check("B12 Narrow screen (375 px): no page-level horizontal scroll, nav and dialogs usable")
def b12(b):
    c, p, errs = ctx(b, 375, 760); p.goto(BASE)
    for view in ["", "#requests", "#analytics", "#case-study"]:
        p.goto(BASE + view)
        assert not p.evaluate("document.documentElement.scrollWidth > window.innerWidth"), "overflow on " + (view or "#overview") + " scrollWidth=" + str(p.evaluate("document.documentElement.scrollWidth"))
    p.goto(BASE + "#requests")
    for name in ["Overview", "Requests", "Analytics", "Delivery case study"]:
        assert p.get_by_role("link", name=name, exact=True).is_visible(), name
    p.get_by_role("button", name="New request").first.click()
    box = p.locator("#dlg-new").bounding_box()
    assert box["x"] >= 0 and box["x"] + box["width"] <= 375.5, box
    assert p.get_by_role("button", name="Submit request").is_visible()
    p.screenshot(path="/tmp/sf-narrow.png"); c.close()

@check("B13 Keyboard: open a request with Enter, focus starts in the dialog and never reaches the page behind it, Escape returns focus")
def b13(b):
    c, p, errs = ctx(b); p.goto(BASE + "#requests")
    btn = p.get_by_role("button", name=re.compile("Conference room display")).first
    btn.focus(); p.keyboard.press("Enter")
    assert p.locator("#dlg-detail").evaluate("d => d.open")
    assert p.evaluate("document.querySelector('#dlg-detail').contains(document.activeElement)")
    for _ in range(12):
        p.keyboard.press("Tab")
        assert p.evaluate("!document.querySelector('.shell').contains(document.activeElement)"), "focus reached inert page content behind the dialog"
    p.keyboard.press("Escape")
    assert not p.locator("#dlg-detail").evaluate("d => d.open")
    assert p.evaluate("document.activeElement.textContent").startswith("Conference room display"), p.evaluate("document.activeElement.outerHTML")[:80]
    p.keyboard.press("Tab")
    c.close()

@check("B14 Corrupted saved data: warning shown, demo data used, stored text untouched until a change")
def b14(b):
    c, p, errs = ctx(b)
    p.add_init_script("if(!localStorage.getItem('serviceflow.v1')) localStorage.setItem('serviceflow.v1','{not valid json')")
    p.goto(BASE)
    w = p.locator("#storage-warning")
    assert w.is_visible() and "could not be read" in w.inner_text()
    assert p.evaluate("localStorage.getItem('serviceflow.v1')") == "{not valid json"
    assert "12" in p.locator("#view-overview .card .num").first.inner_text()
    create(p)
    assert p.evaluate("JSON.parse(localStorage.getItem('serviceflow.v1')).requests.length") == 13
    assert not w.is_visible(); c.close()

@check("B15 Storage unavailable: clear warning, app still works in memory, CSV export offered")
def b15(b):
    c, p, errs = ctx(b)
    p.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}})")
    p.goto(BASE)
    w = p.locator("#storage-warning")
    assert w.is_visible() and "not available" in w.inner_text()
    assert w.get_by_role("button", name="Export CSV now").is_visible()
    create(p)
    assert "Not saved to browser storage" in p.locator("#toast").inner_text()
    assert p.get_by_role("button", name=re.compile("Check the badge printer")).count() == 1
    assert "could not be saved" in w.inner_text(); c.close()

@check("B16 User text is shown as text, not parsed as HTML")
def b16(b):
    c, p, errs = ctx(b); p.goto(BASE)
    create(p, title="<img src=x onerror=window.__x=1> title", requester="<b>Bold Name</b>", desc="<script>window.__y=1</script> plain words here")
    assert p.evaluate("window.__x === undefined && window.__y === undefined")
    assert p.locator("#f-table img").count() == 0 and p.locator("#f-table b").count() == 0
    assert "<b>Bold Name</b>" in p.locator("#f-table").inner_text(); c.close()

@check("B17 Delivery case study lists the supporting artifacts and states the limits")
def b17(b):
    c, p, errs = ctx(b); p.goto(BASE + "#case-study")
    names = p.locator(".dl-grid li strong").all_inner_texts()
    assert len(names) >= 11, len(names)
    assert p.locator(".dl-grid a").count() == 0
    t = p.locator("#view-case-study").inner_text()
    assert "fictional" in t and "No stakeholder approved" in t and "project package" in t; c.close()

@check("B18 No console or page errors during a full walk through all four views")
def b18(b):
    c, p, errs = ctx(b); p.goto(BASE)
    for v in ["#requests", "#analytics", "#case-study", "#overview"]:
        p.goto(BASE + v)
    assert not errs, errs; c.close()

@check("B19 Status colors are always accompanied by text labels")
def b19(b):
    c, p, errs = ctx(b); p.goto(BASE + "#requests")
    badges = p.locator("#f-table .badge").all_inner_texts()
    assert len(badges) == 24 and all(t.strip() in ("Open", "In progress", "Resolved", "High", "Normal", "Low") for t in badges); c.close()

@check("B20 Dark teal sidebar, main text and primary action colors match the design tokens")
def b20(b):
    c, p, errs = ctx(b); p.goto(BASE)
    side = p.evaluate("getComputedStyle(document.querySelector('.side')).backgroundColor")
    prim = p.evaluate("getComputedStyle(document.querySelector('button.primary')).backgroundColor")
    bg = p.evaluate("getComputedStyle(document.body).backgroundColor")
    assert side == "rgb(20, 39, 46)", side
    assert prim == "rgb(48, 91, 216)", prim
    assert bg == "rgb(246, 247, 249)", bg; c.close()

@check("B21 Analytics is off by default: no request leaves for Mixpanel")
def b21(b):
    c, p, errs = ctx(b); hits = []
    p.on("request", lambda r: hits.append(r.url) if "mixpanel" in r.url else None)
    p.goto(BASE); create(p); p.get_by_role("link", name="Overview", exact=True).click()
    assert hits == [], hits
    assert not errs, errs; c.close()

@check("B22 With a token set, events fire with categorical properties only and no free text")
def b22(b):
    import json
    c, p, errs = ctx(b); sent = []
    def cfg(route): route.fulfill(status=200, content_type="application/javascript", body='window.SF_CONFIG={mixpanelToken:"test-token"};')
    def mp(route):
        sent.extend(json.loads(route.request.post_data)); route.fulfill(status=200, body="1")
    p.route("**/config.js", cfg); p.route("https://api.mixpanel.com/**", mp)
    p.goto(BASE)
    p.get_by_role("link", name="Requests", exact=True).click()
    p.get_by_role("button", name="New request").first.click()
    p.get_by_role("button", name="Submit request").click()          # validation errors
    p.fill("#title", "Secret title text"); p.fill("#requester", "Private Person")
    p.select_option("#department", "IT"); p.select_option("#priority", "High"); p.select_option("#category", "Other")
    p.fill("#description", "Secret description text for the test.")
    p.get_by_role("button", name="Submit request").click()
    open_req(p, "Secret title text")
    p.select_option("#d-owner", "Marcus Webb"); p.select_option("#d-status", "In progress")
    p.get_by_role("button", name="Save changes").click()
    p.select_option("#d-status", "Resolved"); p.get_by_role("button", name="Save changes").click()
    p.get_by_role("button", name="Close").first.click()
    p.select_option("#f-dept", "IT") if p.locator("#f-dept").count() else None
    with p.expect_download(): p.get_by_role("button", name="Export CSV").click()
    p.get_by_role("link", name="Overview", exact=True).click()
    p.get_by_role("button", name="Review high-priority requests").click()
    p.wait_for_timeout(800)
    names = [e["event"] for e in sent]
    for ev in ["request_form_opened", "request_validation_error", "request_submitted", "owner_assigned", "status_changed", "request_resolved", "csv_exported", "high_priority_review_clicked"]:
        assert ev in names, (ev, names)
    blob = json.dumps(sent)
    for secret in ["Secret title", "Private Person", "Secret description", "Marcus"]:
        assert secret not in blob, secret
    assert all(e["properties"]["token"] == "test-token" for e in sent)
    assert not errs, errs; c.close()

@check("B23 Extended sample loads 60 synthetic records after confirmation")
def b23(b):
    c, p, errs = ctx(b); p.goto(BASE + "#requests")
    p.locator("#btn-extended").click(); p.get_by_role("button", name="Cancel").click()
    assert "Showing 12 of 12" in p.locator("#f-count").inner_text()
    p.locator("#btn-extended").click(); p.locator("#btn-extended-confirm").click()
    assert "Showing 60 of 60" in p.locator("#f-count").inner_text()
    assert not errs, errs; c.close()

with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium", args=["--no-sandbox"])
    for fn in [b01,b02,b03,b04,b05,b06,b07,b08,b09,b10,b11,b12,b13,b14,b15,b16,b17,b18,b19,b20,b21,b22,b23]:
        fn(b)
    b.close()
for n, ok, msg in results:
    print(("PASS " if ok else "FAIL ") + n + ("" if ok else "  -> " + msg))
print(f"\n{sum(1 for r in results if r[1])} passed, {sum(1 for r in results if not r[1])} failed, {len(results)} total")
sys.exit(0 if all(r[1] for r in results) else 1)
