/* ServiceFlow core logic. No DOM access. Works in Node (CommonJS) and in the browser (window.ServiceFlowCore). */
(function (root) {
  "use strict";

  var DEPARTMENTS = ["IT", "Facilities", "HR"];
  var STATUSES = ["Open", "In progress", "Resolved"];
  var PRIORITIES = ["High", "Normal", "Low"];
  var CATEGORIES = ["Access and equipment", "Workspace", "People support", "Other"];
  // Fictional department owners (coordinators). Owners must belong to the request's department.
  var OWNERS = {
    IT: ["Marcus Webb", "Elena Ruiz"],
    Facilities: ["Tomas Berg", "Hana Okafor"],
    HR: ["Grace Lindholm", "Dev Anand"]
  };
  var LIMITS = {
    title: [5, 100],
    requester: [1, 60],
    description: [10, 2000]
  };
  var STORAGE_VERSION = 1;
  var HOUR = 3600000;

  function isStr(v) { return typeof v === "string"; }
  function trim(v) { return isStr(v) ? v.trim() : ""; }
  function inList(list, v) { return list.indexOf(v) !== -1; }
  function iso(ms) { return new Date(ms).toISOString(); }
  function isIso(v) {
    if (!isStr(v)) return false;
    var t = Date.parse(v);
    return !isNaN(t) && new Date(t).toISOString() === v;
  }

  /* ---------- Validation (R01) ---------- */
  function validateNewRequest(input) {
    var errors = {};
    var src = input && typeof input === "object" ? input : {};
    var value = {
      title: trim(src.title),
      requester: trim(src.requester),
      department: src.department,
      priority: src.priority,
      category: src.category,
      description: trim(src.description)
    };
    function range(field, label) {
      var len = value[field].length, lim = LIMITS[field];
      if (!isStr(src[field]) || len === 0) errors[field] = label + " is required.";
      else if (len < lim[0] || len > lim[1]) errors[field] = label + " must be " + lim[0] + " to " + lim[1] + " characters.";
    }
    range("title", "Title");
    range("requester", "Requester name");
    range("description", "Description");
    if (!inList(DEPARTMENTS, value.department)) errors.department = "Choose IT, Facilities or HR.";
    if (!inList(PRIORITIES, value.priority)) errors.priority = "Choose High, Normal or Low.";
    if (!inList(CATEGORIES, value.category)) errors.category = "Choose a category from the list.";
    return { ok: Object.keys(errors).length === 0, errors: errors, value: value };
  }

  /* ---------- Identifiers (R02) ---------- */
  function nextId(requests) {
    var max = 1000;
    (requests || []).forEach(function (r) {
      var m = /^SF-(\d+)$/.exec(r && r.id);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return "SF-" + (max + 1);
  }

  function createRequest(requests, input, now) {
    var v = validateNewRequest(input);
    if (!v.ok) return { ok: false, errors: v.errors };
    var at = iso(now);
    var req = {
      id: nextId(requests),
      title: v.value.title,
      requester: v.value.requester,
      department: v.value.department,
      category: v.value.category,
      priority: v.value.priority,
      owner: null,
      status: "Open",
      description: v.value.description,
      createdAt: at,
      updatedAt: at,
      resolvedAt: null,
      history: [{ at: at, text: "Request created and routed to " + v.value.department + ". Status Open, owner Unassigned." }]
    };
    return { ok: true, request: req };
  }

  /* ---------- Ownership and lifecycle (R03, R04) ---------- */
  function ownerLabel(o) { return o ? o : "Unassigned"; }

  function updateRequest(req, changes, now) {
    var errors = {};
    var ch = changes && typeof changes === "object" ? changes : {};
    var newOwner = Object.prototype.hasOwnProperty.call(ch, "owner") ? (ch.owner === "" ? null : ch.owner) : req.owner;
    var newStatus = Object.prototype.hasOwnProperty.call(ch, "status") ? ch.status : req.status;

    if (!inList(STATUSES, newStatus)) errors.status = "Status must be Open, In progress or Resolved.";
    if (newOwner !== null && !(isStr(newOwner) && inList(OWNERS[req.department] || [], newOwner))) {
      errors.owner = "Owner must belong to the " + req.department + " department.";
    }
    if (!errors.status && !errors.owner && newOwner === null && newStatus !== "Open") {
      errors.owner = "Assign an owner before setting the status to " + newStatus + ".";
    }
    if (Object.keys(errors).length) return { ok: false, errors: errors, request: req, changed: false };

    var ownerChanged = newOwner !== req.owner;
    var statusChanged = newStatus !== req.status;
    if (!ownerChanged && !statusChanged) return { ok: true, request: req, changed: false };

    var nowMs = Math.max(now, Date.parse(req.createdAt));
    var at = iso(nowMs);
    var out = JSON.parse(JSON.stringify(req));
    if (ownerChanged) {
      out.owner = newOwner;
      out.history.push({
        at: at,
        text: req.owner === null ? "Assigned to " + newOwner + "." :
          newOwner === null ? "Owner removed (was " + req.owner + ")." :
          "Owner changed from " + req.owner + " to " + newOwner + "."
      });
    }
    if (statusChanged) {
      var reopen = req.status === "Resolved";
      out.status = newStatus;
      if (newStatus === "Resolved") out.resolvedAt = at;
      else if (reopen) out.resolvedAt = null;
      out.history.push({
        at: at,
        text: newStatus === "Resolved" ? "Status changed from " + req.status + " to Resolved." :
          reopen ? "Reopened: status changed from Resolved to " + newStatus + "." :
          "Status changed from " + req.status + " to " + newStatus + "."
      });
    }
    out.updatedAt = at;
    return { ok: true, request: out, changed: true };
  }

  /* ---------- Search and filters (R05) ---------- */
  function filterRequests(requests, f) {
    var q = trim(f && f.query).toLowerCase();
    var dep = f && f.department, st = f && f.status, pr = f && f.priority;
    return requests.filter(function (r) {
      if (dep && dep !== "All" && r.department !== dep) return false;
      if (st && st !== "All") {
        if (st === "Active") { if (r.status === "Resolved") return false; }
        else if (r.status !== st) return false;
      }
      if (pr && pr !== "All" && r.priority !== pr) return false;
      if (q) {
        var hay = [r.id, r.title, r.requester, r.description, r.owner || ""].join("\n").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function highPriorityActive(requests) {
    return requests.filter(function (r) { return r.priority === "High" && r.status !== "Resolved"; });
  }

  /* ---------- Metrics (R06) ---------- */
  function resolutionHours(r) {
    if (r.status !== "Resolved" || !r.resolvedAt) return null;
    return (Date.parse(r.resolvedAt) - Date.parse(r.createdAt)) / HOUR;
  }

  function computeMetrics(requests) {
    var m = {
      total: requests.length, open: 0, inProgress: 0, resolved: 0, active: 0, highActive: 0,
      resolutionSharePct: 0, avgResolutionHours: null, resolvedCountForAverage: 0,
      byDepartment: {}, byStatus: { "Open": 0, "In progress": 0, "Resolved": 0 }, workload: {}
    };
    DEPARTMENTS.forEach(function (d) {
      m.byDepartment[d] = 0;
      m.workload[d] = { total: 0, active: 0, unassignedActive: 0, highActive: 0 };
    });
    var sum = 0;
    requests.forEach(function (r) {
      m.byStatus[r.status] += 1;
      m.byDepartment[r.department] += 1;
      var w = m.workload[r.department];
      w.total += 1;
      if (r.status === "Open") m.open += 1;
      if (r.status === "In progress") m.inProgress += 1;
      if (r.status === "Resolved") m.resolved += 1;
      if (r.status !== "Resolved") {
        m.active += 1; w.active += 1;
        if (!r.owner) w.unassignedActive += 1;
        if (r.priority === "High") { m.highActive += 1; w.highActive += 1; }
      }
      var h = resolutionHours(r);
      if (h !== null) { sum += h; m.resolvedCountForAverage += 1; }
    });
    if (m.total > 0) m.resolutionSharePct = m.resolved / m.total * 100;
    if (m.resolvedCountForAverage > 0) m.avgResolutionHours = sum / m.resolvedCountForAverage;
    return m;
  }

  /* ---------- CSV (R08) ---------- */
  var CSV_COLUMNS = ["id", "title", "requester", "department", "category", "priority", "owner", "status",
    "description", "createdAt", "updatedAt", "resolvedAt", "history"];

  function neutralize(s) {
    // Prefix risky leading characters so spreadsheets read the cell as text.
    return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  }
  function csvCell(v) {
    var s = v === null || v === undefined ? "" : String(v);
    s = neutralize(s);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCsv(requests) {
    var lines = [CSV_COLUMNS.join(",")];
    requests.forEach(function (r) {
      var row = CSV_COLUMNS.map(function (c) {
        if (c === "owner") return csvCell(ownerLabel(r.owner));
        if (c === "history") return csvCell(r.history.map(function (h) { return h.at + " " + h.text; }).join(" | "));
        return csvCell(r[c]);
      });
      lines.push(row.join(","));
    });
    return lines.join("\r\n") + "\r\n";
  }

  /* ---------- Persistence helpers (R07) ---------- */
  function validateRecord(r) {
    if (!r || typeof r !== "object" || Array.isArray(r)) return "Record is not an object.";
    if (!isStr(r.id) || !/^SF-\d+$/.test(r.id)) return "Bad id.";
    var v = validateNewRequest(r);
    if (!v.ok) return "Invalid field: " + Object.keys(v.errors)[0] + ".";
    if (r.title !== v.value.title || r.requester !== v.value.requester || r.description !== v.value.description) return "Untrimmed text.";
    if (!inList(STATUSES, r.status)) return "Bad status.";
    if (r.owner !== null && !(isStr(r.owner) && inList(OWNERS[r.department], r.owner))) return "Bad owner.";
    if (r.owner === null && r.status !== "Open") return "Status needs an owner.";
    if (!isIso(r.createdAt) || !isIso(r.updatedAt)) return "Bad timestamp.";
    if (r.resolvedAt !== null && !isIso(r.resolvedAt)) return "Bad resolvedAt.";
    if (r.status === "Resolved" && r.resolvedAt === null) return "Resolved without resolvedAt.";
    if (r.status !== "Resolved" && r.resolvedAt !== null) return "resolvedAt set on unresolved request.";
    if (r.resolvedAt !== null && Date.parse(r.resolvedAt) < Date.parse(r.createdAt)) return "Resolved before created.";
    if (!Array.isArray(r.history) || r.history.length === 0) return "Missing history.";
    for (var i = 0; i < r.history.length; i++) {
      var h = r.history[i];
      if (!h || !isIso(h.at) || !isStr(h.text) || !h.text) return "Bad history entry.";
    }
    return "";
  }

  function validateAll(list) {
    if (!Array.isArray(list)) return "Saved data is not a list.";
    var seen = {};
    for (var i = 0; i < list.length; i++) {
      var why = validateRecord(list[i]);
      if (why) return "Record " + (i + 1) + ": " + why;
      if (seen[list[i].id]) return "Duplicate id " + list[i].id + ".";
      seen[list[i].id] = true;
    }
    return "";
  }

  function serialize(requests) {
    return JSON.stringify({ version: STORAGE_VERSION, requests: requests });
  }

  function parseSaved(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, error: "Saved data is not valid JSON." }; }
    if (!data || typeof data !== "object" || data.version !== STORAGE_VERSION) return { ok: false, error: "Saved data has an unknown format." };
    var why = validateAll(data.requests);
    if (why) return { ok: false, error: why };
    return { ok: true, requests: data.requests };
  }

  /* ---------- Demonstration data ---------- */
  // Fictional records for Northstar Studio. Not real company data.
  var SEED_BASE = Date.UTC(2026, 9, 12, 9, 0, 0); // 2026-10-12 09:00 UTC
  var SEED_SPECS = [
    // id, dayOffset, hour, title, requester, dept, category, priority, owner, status, resolveHours, description
    [1001, 0, 0, "Replace failing laptop charger", "Maya Ortiz", "IT", "Access and equipment", "Normal", "Marcus Webb", "Resolved", 20, "My laptop charger stopped working and the battery drains within an hour. I need a replacement 65W USB-C charger."],
    [1002, 0, 3, "Move desk away from the window glare", "Jonas Keller", "Facilities", "Workspace", "Low", "Tomas Berg", "Resolved", 25, "Afternoon glare makes my monitor hard to read. Could my desk move two rows back, away from the west window?"],
    [1003, 1, 0, "Question about parental leave paperwork", "Priya Raman", "HR", "People support", "Normal", "Grace Lindholm", "Resolved", 16, "I need to know which forms to complete before my leave starts next month and who receives them."],
    [1004, 1, 2, "Request access to the shared design drive", "Leo Fischer", "IT", "Access and equipment", "Normal", "Elena Ruiz", "Resolved", 20, "I joined the brand team last week and cannot open the shared design drive. Please add my account."],
    [1005, 5, 0, "Conference room display will not connect", "Amara Osei", "IT", "Access and equipment", "High", "Elena Ruiz", "In progress", null, "The display in the Harbor room does not detect laptops. We have a client presentation on Thursday morning."],
    [1006, 6, 1, "Replace broken chair on the second floor", "Sofia Lindgren", "Facilities", "Workspace", "Normal", "Hana Okafor", "In progress", null, "The chair at desk 2-14 no longer holds its height and leans back on its own."],
    [1007, 6, 4, "Update emergency contact details", "Ben Hartley", "HR", "People support", "Normal", "Dev Anand", "In progress", null, "My emergency contact has changed. Please tell me how to update the record."],
    [1008, 7, 0, "Install design software on a new machine", "Noor Haddad", "IT", "Access and equipment", "Normal", null, "Open", null, "My new workstation needs the design suite and the font library installed before Monday."],
    [1009, 7, 3, "Guest Wi-Fi password is not working", "Chen Wei", "IT", "Other", "Low", "Marcus Webb", "Open", null, "Visitors report that the guest Wi-Fi password printed at reception is rejected."],
    [1010, 8, 1, "Water leak near the kitchen sink", "Ruth Abebe", "Facilities", "Workspace", "High", null, "Open", null, "Water is pooling under the kitchen sink cabinet. The floor is wet and could be slippery."],
    [1011, 8, 5, "Adjust thermostat in the east studio", "Omar Siddiqui", "Facilities", "Workspace", "Low", null, "Open", null, "The east studio is noticeably colder than the rest of the floor in the mornings."],
    [1012, 9, 0, "Ask about the learning budget", "Lena Novak", "HR", "People support", "Normal", null, "Open", null, "Does the yearly learning budget cover an online course, and how do I submit a receipt?"]
  ];

  function seedRequests() {
    return SEED_SPECS.map(function (s) {
      var created = SEED_BASE + s[1] * 24 * HOUR + s[2] * HOUR;
      var hist = [{ at: iso(created), text: "Request created and routed to " + s[5] + ". Status Open, owner Unassigned." }];
      var last = created, resolvedAt = null;
      if (s[8]) { last = created + 1 * HOUR; hist.push({ at: iso(last), text: "Assigned to " + s[8] + "." }); }
      if (s[9] === "In progress" || s[9] === "Resolved") {
        last = created + 3 * HOUR;
        hist.push({ at: iso(last), text: "Status changed from Open to In progress." });
      }
      if (s[9] === "Resolved") {
        resolvedAt = iso(created + s[10] * HOUR);
        last = created + s[10] * HOUR;
        hist.push({ at: resolvedAt, text: "Status changed from In progress to Resolved." });
      }
      return {
        id: "SF-" + s[0], title: s[3], requester: s[4], department: s[5], category: s[6], priority: s[7],
        owner: s[8], status: s[9], description: s[11], createdAt: iso(created), updatedAt: iso(last),
        resolvedAt: resolvedAt, history: hist
      };
    });
  }

  /* Extended synthetic sample: the 12 seed records plus 48 generated ones (60 total). Deterministic, fictional. */
  var EXT_TITLES = {
    IT: ["Reset forgotten password", "Laptop running slowly", "VPN will not connect", "Request second monitor", "Printer offline on floor 3", "Email calendar not syncing", "Request software license", "Replace damaged keyboard"],
    Facilities: ["Light flickering in hallway", "Request standing desk", "Meeting room too warm", "Door badge reader failing", "Restock kitchen supplies", "Broken blinds in west studio", "Parking permit question", "Spill needs cleaning"],
    HR: ["Question about payslip date", "Request employment letter", "Update home address", "Ask about remote work policy", "Training enrollment help", "Benefits enrollment question", "Onboarding checklist missing", "Vacation balance question"]
  };
  var EXT_NAMES = ["Alex Moreno", "Bianca Rossi", "Carlos Mendes", "Dana Whitfield", "Emil Svensson", "Farah Khan", "Gabe Thompson", "Hiro Tanaka", "Ines Duarte", "Jamal Carter", "Kira Petrov", "Liam O'Brien"];
  var EXT_CAT = { IT: "Access and equipment", Facilities: "Workspace", HR: "People support" };
  function extendedDemoRequests() {
    var out = seedRequests();
    var s = 20261022; // fixed seed
    function rnd() { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }
    for (var i = 0; i < 48; i++) {
      var dep = DEPARTMENTS[i % 3];
      var created = SEED_BASE + (10 + Math.floor(i * 0.9)) * 24 * HOUR + Math.floor(rnd() * 9) * HOUR;
      var pr = rnd() < 0.2 ? "High" : (rnd() < 0.7 ? "Normal" : "Low");
      var roll = rnd();
      var st = roll < 0.3 ? "Open" : roll < 0.55 ? "In progress" : "Resolved";
      var owner = st === "Open" && rnd() < 0.6 ? null : pick(OWNERS[dep]);
      if (st !== "Open" && !owner) owner = OWNERS[dep][0];
      var title = pick(EXT_TITLES[dep]);
      var hist = [{ at: iso(created), text: "Request created and routed to " + dep + ". Status Open, owner Unassigned." }];
      var last = created, resolvedAt = null;
      if (owner) { last = created + 1 * HOUR; hist.push({ at: iso(last), text: "Assigned to " + owner + "." }); }
      if (st !== "Open") { last = created + 3 * HOUR; hist.push({ at: iso(last), text: "Status changed from Open to In progress." }); }
      if (st === "Resolved") {
        var hrs = 4 + Math.floor(rnd() * 44);
        last = created + hrs * HOUR; resolvedAt = iso(last);
        hist.push({ at: resolvedAt, text: "Status changed from In progress to Resolved." });
      }
      out.push({
        id: "SF-" + (1013 + i), title: title, requester: pick(EXT_NAMES), department: dep, category: EXT_CAT[dep],
        priority: pr, owner: owner, status: st,
        description: "Synthetic sample request: " + title.toLowerCase() + ". Generated for demonstration only.",
        createdAt: iso(created), updatedAt: iso(last), resolvedAt: resolvedAt, history: hist
      });
    }
    return out;
  }

  var api = {
    extendedDemoRequests: extendedDemoRequests,
    DEPARTMENTS: DEPARTMENTS, STATUSES: STATUSES, PRIORITIES: PRIORITIES, CATEGORIES: CATEGORIES,
    OWNERS: OWNERS, LIMITS: LIMITS, CSV_COLUMNS: CSV_COLUMNS, STORAGE_VERSION: STORAGE_VERSION,
    validateNewRequest: validateNewRequest, nextId: nextId, createRequest: createRequest,
    updateRequest: updateRequest, filterRequests: filterRequests, highPriorityActive: highPriorityActive,
    computeMetrics: computeMetrics, resolutionHours: resolutionHours, toCsv: toCsv, csvCell: csvCell,
    serialize: serialize, parseSaved: parseSaved, validateRecord: validateRecord, validateAll: validateAll,
    seedRequests: seedRequests, ownerLabel: ownerLabel
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ServiceFlowCore = api;
})(typeof window !== "undefined" ? window : this);
