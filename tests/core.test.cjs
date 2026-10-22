"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const C = require("../dist/core.js");

const T0 = Date.UTC(2026, 9, 21, 12, 0, 0);
const valid = () => ({ title: "Fix the projector", requester: "Ada Test", department: "IT", priority: "Normal", category: "Other", description: "The projector in room 2 shows no signal." });
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const make = (over = {}) => C.createRequest([], Object.assign(valid(), over), T0).request;

// 1
test("01 seed records are valid, unique and match the required distribution", () => {
  const s = C.seedRequests();
  assert.equal(C.validateAll(s), "");
  assert.equal(new Set(s.map(r => r.id)).size, 12);
  const m = C.computeMetrics(s);
  assert.deepEqual([m.open, m.inProgress, m.resolved], [5, 3, 4]);
  assert.deepEqual(m.byDepartment, { IT: 5, Facilities: 4, HR: 3 });
  assert.equal(m.highActive, 2);
});
// 2
test("02 creating a request routes it, starts Open and Unassigned, and writes the first history entry", () => {
  const seeds = C.seedRequests();
  const r = C.createRequest(seeds, valid(), T0);
  assert.equal(r.ok, true);
  assert.equal(r.request.id, "SF-1013");
  assert.equal(r.request.department, "IT");
  assert.equal(r.request.status, "Open");
  assert.equal(r.request.owner, null);
  assert.equal(r.request.createdAt, new Date(T0).toISOString());
  assert.equal(r.request.resolvedAt, null);
  assert.equal(r.request.history.length, 1);
  assert.match(r.request.history[0].text, /routed to IT/);
});
// 3
test("03 text is trimmed and blank or whitespace-only required fields are rejected", () => {
  const ok = C.createRequest([], valid_with({ title: "   Fix the projector   ", requester: "  Ada  " }), T0);
  assert.equal(ok.request.title, "Fix the projector");
  assert.equal(ok.request.requester, "Ada");
  for (const f of ["title", "requester", "description"]) {
    for (const bad of ["", "     ", "\n\t "]) {
      const r = C.createRequest([], valid_with({ [f]: bad }), T0);
      assert.equal(r.ok, false, f);
      assert.ok(r.errors[f]);
    }
  }
  const missing = C.createRequest([], {}, T0);
  assert.equal(missing.ok, false);
  assert.equal(C.createRequest([], null, T0).ok, false);
  assert.equal(C.createRequest([], valid_with({ title: 12345 }), T0).ok, false);
});
function valid_with(over) { return Object.assign(valid(), over); }
// 4
test("04 description must be 10 to 2000 characters after trimming", () => {
  assert.equal(C.createRequest([], valid_with({ description: "123456789" }), T0).ok, false);
  assert.equal(C.createRequest([], valid_with({ description: "   123456789   " }), T0).ok, false);
  assert.equal(C.createRequest([], valid_with({ description: "1234567890" }), T0).ok, true);
  assert.equal(C.createRequest([], valid_with({ description: "x".repeat(2000) }), T0).ok, true);
  assert.equal(C.createRequest([], valid_with({ description: "x".repeat(2001) }), T0).ok, false);
});
// 5
test("05 invalid departments, priorities and categories are rejected", () => {
  for (const d of ["Finance", "it", "", null, undefined, 5]) assert.equal(C.createRequest([], valid_with({ department: d }), T0).ok, false, String(d));
  for (const p of ["Urgent", "high", "", null]) assert.equal(C.createRequest([], valid_with({ priority: p }), T0).ok, false, String(p));
  assert.equal(C.createRequest([], valid_with({ category: "Snacks" }), T0).ok, false);
  for (const d of C.DEPARTMENTS) assert.equal(C.createRequest([], valid_with({ department: d }), T0).ok, true);
});
// 6
test("06 an owner is required before In progress or Resolved", () => {
  const r = make();
  for (const st of ["In progress", "Resolved"]) {
    const u = C.updateRequest(r, { status: st }, T0 + 1000);
    assert.equal(u.ok, false);
    assert.match(u.errors.owner, /Assign an owner/);
  }
  const ok = C.updateRequest(r, { owner: "Marcus Webb", status: "In progress" }, T0 + 1000);
  assert.equal(ok.ok, true);
  // removing the owner of an active request is also rejected
  const rm = C.updateRequest(ok.request, { owner: "" }, T0 + 2000);
  assert.equal(rm.ok, false);
});
// 7
test("07 assignment and status transitions write dated history entries", () => {
  let r = make();
  let u = C.updateRequest(r, { owner: "Marcus Webb" }, T0 + 1000);
  assert.equal(u.changed, true);
  assert.equal(u.request.history.length, 2);
  assert.match(u.request.history[1].text, /Assigned to Marcus Webb/);
  u = C.updateRequest(u.request, { owner: "Elena Ruiz" }, T0 + 2000);
  assert.match(u.request.history[2].text, /Owner changed from Marcus Webb to Elena Ruiz/);
  u = C.updateRequest(u.request, { status: "In progress" }, T0 + 3000);
  assert.match(u.request.history[3].text, /Open to In progress/);
  assert.equal(u.request.updatedAt, new Date(T0 + 3000).toISOString());
  assert.ok(u.request.history.every(h => !isNaN(Date.parse(h.at))));
  assert.equal(r.history.length, 1, "original object is not mutated");
});
// 8
test("08 owners from another department are rejected", () => {
  const r = make({ department: "IT" });
  assert.equal(C.updateRequest(r, { owner: "Tomas Berg" }, T0).ok, false);
  assert.equal(C.updateRequest(r, { owner: "Grace Lindholm" }, T0).ok, false);
  assert.equal(C.updateRequest(r, { owner: "Nobody Real" }, T0).ok, false);
  assert.equal(C.updateRequest(make({ department: "HR" }), { owner: "Grace Lindholm" }, T0).ok, true);
  assert.equal(C.updateRequest(make({ department: "Facilities" }), { owner: "Hana Okafor" }, T0).ok, true);
});
// 9
test("09 resolving sets resolvedAt, reopening clears it, resolving again records the new time", () => {
  let r = C.updateRequest(make(), { owner: "Marcus Webb", status: "In progress" }, T0 + 1000).request;
  r = C.updateRequest(r, { status: "Resolved" }, T0 + 10000).request;
  assert.equal(r.resolvedAt, new Date(T0 + 10000).toISOString());
  const re = C.updateRequest(r, { status: "Open" }, T0 + 20000);
  assert.equal(re.request.resolvedAt, null);
  assert.match(re.request.history.at(-1).text, /Reopened/);
  const again = C.updateRequest(re.request, { status: "Resolved" }, T0 + 30000).request;
  assert.equal(again.resolvedAt, new Date(T0 + 30000).toISOString());
  const toProgress = C.updateRequest(again, { status: "In progress" }, T0 + 40000).request;
  assert.equal(toProgress.resolvedAt, null);
});
// 10
test("10 a save that changes nothing adds no history and keeps updatedAt", () => {
  const r = C.updateRequest(make(), { owner: "Marcus Webb" }, T0 + 1000).request;
  const u = C.updateRequest(r, { owner: "Marcus Webb", status: "Open" }, T0 + 99999);
  assert.equal(u.ok, true);
  assert.equal(u.changed, false);
  assert.equal(u.request, r);
  assert.equal(u.request.history.length, 2);
  const n = C.updateRequest(make(), {}, T0 + 5);
  assert.equal(n.changed, false);
});
// 11
test("11 seed metrics reconcile: 8 active, 33.3 percent resolved, 20.25 hour average", () => {
  const m = C.computeMetrics(C.seedRequests());
  assert.equal(m.total, 12);
  assert.equal(m.active, 8);
  near(m.resolutionSharePct, 100 / 3, 1e-9);
  near(m.resolutionSharePct, 33.3, 0.05);
  near(m.avgResolutionHours, 20.25, 1e-9);
  assert.equal(m.resolvedCountForAverage, 4);
  const hours = C.seedRequests().filter(r => r.status === "Resolved").map(C.resolutionHours).sort((a, b) => a - b);
  assert.deepEqual(hours, [16, 20, 20, 25]);
  assert.equal(hours.reduce((a, b) => a + b, 0), 81);
});
// 12
test("12 an empty dataset gives zeros and no invalid numbers", () => {
  const m = C.computeMetrics([]);
  assert.equal(m.total, 0);
  assert.equal(m.active, 0);
  assert.equal(m.resolutionSharePct, 0);
  assert.equal(m.avgResolutionHours, null);
  assert.ok(Number.isFinite(m.resolutionSharePct));
  assert.deepEqual(m.byDepartment, { IT: 0, Facilities: 0, HR: 0 });
  assert.equal(C.filterRequests([], { query: "x" }).length, 0);
  assert.equal(C.toCsv([]).trim().split("\r\n").length, 1);
});
// 13
test("13 search combines with department, status and priority filters", () => {
  const s = C.seedRequests();
  assert.equal(C.filterRequests(s, {}).length, 12);
  assert.equal(C.filterRequests(s, { department: "IT" }).length, 5);
  assert.equal(C.filterRequests(s, { department: "IT", status: "Resolved" }).length, 2);
  assert.equal(C.filterRequests(s, { department: "IT", status: "Resolved", priority: "High" }).length, 0);
  assert.equal(C.filterRequests(s, { query: "sf-1005" }).length, 1);
  assert.equal(C.filterRequests(s, { query: "ELENA" }).length, 2);      // owner search, case-insensitive
  assert.equal(C.filterRequests(s, { query: "Maya" }).length, 1);       // requester
  assert.equal(C.filterRequests(s, { query: "glare" }).length, 1);      // title and description
  assert.equal(C.filterRequests(s, { query: "wi-fi", department: "IT" }).length, 1);
  assert.equal(C.filterRequests(s, { query: "wi-fi", department: "HR" }).length, 0);
  assert.equal(C.filterRequests(s, { query: "  maya  " }).length, 1);
  assert.equal(C.filterRequests(s, { department: "All", status: "All", priority: "All" }).length, 12);
});
// 14
test("14 Active means Open plus In progress and the high-priority action excludes Resolved", () => {
  const s = C.seedRequests();
  assert.equal(C.filterRequests(s, { status: "Active" }).length, 8);
  const hp = C.highPriorityActive(s);
  assert.deepEqual(hp.map(r => r.id).sort(), ["SF-1005", "SF-1010"]);
  assert.ok(hp.every(r => r.status !== "Resolved" && r.priority === "High"));
  const resolvedHigh = C.updateRequest(hp[0], { status: "Resolved" }, T0).request;
  assert.equal(C.highPriorityActive([resolvedHigh, hp[1]]).length, 1);
});
// 15
test("15 CSV escapes quotes, commas and line breaks and neutralizes formula characters", () => {
  const r = make({ title: '=HYPERLINK("http://x","go")', requester: "+Eve", description: 'Line one, "quoted"\nline two with @mention' });
  const csv = C.toCsv([r]);
  assert.ok(csv.includes(`"'=HYPERLINK(""http://x"",""go"")"`));
  assert.ok(csv.includes("'+Eve"));
  assert.ok(csv.includes('"Line one, ""quoted""\nline two with @mention"'));
  assert.equal(C.csvCell("-1+1"), "'-1+1");
  assert.equal(C.csvCell("@x"), "'@x");
  assert.equal(C.csvCell("\tx"), "'\tx");
  assert.equal(C.csvCell("plain"), "plain");
  assert.equal(C.csvCell(null), "");
  const lines = C.toCsv(C.seedRequests()).trim().split("\r\n");
  assert.equal(lines[0], C.CSV_COLUMNS.join(","));
  assert.equal(lines.length, 13);
  assert.ok(C.toCsv(C.seedRequests()).includes("Unassigned"));
});
// 16
test("16 JSON round trip returns identical records", () => {
  const s = C.seedRequests();
  const back = C.parseSaved(C.serialize(s));
  assert.equal(back.ok, true);
  assert.deepEqual(back.requests, s);
  let r = C.updateRequest(make(), { owner: "Marcus Webb", status: "In progress" }, T0 + 1000).request;
  assert.deepEqual(C.parseSaved(C.serialize([r])).requests, [r]);
});
// 17
test("17 malformed saved data is rejected", () => {
  const s = C.seedRequests();
  const bad = (mut) => { const c = JSON.parse(JSON.stringify(s)); mut(c); return C.parseSaved(JSON.stringify({ version: 1, requests: c })); };
  assert.equal(C.parseSaved("not json").ok, false);
  assert.equal(C.parseSaved("null").ok, false);
  assert.equal(C.parseSaved(JSON.stringify({ version: 99, requests: s })).ok, false);
  assert.equal(C.parseSaved(JSON.stringify({ version: 1, requests: "x" })).ok, false);
  assert.equal(bad(c => { c[0].status = "Done"; }).ok, false);
  assert.equal(bad(c => { c[0].department = "Legal"; }).ok, false);
  assert.equal(bad(c => { c[0].owner = "Tomas Berg"; }).ok, false);
  assert.equal(bad(c => { c[0].createdAt = "yesterday"; }).ok, false);
  assert.equal(bad(c => { c[0].history = []; }).ok, false);
  assert.equal(bad(c => { c[0].resolvedAt = null; }).ok, false);
  assert.equal(bad(c => { c[7].resolvedAt = c[7].createdAt; }).ok, false);
  assert.equal(bad(c => { c[1].id = c[0].id; }).ok, false);
  assert.equal(bad(c => { c[0].title = "  padded  "; }).ok, false);
  assert.equal(bad(c => { c[0].title = "ab"; }).ok, false);
  assert.equal(bad(c => { c[8].status = "In progress"; c[8].owner = null; }).ok, false);
  assert.equal(bad(c => { c.push(42); }).ok, false);
  assert.equal(bad(c => {}).ok, true);
});
// 18
test("18 sequential creation yields unique increasing identifiers", () => {
  let list = C.seedRequests();
  const ids = new Set(list.map(r => r.id));
  for (let i = 0; i < 25; i++) {
    const r = C.createRequest(list, valid(), T0 + i).request;
    assert.ok(!ids.has(r.id), r.id);
    ids.add(r.id);
    list = [r, ...list];
  }
  assert.equal(list[0].id, "SF-1037");
  assert.equal(C.nextId([]), "SF-1001");
  assert.equal(C.nextId([{ id: "junk" }, { id: "SF-2000" }]), "SF-2001");
});
// 19
test("19 field-length boundaries accept the limits and reject one beyond", () => {
  const ok = (f, n) => C.createRequest([], valid_with({ [f]: "x".repeat(n) }), T0).ok;
  assert.equal(ok("title", 4), false);
  assert.equal(ok("title", 5), true);
  assert.equal(ok("title", 100), true);
  assert.equal(ok("title", 101), false);
  assert.equal(ok("requester", 1), true);
  assert.equal(ok("requester", 60), true);
  assert.equal(ok("requester", 61), false);
  assert.equal(ok("description", 9), false);
  assert.equal(ok("description", 10), true);
  assert.equal(ok("description", 2000), true);
  assert.equal(ok("description", 2001), false);
  assert.equal(C.createRequest([], valid_with({ title: " " + "x".repeat(100) + " " }), T0).ok, true, "trimmed length counts");
});
// 20
test("20 invalid statuses are rejected without changing the record", () => {
  const r = C.updateRequest(make(), { owner: "Marcus Webb" }, T0 + 1).request;
  for (const st of ["Done", "open", "", null, undefined, 3, "Closed"]) {
    const u = C.updateRequest(r, { status: st }, T0 + 2);
    assert.equal(u.ok, false, String(st));
    assert.ok(u.errors.status);
    assert.equal(u.request, r);
  }
});
// extras
test("21 department workload summary is consistent with the directory data", () => {
  const s = C.seedRequests();
  const m = C.computeMetrics(s);
  const sumActive = Object.values(m.workload).reduce((a, w) => a + w.active, 0);
  assert.equal(sumActive, m.active);
  assert.equal(m.workload.IT.unassignedActive, 1);
  assert.equal(m.workload.Facilities.unassignedActive, 2);
  assert.equal(m.workload.HR.unassignedActive, 1);
  assert.equal(C.filterRequests(s, { department: "IT", status: "Active" }).length, m.workload.IT.active);
});
test("22 resolved time is never earlier than creation even if the clock moves backwards", () => {
  const r = C.updateRequest(make(), { owner: "Marcus Webb", status: "In progress" }, T0 + 1000).request;
  const u = C.updateRequest(r, { status: "Resolved" }, T0 - 5 * 3600000).request;
  assert.ok(Date.parse(u.resolvedAt) >= Date.parse(u.createdAt));
  assert.equal(C.validateRecord(u), "");
});
test("23 resolved-request average ignores unresolved records and uses the stored timestamps", () => {
  const a = C.updateRequest(C.updateRequest(make(), { owner: "Marcus Webb", status: "In progress" }, T0 + 1).request, { status: "Resolved" }, T0 + 4 * 3600000).request;
  const b = make();
  const m = C.computeMetrics([a, b]);
  near(m.avgResolutionHours, 4 - 0, 0.001);
  near(m.resolutionSharePct, 50);
});

