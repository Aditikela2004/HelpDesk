/* ServiceFlow interface. Rendering, dialogs, events, localStorage and downloads. Business logic lives in core.js. */
(function () {
  "use strict";
  var C = window.ServiceFlowCore;
  var STORE_KEY = "serviceflow.v1";
  var ROLES = /*ROLES_START*/[["CEO and executive sponsor", "Fund a one-day MVP and ask for one outcome: employees know who owns a request and what state it is in.", "Sponsor statement and proposed acceptance gates (simulated)."], ["CIO", "Accept a buildless, browser-local prototype for the demonstration and name what blocks production use.", "Technology rationale, security boundaries, production gap list."], ["Operations Director", "Supply the brief. Limit version 1 to IT, Facilities and HR with ownership and workload visibility.", "Simulated brief and pain points."], ["Department heads", "Require named owners per department and a view of active workload.", "Owner lists and workload requirements."], ["Employees and end users", "Submit once, then see owner and status without asking.", "Assumed personas and example requests."], ["Product Manager", "Prioritize with MoSCoW. Defer notifications, uploads, SLA enforcement and sign-in.", "Problem statement, PRD, roadmap."], ["Project Manager", "Plan the build as one day with five release gates and a short risk register.", "Charter, work breakdown, plan, RAID, decision log, release checklist, handover."], ["Program Manager", "Coordinate four workstreams around shared gates, and show what comes after version 1.", "Program view and dependency map."], ["Business Analyst", "Turn the brief into ten testable requirements with explicit business rules.", "R01 to R10, user stories, acceptance criteria, rules."], ["UI/UX Designer", "Design one submission flow and one assignment and resolution flow, with clear empty and error states.", "Information architecture, flows, wireframes, usability study proposal."], ["Visual Designer", "Keep the look restrained, with text labels on every status color.", "Design tokens and component states."], ["Developer", "Separate business logic from rendering, validate stored data, and escape user text.", "Source code and README."], ["Data Analyst", "Define each metric and prove the seed data reconciles by hand.", "Metric dictionary, seed reconciliation, sample CSV."], ["QA Tester", "Test every requirement automatically where possible and record only what was executed.", "Test strategy, automated tests, manual scripts, QA evidence."], ["Validation Lead", "Judge whether the prototype is fit for its stated intended use, and for nothing more.", "Intended-use assessment and release recommendation."], ["Software Environment Team", "Define development, preview and hosted environments, configuration, and the source freeze.", "Environment and configuration notes."], ["Deployment and Production Support Team", "Package, deploy, verify, and describe rollback and support ownership for a prototype.", "Deployment runbook and handover."]]/*ROLES_END*/;
  var DOWNLOADS = /*DOWNLOADS_START*/[["Confluence_Handbook.md", "Product and technical handbook (Markdown)"], ["Engineering_Backlog.csv", "Engineering backlog (Jira import layout)"], ["Delivery_Tracker.csv", "Cross-functional delivery tracker (monday.com layout)"], ["Requirements_Traceability.csv", "Need to requirement to test to release disposition"], ["ServiceFlow_Wireframes.svg", "Editable SVG wireframes"], ["Sample_Requests.csv", "The 12 demonstration records as CSV"], ["Tool_Mapping.md", "Which tool holds what, and what was actually used"], ["QA_Evidence.md", "Executed test evidence, gaps and release recommendation"], ["Unit_Test_Results.txt", "Raw output of the unit tests"], ["Static_Checks.txt", "Raw output of the static checks"], ["Browser_Check_Results.txt", "Raw output of the browser checks"]]/*DOWNLOADS_END*/;

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
    var rows = ROLES.map(function (r) { return h("tr", null, [h("th", { scope: "row", text: r[0] }), h("td", { text: r[1] }), h("td", { text: r[2] })]); });
    root.appendChild(h("div", { class: "page-head" }, [h("div", null, [h("h1", { id: "h-case", text: "Delivery case study" }), h("p", { class: "muted", text: "How one simulated business need moved from definition to release. AI-assisted independent portfolio project." })])]));
    root.appendChild(h("div", { class: "notice" }, [h("strong", { text: "Read this first. " }), "Northstar Studio, its people, the brief, the personas and the sample requests are fictional. No stakeholder approved this work, no user research was done, and no adoption, savings or production results exist. Role contributions below describe decisions and deliverables, not real people."]));
    root.appendChild(h("div", { class: "panel" }, [
      h("h2", { text: "The problem (simulated brief)" }),
      h("p", { text: "Employees of a fictional 75-person company ask for IT, Facilities and HR help through scattered emails and messages. Requests arrive incomplete, nobody knows who owns them, people chase for updates, and department heads cannot see workloads." }),
      h("h2", { text: "MVP decisions" }),
      h("ul", null, ["Structured form with validated fields, so requests arrive complete (R01).", "Routing by department with a department-specific owner and an Unassigned state (R02, R03).", "Three statuses, with an owner required before work starts, and a dated history of owner and status changes (R03, R04).", "One shared set of records feeds the directory, overview and analytics, so the numbers always agree (R05, R06).", "Browser-local storage, with validation on load and a visible warning when saving fails (R07).", "CSV export that neutralizes spreadsheet formulas (R08).", "Left out on purpose: sign-in, shared database, email, file uploads, SLA enforcement, enterprise integrations."].map(function (t) { return h("li", { text: t }); }))
    ]));
    root.appendChild(h("div", { class: "panel" }, [h("h2", { text: "Role contributions (simulated)" }),
      h("div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": "Role contributions, scrollable" }, [h("table", null, [h("thead", null, [h("tr", null, ["Role", "Decision", "Deliverable"].map(function (t) { return h("th", { scope: "col", text: t }); }))]), h("tbody", null, rows)])])]));
    root.appendChild(h("div", { class: "panel" }, [
      h("h2", { text: "Architecture" }),
      h("p", { text: "Buildless static site: index.html, styles.css, core.js and app.js. core.js holds validation, lifecycle rules, filtering, metrics, CSV and the sample data, with no browser dependencies, so it is tested directly in Node. app.js renders the views and handles dialogs, localStorage and downloads, and builds all user-supplied text with textContent so it is never parsed as HTML." }),
      h("h2", { text: "Verification evidence" }),
      h("p", { text: "Executed results are in QA_Evidence.md, Unit_Test_Results.txt and Static_Checks.txt below. They list what passed, what failed and what has not been run. The test evidence verifies the software against its written requirements. It does not validate that the tool helps real employees." }),
      h("h2", { text: "Limitations" }),
      h("ul", null, ["Records live in browser storage and can be edited or cleared by the user. They are not shared across browsers or devices.", "No authentication or authorization. Department filters and owners are labels, not permissions.", "The history is not tamper-proof and is not an audit trail.", "No email or notifications, no file uploads, no SLA enforcement.", "Resolution share is not SLA compliance. All numbers come from fictional demonstration records.", "Accessibility is designed for (labels, focus, text status) but conformance has not been tested.", "Hosted as a prototype only. There is no production service, monitoring or support rota."].map(function (t) { return h("li", { text: t }); }))
    ]));
    root.appendChild(h("div", { class: "panel" }, [h("h2", { text: "Supporting artifacts in the project package" }),
      h("p", { class: "muted", text: "These files are supplied in the project package (delivery folder, plus the Word master delivery plan). They are listed here, not served from this hosted page. The Word plan and the handbook describe the same product." }),
      h("ul", { class: "dl-grid" }, DOWNLOADS.map(function (d) {
        return h("li", null, [h("strong", { text: d[0] }), h("small", { text: d[1] })]);
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
