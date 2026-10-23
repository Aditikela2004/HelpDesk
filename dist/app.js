/* ServiceFlow interface. Rendering, dialogs, events, localStorage and downloads. Business logic lives in core.js. */
(function () {
  "use strict";
  var C = window.ServiceFlowCore;
  var STORE_KEY = "serviceflow.v1";
  var DOWNLOADS = /*DOWNLOADS_START*/[["ServiceFlow_Master_Delivery_Plan.docx", "Master delivery plan (Word)"], ["Confluence_Handbook.md", "Product and technical handbook (Markdown)"], ["Engineering_Backlog.csv", "Engineering backlog (Jira import layout)"], ["Delivery_Tracker.csv", "Cross-functional delivery tracker (monday.com layout)"], ["Requirements_Traceability.csv", "Need to requirement to test to release disposition"], ["ServiceFlow_Wireframes.svg", "Editable SVG wireframes"], ["Sample_Requests.csv", "The 12 demonstration records as CSV"], ["Tool_Mapping.md", "Which tool holds what, and what was actually used"], ["QA_Evidence.md", "Executed test evidence, gaps and release recommendation"], ["Unit_Test_Results.txt", "Raw output of the unit tests"], ["Static_Checks.txt", "Raw output of the static checks"], ["Browser_Check_Results.txt", "Raw output of the browser checks"]]/*DOWNLOADS_END*/;

  var state = {
    requests: [],
    filters: { query: "", department: "All", status: "All", priority: "All" },
    storageOk: true,
    warning: "",
    unreadable: false
  };

  /* ---------- tiny DOM helper (uses textContent, so user text is never parsed as HTML) ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v === null || v === undefined) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }
  function $(id) { return document.getElementById(id); }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  function fmtDateTime(iso) {
    var d = new Date(iso);
    return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  function num(n, d) { return String(Number(n.toFixed(d))); }
  function badge(kind, value) { return h("span", { class: "badge " + kind + "-" + value.replace(/ /g, "-"), text: value }); }
  function statusBadge(s) { return badge("b", s); }
  function prioBadge(p) { return badge("p", p); }

  /* ---------- storage (R07) ---------- */
  function showWarning(text, withExport) {
    var box = $("storage-warning");
    clear(box);
    if (!text) { box.hidden = true; return; }
    box.appendChild(document.createTextNode(text));
    if (withExport) box.appendChild(h("button", { type: "button", text: "Export CSV now", onclick: exportCsv }));
    box.hidden = false;
  }
  function persist() {
    try {
      window.localStorage.setItem(STORE_KEY, C.serialize(state.requests));
      state.unreadable = false;
      if (state.storageOk) { state.warning = ""; showWarning(""); }
      return true;
    } catch (e) {
      state.storageOk = false;
      state.warning = "Changes could not be saved to this browser. They stay in this tab only until you close or refresh it. Export a CSV to keep a copy.";
      showWarning(state.warning, true);
      return false;
    }
  }
  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(STORE_KEY); }
    catch (e) {
      state.storageOk = false;
      state.requests = C.seedRequests();
      showWarning("Browser storage is not available here, so nothing will be saved between visits. You can still use ServiceFlow in this tab and export a CSV to keep a copy.", true);
      return;
    }
    if (raw === null) {
      state.requests = C.seedRequests();
      persist();
      return;
    }
    var parsed = C.parseSaved(raw);
    if (parsed.ok) { state.requests = parsed.requests; return; }
    state.unreadable = true;
    state.requests = C.seedRequests();
    showWarning("The saved data in this browser could not be read (" + parsed.error + ") so demonstration data is shown instead. The unreadable data is left untouched until you make a change or reset, which will replace it.", false);
  }

  /* ---------- routing ---------- */
  var VIEWS = { overview: "Overview", requests: "Requests", analytics: "Analytics", "case-study": "Delivery case study" };
  var renderers = {};
  function currentView() {
    var v = (location.hash || "").replace("#", "");
    return VIEWS[v] ? v : "overview";
  }
  function show(view, moveFocus) {
    Object.keys(VIEWS).forEach(function (k) { $("view-" + k).hidden = k !== view; });
    document.querySelectorAll("nav a[data-view]").forEach(function (a) {
      if (a.dataset.view === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.title = VIEWS[view] + " | ServiceFlow (portfolio prototype)";
    renderers[view]();
    $("loading").hidden = true;
    if (moveFocus) {
      var hd = $("view-" + view).querySelector("h1");
      if (hd) { hd.setAttribute("tabindex", "-1"); hd.focus(); }
    }
  }
  function go(view) {
    if (location.hash === "#" + view) show(view, true); else location.hash = "#" + view;
  }
  function refresh() { show(currentView(), false); }

  var toastTimer;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 3500);
  }

  /* ---------- tables ---------- */
  function requestTable(list, emptyNode) {
    if (!list.length) return emptyNode;
    var head = h("tr", null, ["Request", "Requester", "Department", "Status", "Priority", "Owner", "Created"].map(function (t) { return h("th", { scope: "col", text: t }); }));
    var body = list.map(function (r) {
      var btn = h("button", { type: "button", class: "link", text: r.title, "aria-label": "Open " + r.id + ": " + r.title });
      btn.addEventListener("click", function () { openDetail(r.id, btn); });
      return h("tr", null, [
        h("td", null, [btn, h("div", { class: "id", text: r.id })]),
        h("td", { text: r.requester }), h("td", { text: r.department }),
        h("td", null, [statusBadge(r.status)]), h("td", null, [prioBadge(r.priority)]),
        h("td", { text: C.ownerLabel(r.owner) }), h("td", { text: fmtDate(r.createdAt) })
      ]);
    });
    return h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Requests table, scrollable" }, [
      h("table", null, [h("thead", null, [head]), h("tbody", null, body)])
    ]);
  }

  /* ---------- Overview ---------- */
  renderers.overview = function () {
    var root = $("view-overview"); clear(root);
    var m = C.computeMetrics(state.requests);
    var recent = state.requests.slice().sort(function (a, b) { return Date.parse(b.createdAt) - Date.parse(a.createdAt); }).slice(0, 5);
    root.appendChild(h("div", { class: "page-head" }, [
      h("div", null, [h("h1", { id: "h-overview", text: "Overview" }), h("p", { class: "muted", text: "Current requests for Northstar Studio, calculated from the saved records." })]),
      h("div", { class: "actions" }, [h("button", { type: "button", class: "primary", text: "New request", onclick: function (e) { openNew(e.currentTarget); } })])
    ]));
    root.appendChild(h("div", { class: "cards" }, [
      card(m.total, "Total requests"), card(m.open, "Open"), card(m.inProgress, "In progress"), card(m.resolved, "Resolved")
    ]));
    if (m.highActive > 0) {
      root.appendChild(h("div", { class: "notice alert", role: "status" }, [
        h("strong", { text: m.highActive + (m.highActive === 1 ? " high-priority request is" : " high-priority requests are") + " still active. " }),
        h("button", { type: "button", text: "Review high-priority requests", onclick: function () {
          track("high_priority_review_clicked", {}); state.filters = { query: "", department: "All", status: "Active", priority: "High" }; go("requests");
        } })
      ]));
    } else {
      root.appendChild(h("div", { class: "notice ok", role: "status", text: "No high-priority requests are active." }));
    }
    var left = h("div", { class: "panel" }, [h("h2", { text: "Recent requests" }),
      requestTable(recent, h("p", { class: "empty", text: "No requests yet. Use New request to add one." })),
      h("p", null, [h("button", { type: "button", class: "link", text: "See all requests", onclick: function () { state.filters = { query: "", department: "All", status: "All", priority: "All" }; go("requests"); } })])]);
    var rows = C.DEPARTMENTS.map(function (d) {
      var w = m.workload[d];
      return h("tr", null, [h("th", { scope: "row", text: d }), h("td", { text: String(w.active) }), h("td", { text: String(w.unassignedActive) }), h("td", { text: String(w.highActive) }), h("td", { text: String(w.total) })]);
    });
    var right = h("div", { class: "panel" }, [h("h2", { text: "Department workload" }),
      h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Department workload, scrollable" }, [h("table", { style: "min-width:340px" }, [
        h("thead", null, [h("tr", null, ["Department", "Active", "Unassigned", "High", "Total"].map(function (t) { return h("th", { scope: "col", text: t }); }))]),
        h("tbody", null, rows)])]),
      h("p", { class: "hint", text: "Active means Open plus In progress. Unassigned and High count active requests only." })]);
    root.appendChild(h("div", { class: "grid2" }, [left, right]));
  };
  function card(n, label) { return h("div", { class: "card" }, [h("div", { class: "num", text: String(n) }), h("div", { class: "lbl", text: label })]); }

  function track(ev, props) { if (window.ServiceFlowTrack) window.ServiceFlowTrack.track(ev, props); }

  /* ---------- Requests ---------- */
  renderers.requests = function () {
    var root = $("view-requests"); clear(root);
    var f = state.filters;
    root.appendChild(h("div", { class: "page-head" }, [
      h("div", null, [h("h1", { id: "h-requests", text: "Requests" }),
        h("p", { class: "muted", text: "Saved only in this browser, for this site address. Another browser or device will not see these records." })]),
      h("div", { class: "actions" }, [
        h("button", { type: "button", class: "primary", text: "New request", onclick: function (e) { openNew(e.currentTarget); } }),
        h("button", { type: "button", text: "Export CSV", onclick: exportCsv }),
        h("button", { type: "button", text: "Reset demo data", onclick: function (e) { openReset(e.currentTarget); } }),
        h("button", { type: "button", id: "btn-extended", text: "Load extended sample (60)", onclick: function (e) { openReset(e.currentTarget, true); } })
      ])
    ]));
    function sel(id, label, opts, val, key) {
      var s = h("select", { id: id }, opts.map(function (o) { return h("option", { value: o, text: o, selected: o === val }); }));
      s.addEventListener("change", function () { state.filters[key] = s.value; track("filter_used", { filter_type: key }); updateTable(); });
      return h("div", null, [h("label", { for: id, text: label }), s]);
    }
    var q = h("input", { type: "search", id: "f-query", value: f.query, placeholder: "ID, title, requester, description or owner", autocomplete: "off" });
    var qTimer = null;
    q.addEventListener("input", function () { state.filters.query = q.value; updateTable(); clearTimeout(qTimer); qTimer = setTimeout(function () { track("filter_used", { filter_type: "search" }); }, 1200); });
    root.appendChild(h("div", { class: "filters", role: "search" }, [
      h("div", { class: "f-search" }, [h("label", { for: "f-query", text: "Search" }), q]),
      sel("f-dept", "Department", ["All"].concat(C.DEPARTMENTS), f.department, "department"),
      sel("f-status", "Status", ["All", "Active"].concat(C.STATUSES), f.status, "status"),
      sel("f-prio", "Priority", ["All"].concat(C.PRIORITIES), f.priority, "priority"),
      h("button", { type: "button", id: "f-clear", text: "Clear filters", onclick: function () {
        state.filters = { query: "", department: "All", status: "All", priority: "All" }; renderers.requests(); $("f-query").focus();
      } })
    ]));
    root.appendChild(h("p", { id: "f-count", class: "muted", "aria-live": "polite" }));
    root.appendChild(h("div", { id: "f-table" }));
    updateTable();
  };
  function updateTable() {
    var list = C.filterRequests(state.requests, state.filters).sort(function (a, b) { return Date.parse(b.createdAt) - Date.parse(a.createdAt); });
    $("f-count").textContent = "Showing " + list.length + " of " + state.requests.length + " requests.";
    var box = $("f-table"); clear(box);
    var empty = h("div", { class: "panel empty" }, [
      h("p", { text: state.requests.length === 0 ? "There are no requests yet." : "No requests match these filters." }),
      state.requests.length === 0 ? h("button", { type: "button", class: "primary", text: "Create the first request", onclick: function (e) { openNew(e.currentTarget); } })
        : h("button", { type: "button", text: "Clear filters", onclick: function () { state.filters = { query: "", department: "All", status: "All", priority: "All" }; renderers.requests(); } })
    ]);
    box.appendChild(requestTable(list, empty));
  }

  /* ---------- Analytics ---------- */
  renderers.analytics = function () {
    var root = $("view-analytics"); clear(root);
    var m = C.computeMetrics(state.requests);
    root.appendChild(h("div", { class: "page-head" }, [h("div", null, [h("h1", { id: "h-analytics", text: "Analytics" }), h("p", { class: "muted", text: "Calculated from the same records as the Requests table. Demonstration data, not company results." })])]));
    root.appendChild(h("div", { class: "cards" }, [
      card(m.active, "Active requests"), card(m.highActive, "High-priority active"),
      card(m.total ? num(m.resolutionSharePct, 1) + "%" : "n/a", "Resolution share"),
      card(m.avgResolutionHours === null ? "n/a" : num(m.avgResolutionHours, 2) + " h", m.avgResolutionHours === null ? "Average resolution time (no resolved requests)" : "Average resolution time")
    ]));
    function bars(title, obj, order) {
      return h("div", { class: "panel" }, [h("h2", { text: title }), h("div", { class: "bars" }, order.map(function (k) {
        var pct = m.total ? obj[k] / m.total * 100 : 0;
        return h("div", { class: "bar-row" }, [h("span", { text: k }), h("div", { class: "bar", "aria-hidden": "true" }, [h("span", { style: "width:" + pct + "%" })]), h("span", { text: obj[k] + " (" + num(pct, 0) + "%)" })]);
      }))]);
    }
    root.appendChild(h("div", { class: "grid2", style: "grid-template-columns:1fr 1fr" }, [bars("By department", m.byDepartment, C.DEPARTMENTS), bars("By status", m.byStatus, C.STATUSES)]));
    root.appendChild(h("div", { class: "panel" }, [h("h2", { text: "Metric definitions" }), h("dl", { class: "defs" }, [
      h("dt", { text: "Active requests" }), h("dd", { text: "Requests with status Open or In progress." }),
      h("dt", { text: "High-priority active" }), h("dd", { text: "Active requests with priority High." }),
      h("dt", { text: "Resolution share" }), h("dd", { text: "Resolved requests divided by all requests, as a percentage. It is a share of the current list. It is not SLA compliance and says nothing about whether requests were resolved on time." }),
      h("dt", { text: "Average resolution time" }), h("dd", { text: "For requests currently Resolved, the mean of resolvedAt minus createdAt, in hours. Reopened requests are excluded until resolved again. It uses elapsed clock time, not working hours." }),
      h("dt", { text: "Department and status distribution" }), h("dd", { text: "Count of all requests in each group, with its share of the total." })
    ])]));
  };

  /* ---------- Case study ---------- */
  renderers["case-study"] = function () {
    var root = $("view-case-study"); clear(root);
    root.classList.add("cs");
    function ol(items) { return h("ol", null, items.map(function (t) { return h("li", { text: t }); })); }
    function ul(items) { return h("ul", null, items.map(function (t) { return h("li", { text: t }); })); }
    function sec(title, nodes) { return h("div", { class: "panel" }, [h("h2", { text: title })].concat(nodes)); }
    function table(head, rows) {
      return h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": head[0] + " table, scrollable" }, [h("table", null, [
        h("thead", null, [h("tr", null, head.map(function (t) { return h("th", { scope: "col", text: t }); }))]),
        h("tbody", null, rows.map(function (r) { return h("tr", null, r.map(function (c, i) { return i === 0 ? h("th", { scope: "row", text: c }) : h("td", { text: c }); })); }))])]);
    }
    root.appendChild(h("div", { class: "page-head" }, [h("div", null, [
      h("h1", { id: "h-case", text: "Delivery case study" }),
      h("p", { class: "muted", text: "ServiceFlow, an employee service request portal. Product and delivery write-up by the product and project lead." })])]));
    root.appendChild(h("div", { class: "cards" }, [
      card("3", "Departments in scope"), card("10", "Requirements, each with a test"), card("5", "Release gates"), card("63", "Automated checks passing")
    ]));
    root.appendChild(sec("Summary", [
      h("p", { text: "Employees at Northstar Studio, a 75-person company, ask IT, Facilities and HR for help through email and chat. Requests arrive incomplete, nobody knows who owns them, and department heads cannot see workload. ServiceFlow replaces that with one structured form, a named owner for every request, a visible status and a shared view of workload." }),
      h("p", { text: "I defined the scope, wrote the requirements, planned the delivery, built and tested the product and set up the tooling to track it. The release is a working prototype, ready for a pilot with one real team." })
    ]));
    root.appendChild(sec("Problem and users", [
      h("p", { text: "Three groups feel the problem differently." }),
      table(["User", "Need", "What ServiceFlow gives them"], [
        ["Employee", "Ask once and know what happens next.", "A short form with clear errors, then an owner and status they can see."],
        ["Department owner", "Know what is waiting and who has it.", "Requests filtered by department, with owner and priority on each."],
        ["Operations director", "See workload across IT, Facilities and HR.", "An overview of active, unassigned and high-priority requests by department."]
      ])
    ]));
    root.appendChild(sec("Goals", [
      ul(["Every request has a named owner before work starts.",
        "Every request has a status that anyone can read: Open, In progress or Resolved.",
        "Department heads can see active workload without asking.",
        "The overview, the request list and the analytics always show the same numbers."])
    ]));
    root.appendChild(sec("Scope decisions", [
      h("p", { text: "I prioritized with MoSCoW and held version 1 to what proves the core flow." }),
      table(["Priority", "Included"], [
        ["Must", "Validated request form, routing by department, owner and status rules, dated history, one shared set of records."],
        ["Should", "Search and filters, analytics with defined metrics, CSV export that is safe to open in a spreadsheet."],
        ["Not in version 1", "Sign-in, shared database, email notifications, file uploads, SLA enforcement, enterprise integrations."]
      ]),
      h("p", { class: "muted", text: "Leaving out sign-in and a shared database kept the release to one day of build and made it easy to put in front of users. They are the first items after the pilot." })
    ]));
    root.appendChild(sec("Key product decisions", [
      ul(["An owner is required before a request moves to In progress, so work never starts unassigned (R03).",
        "Owners come from a list per department, which avoids misrouted requests (R02).",
        "Every owner and status change is recorded with a date, so the history explains the current state (R04).",
        "Metrics are defined on the page: resolution share is not SLA compliance and average resolution time uses elapsed hours (R06).",
        "Saved data is validated on load, and a visible warning appears when saving fails, so no one loses work silently (R07).",
        "Free text is always rendered as text and exported with spreadsheet formulas neutralized (R08)."])
    ]));
    root.appendChild(sec("How the work was run", [
      h("p", { text: "Delivery followed a charter, a short ideation round, a plan with five release gates and a risk log. Four options were scored on pain points fixed, effort and testability, and a lightweight request portal scored highest. Planned effort was 29 hours across seven phases." }),
      table(["Tool", "Used for"], [
        ["Notion", "Charter, ideation, plan and budget, usability study protocol, analytics plan."],
        ["Jira", "Engineering backlog: 5 epics and 29 stories."],
        ["Confluence", "Product and technical handbook."],
        ["monday.com", "Cross-team tracker by release gate, G1 Define to G5 Release."],
        ["Mixpanel", "Usage analytics: nine anonymous events and four reports."],
        ["Vercel", "Hosting for the prototype."]
      ])
    ]));
    root.appendChild(sec("Quality", [
      h("p", { text: "Each requirement maps to at least one test. The suite has 26 unit tests of the business logic, 14 static checks and 23 browser checks, and all pass. Browser checks cover the form, keyboard use, a narrow phone screen and storage failure. Results are in the artifact list below." }),
      h("p", { text: "Two lessons from the build. A browser check that failed intermittently was traced to timing and fixed instead of re-run until it passed. A first deployment was missing two files, so every release now ends with a file-hash check against the live site." })
    ]));
    root.appendChild(sec("Measurement", [
      h("p", { text: "The hosted site records nine anonymous events with no request text: form opened, validation error, request submitted, owner assigned, status changed, request resolved, filter used, CSV exported and high-priority review clicked. They feed four Mixpanel reports: the request funnel, validation errors by field, time to assign an owner and status transitions." })
    ]));
    root.appendChild(sec("Risks and trade-offs", [
      ul(["Records live in the browser, so they are not shared across devices. This is acceptable for a pilot with one team and is the first thing to replace.",
        "Owners and department filters are labels, not permissions. Real access control needs sign-in.",
        "Resolution share is a count of the current list. A real SLA view needs due dates and working-hour rules.",
        "Accessibility was designed in with labels, focus handling and text on every status color. Conformance testing is still to do."])
    ]));
    root.appendChild(sec("Next steps", [
      ol([
        "Run the usability study with five employees from one department, using the written protocol.",
        "Add sign-in and a shared database so a team can use the same records.",
        "Add email notifications for assignment and resolution.",
        "Define due dates and SLA rules with the department heads, then measure time to resolve against them."])
    ]));
    root.appendChild(h("div", { class: "panel" }, [h("h2", { text: "Project artifacts" }),
      h("p", { class: "muted", text: "Open any file below. Jira, Confluence, Notion, monday.com and Mixpanel views are shared on request." }),
      h("ul", { class: "dl-grid" }, DOWNLOADS.map(function (d) {
        return h("li", null, [h("a", { href: "delivery/" + d[0], target: "_blank", rel: "noopener", text: d[0] }), h("small", { text: d[1] })]);
      }))]));
  };

  /* ---------- Dialog helpers ---------- */
  function fieldError(id) { return h("div", { class: "err", id: id, role: "alert" }); }
  function closeBtn(dlg) { return h("button", { type: "button", text: "Close", onclick: function () { dlg.close(); } }); }

  /* ---------- New request ---------- */
  function openNew(opener) {
    var dlg = $("dlg-new"); clear(dlg);
    var f = {};
    function text(id, label, max, tag) {
      var el = tag === "textarea" ? h("textarea", { id: id, name: id, maxlength: String(max + 200), "aria-describedby": id + "-err " + id + "-hint" }) : h("input", { type: "text", id: id, name: id, autocomplete: "off", "aria-describedby": id + "-err " + id + "-hint" });
      f[id] = el;
      return h("div", { class: "field" }, [h("label", { for: id, text: label }), el, h("div", { class: "hint", id: id + "-hint", text: "Required." }), fieldError(id + "-err")]);
    }
    function select(id, label, opts, ph) {
      var el = h("select", { id: id, name: id, "aria-describedby": id + "-err" }, [h("option", { value: "", text: ph })].concat(opts.map(function (o) { return h("option", { value: o, text: o }); })));
      f[id] = el;
      return h("div", { class: "field" }, [h("label", { for: id, text: label }), el, fieldError(id + "-err")]);
    }
    var form = h("form", { novalidate: true }, [
      text("title", "Title (5 to 100 characters)", 100),
      text("requester", "Requester name (1 to 60 characters)", 60),
      h("div", { class: "row2" }, [select("department", "Department", C.DEPARTMENTS, "Choose a department"), select("priority", "Priority", C.PRIORITIES, "Choose a priority")]),
      select("category", "Category", C.CATEGORIES, "Choose a category"),
      text("description", "Description (10 to 2,000 characters)", 2000, "textarea"),
      h("p", { class: "hint", text: "Use fictional details. This prototype stores data in your browser only and should not hold real or confidential information." }),
      h("div", { class: "dlg-foot" }, [closeBtn(dlg), h("button", { type: "submit", class: "primary", text: "Submit request" })])
    ]);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = {}; Object.keys(f).forEach(function (k) { input[k] = f[k].value; });
      var res = C.createRequest(state.requests, input, Date.now());
      Object.keys(f).forEach(function (k) { $(k + "-err").textContent = ""; f[k].removeAttribute("aria-invalid"); });
      if (!res.ok) {
        var first = null;
        Object.keys(res.errors).forEach(function (k) { track("request_validation_error", { field: k }); $(k + "-err").textContent = res.errors[k]; f[k].setAttribute("aria-invalid", "true"); if (!first) first = f[k]; });
        ["title", "requester", "department", "priority", "category", "description"].some(function (k) { if (res.errors[k]) { f[k].focus(); return true; } return false; });
        return;
      }
      state.requests = [res.request].concat(state.requests);
      track("request_submitted", { department: res.request.department, priority: res.request.priority, category: res.request.category });
      var saved = persist();
      dlg.close();
      state.filters = { query: "", department: "All", status: "All", priority: "All" };
      toast("Created " + res.request.id + " in " + res.request.department + (saved ? "." : ". Not saved to browser storage."));
      go("requests");
    });
    dlg.appendChild(h("div", { class: "dlg" }, [h("div", { class: "dlg-head" }, [h("h2", { id: "dlg-new-title", text: "New request" })]), form]));
    dlg.showModal();
    track("request_form_opened", {});
    f.title.focus();
  }

  /* ---------- Request detail ---------- */
  function openDetail(id, opener) {
    var dlg = $("dlg-detail");
    function draw(msg, errs) {
      var r = state.requests.filter(function (x) { return x.id === id; })[0];
      clear(dlg);
      if (!r) { dlg.appendChild(h("div", { class: "dlg" }, [h("p", { text: "This request no longer exists." }), closeBtn(dlg)])); return; }
      var owner = h("select", { id: "d-owner", "aria-describedby": "d-owner-err" }, [h("option", { value: "", text: "Unassigned", selected: !r.owner })].concat(C.OWNERS[r.department].map(function (o) { return h("option", { value: o, text: o, selected: o === r.owner }); })));
      var status = h("select", { id: "d-status", "aria-describedby": "d-status-err" }, C.STATUSES.map(function (s) { return h("option", { value: s, text: s, selected: s === r.status }); }));
      var form = h("form", { novalidate: true }, [
        h("div", { class: "row2" }, [
          h("div", { class: "field" }, [h("label", { for: "d-owner", text: "Owner (" + r.department + " team)" }), owner, h("div", { class: "err", id: "d-owner-err", role: "alert", text: (errs && errs.owner) || "" })]),
          h("div", { class: "field" }, [h("label", { for: "d-status", text: "Status" }), status, h("div", { class: "err", id: "d-status-err", role: "alert", text: (errs && errs.status) || "" })])
        ]),
        msg ? h("div", { class: "notice ok", role: "status", text: msg }) : null,
        h("div", { class: "dlg-foot" }, [closeBtn(dlg), h("button", { type: "submit", class: "primary", text: "Save changes" })])
      ]);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var res = C.updateRequest(r, { owner: owner.value, status: status.value }, Date.now());
        if (!res.ok) { draw("", res.errors); var t = res.errors.owner ? $("d-owner") : $("d-status"); if (t) t.focus(); return; }
        if (!res.changed) { draw("No changes to save.", null); $("d-owner").focus(); return; }
        var nr = res.request, tp = { department: nr.department, priority: nr.priority, category: nr.category };
        if (nr.owner !== r.owner && nr.owner) track("owner_assigned", Object.assign({ status: nr.status }, tp));
        if (nr.status !== r.status) {
          track("status_changed", Object.assign({ status: nr.status, from_status: r.status }, tp));
          if (nr.status === "Resolved") track("request_resolved", Object.assign({ hours_to_resolve: C.resolutionHours(nr) }, tp));
        }
        state.requests = state.requests.map(function (x) { return x.id === id ? res.request : x; });
        var saved = persist();
        draw(saved ? "Saved. The change was added to the history." : "Changed in this tab, but not saved to browser storage.", null);
        $("d-status").focus();
        refresh();
      });
      var hist = h("ol", { class: "history", "aria-label": "Change history" }, r.history.slice().reverse().map(function (x) {
        return h("li", null, [h("time", { datetime: x.at, text: fmtDateTime(x.at) }), x.text]);
      }));
      dlg.appendChild(h("div", { class: "dlg" }, [
        h("div", { class: "dlg-head" }, [h("div", null, [h("div", { class: "muted", text: r.id }), h("h2", { id: "dlg-detail-title", text: r.title })]), closeBtn(dlg)]),
        h("div", null, [statusBadge(r.status), " ", prioBadge(r.priority)]),
        h("dl", { class: "facts", style: "margin-top:12px" }, [
          h("dt", { text: "Requester" }), h("dd", { text: r.requester }),
          h("dt", { text: "Department" }), h("dd", { text: r.department }),
          h("dt", { text: "Category" }), h("dd", { text: r.category }),
          h("dt", { text: "Created" }), h("dd", { text: fmtDateTime(r.createdAt) }),
          h("dt", { text: "Resolved" }), h("dd", { text: r.resolvedAt ? fmtDateTime(r.resolvedAt) : "Not resolved" }),
          h("dt", { text: "Description" }), h("dd", { style: "white-space:pre-wrap", text: r.description })
        ]),
        form,
        h("h3", { style: "margin-top:18px", text: "History" }), hist
      ]));
    }
    draw("", null);
    dlg.showModal();
    var o = $("d-owner"); if (o) o.focus();
  }

  /* ---------- Reset ---------- */
  function openReset(opener, extended) {
    var dlg = $("dlg-reset"); clear(dlg);
    var cancel = h("button", { type: "button", text: "Cancel", onclick: function () { dlg.close(); } });
    dlg.appendChild(h("div", { class: "dlg" }, [
      h("h2", { id: "dlg-reset-title", text: extended ? "Load extended sample data?" : "Reset demonstration data?" }),
      h("p", { text: extended
        ? "This replaces every request in this browser, including ones you created, with 60 synthetic records (the 12 demonstration records plus 48 generated ones). It cannot be undone. Export a CSV first if you want a copy."
        : "This replaces every request in this browser, including ones you created, with the 12 demonstration records. It cannot be undone. Export a CSV first if you want a copy." }),
      h("div", { class: "dlg-foot" }, [cancel, h("button", { type: "button", class: "danger", id: extended ? "btn-extended-confirm" : undefined, text: extended ? "Load extended sample" : "Reset demo data", onclick: function () {
        state.requests = extended ? C.extendedDemoRequests() : C.seedRequests();
        state.filters = { query: "", department: "All", status: "All", priority: "All" };
        var saved = persist();
        dlg.close();
        toast(saved ? "Demonstration data restored." : "Demonstration data restored in this tab, but not saved.");
        refresh();
      } })])
    ]));
    dlg.showModal();
    cancel.focus();
  }

  /* ---------- CSV export (R08) ---------- */
  function exportCsv() {
    var csv = C.toCsv(state.requests);
    track("csv_exported", { record_count: state.requests.length });
    try {
      var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var d = new Date();
      var name = "serviceflow-requests-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".csv";
      var a = h("a", { href: url, download: name });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      toast("Exported " + state.requests.length + " requests to " + name + ".");
    } catch (e) {
      toast("The download could not start in this browser.");
    }
  }

  /* ---------- start ---------- */
  document.querySelectorAll("nav a[data-view]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (location.hash === "#" + a.dataset.view) { e.preventDefault(); show(a.dataset.view, true); }
    });
  });
  window.addEventListener("hashchange", function () { show(currentView(), true); });
  // If a dialog closes and the control that opened it was rebuilt, move focus to the page heading so it is not lost.
  ["dlg-new", "dlg-detail", "dlg-reset"].forEach(function (id) {
    $(id).addEventListener("close", function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!a || a === document.body) {
          var hd = $("view-" + currentView()).querySelector("h1");
          if (hd) { hd.setAttribute("tabindex", "-1"); hd.focus(); }
        }
      }, 0);
    });
  });
  load();
  show(currentView(), false);
})();
