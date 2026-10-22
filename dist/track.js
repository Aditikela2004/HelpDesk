/* ServiceFlow product analytics (Mixpanel, HTTP API). Off unless window.SF_CONFIG.mixpanelToken is set.
   Only fixed event names and a short list of categorical properties are ever sent. No titles, names or descriptions. */
(function (root) {
  "use strict";

  var EVENTS = [
    "request_form_opened", "request_submitted", "request_validation_error", "owner_assigned",
    "status_changed", "request_resolved", "filter_used", "csv_exported", "high_priority_review_clicked"
  ];
  // Property name -> allowed values (null means a bounded number).
  var ALLOWED = {
    department: ["IT", "Facilities", "HR"],
    priority: ["High", "Normal", "Low"],
    category: ["Access and equipment", "Workspace", "People support", "Other"],
    status: ["Open", "In progress", "Resolved"],
    from_status: ["Open", "In progress", "Resolved"],
    field: ["title", "requester", "department", "priority", "category", "description"],
    filter_type: ["search", "department", "status", "priority"],
    hours_to_resolve: null,
    record_count: null
  };

  function sanitize(event, props) {
    if (EVENTS.indexOf(event) === -1) return null;
    var out = {};
    var src = props && typeof props === "object" ? props : {};
    Object.keys(ALLOWED).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(src, k)) return;
      var v = src[k];
      if (ALLOWED[k] === null) {
        if (typeof v === "number" && isFinite(v)) out[k] = Math.round(v * 10) / 10;
      } else if (ALLOWED[k].indexOf(v) !== -1) {
        out[k] = v;
      }
    });
    return { event: event, props: out };
  }

  function anonId() {
    try {
      var id = root.localStorage.getItem("serviceflow.anon");
      if (!id) {
        id = "anon-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        root.localStorage.setItem("serviceflow.anon", id);
      }
      return id;
    } catch (e) { return "anon-session-" + Math.random().toString(36).slice(2); }
  }

  var api = { EVENTS: EVENTS, ALLOWED: ALLOWED, sanitize: sanitize };

  function enabled() {
    var cfg = root.SF_CONFIG;
    if (!cfg || typeof cfg.mixpanelToken !== "string" || !cfg.mixpanelToken) return false;
    var nav = root.navigator || {};
    if (nav.doNotTrack === "1" || root.doNotTrack === "1") return false;
    return true;
  }

  api.track = function (event, props) {
    try {
      if (!enabled()) return false;
      var s = sanitize(event, props);
      if (!s) return false;
      var p = s.props;
      p.token = root.SF_CONFIG.mixpanelToken;
      p.distinct_id = anonId();
      p.time = Math.floor(Date.now() / 1000);
      p.$insert_id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      p.app = "ServiceFlow";
      var body = JSON.stringify([{ event: s.event, properties: p }]);
      root.fetch("https://api.mixpanel.com/track?ip=0", {
        method: "POST", headers: { "Content-Type": "application/json", "Accept": "text/plain" },
        body: body, keepalive: true
      }).catch(function () {});
      return true;
    } catch (e) { return false; }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ServiceFlowTrack = api;
})(typeof window !== "undefined" ? window : this);