test("U24 extended demo sample has 60 valid records with unique ids", () => {
  const C = require("../dist/core.js");
  const list = C.extendedDemoRequests();
  assert.equal(list.length, 60);
  assert.equal(C.validateAll(list), "");
  assert.equal(new Set(list.map(r => r.id)).size, 60);
  assert.deepEqual(C.extendedDemoRequests(), list); // deterministic
  assert.deepEqual(list.slice(0, 12), C.seedRequests());
  const m = C.computeMetrics(list);
  assert.equal(m.total, 60);
  assert.equal(m.open + m.inProgress + m.resolved, 60);
});

test("U25 tracking sanitizer allows only known events and categorical properties", () => {
  const T = require("../dist/track.js");
  assert.equal(T.sanitize("not_an_event", {}), null);
  const r = T.sanitize("request_submitted", { department: "IT", priority: "High", category: "Other", title: "secret", requester: "Ada", description: "x", owner: "Marcus Webb" });
  assert.deepEqual(r.props, { department: "IT", priority: "High", category: "Other" });
  assert.deepEqual(T.sanitize("filter_used", { filter_type: "free text here" }).props, {});
  assert.deepEqual(T.sanitize("request_resolved", { hours_to_resolve: 20.26, department: "HR" }).props, { department: "HR", hours_to_resolve: 20.3 });
});

test("U26 tracking does nothing without a configured token", () => {
  const T = require("../dist/track.js");
  assert.equal(T.track("request_submitted", { department: "IT" }), false);
});
