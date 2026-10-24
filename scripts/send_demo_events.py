#!/usr/bin/env python3
"""Send SIMULATED HelpDesk usage events to Mixpanel so the dashboard has something to show.

Every event carries demo=true and data_source="simulated". These are not real user results.
Run it from your own machine (the project's sandbox cannot reach api.mixpanel.com):

    MIXPANEL_TOKEN=<project token> python3 scripts/send_demo_events.py [--dry-run]

The token is read from the environment and is never written to disk by this script.
Uses only the Python standard library. Deterministic: the same run produces the same events.
Timestamps fall inside the last 4 days (Mixpanel's /track endpoint rejects older events).
"""
import json, os, random, sys, time, urllib.request

DEPTS = ["IT", "Facilities", "HR"]
CAT = {"IT": "Access and equipment", "Facilities": "Workspace", "HR": "People support"}
FIELDS = ["title", "requester", "department", "priority", "category", "description"]
FIELD_WEIGHTS = [5, 3, 4, 3, 3, 6]  # description and title are the most common mistakes
PRIOS = ["High", "Normal", "Low"]


def build(seed=20261022, sessions=60):
    rnd = random.Random(seed)
    now = int(time.time())
    window = 4 * 24 * 3600 - 3600
    events = []
    for n in range(sessions):
        uid = "demo-user-%02d" % (n % 18)
        t = now - rnd.randint(3600, window)

        def ev(name, dt, **props):
            events.append({"event": name, "properties": dict(
                props, distinct_id=uid, time=t + dt, app="HelpDesk", demo=True,
                data_source="simulated", **{"$insert_id": "demo-%d-%s-%d" % (n, name, dt)})})

        dep = rnd.choice(DEPTS)
        prio = rnd.choices(PRIOS, weights=[2, 6, 2])[0]
        ev("request_form_opened", 0)
        dt = rnd.randint(20, 60)
        for _ in range(rnd.choices([0, 1, 2], weights=[6, 3, 1])[0]):
            ev("request_validation_error", dt, field=rnd.choices(FIELDS, weights=FIELD_WEIGHTS)[0])
            dt += rnd.randint(10, 40)
        if rnd.random() < 0.15:
            continue  # abandoned the form
        tp = dict(department=dep, priority=prio, category=CAT[dep])
        ev("request_submitted", dt, **tp)
        # Time to assign an owner is modelled as 1 to 6 hours after submission.
        dt += rnd.randint(3600, 6 * 3600)
        if rnd.random() < 0.8:
            ev("owner_assigned", dt, status="Open", **tp)
            dt += rnd.randint(600, 3 * 3600)
            ev("status_changed", dt, status="In progress", from_status="Open", **tp)
            if rnd.random() < 0.6:
                dt += rnd.randint(3600, 30 * 3600)
                ev("status_changed", dt, status="Resolved", from_status="In progress", **tp)
                ev("request_resolved", dt, hours_to_resolve=round(dt / 3600, 1), **tp)
        if rnd.random() < 0.35:
            ev("filter_used", dt + 5, filter_type=rnd.choice(["search", "department", "status", "priority"]))
        if rnd.random() < 0.1:
            ev("csv_exported", dt + 9, record_count=rnd.choice([12, 60]))
        if prio == "High" and rnd.random() < 0.5:
            ev("high_priority_review_clicked", dt + 2)
    return events


def main():
    events = build()
    # Sort by time so the stream reads naturally.
    events.sort(key=lambda e: e["properties"]["time"])
    if "--dry-run" in sys.argv:
        names = {}
        for e in events:
            names[e["event"]] = names.get(e["event"], 0) + 1
        print(len(events), "events (dry run, nothing sent)")
        for k in sorted(names):
            print("  %-30s %d" % (k, names[k]))
        return
    token = os.environ.get("MIXPANEL_TOKEN", "").strip()
    if not token:
        sys.exit("Set MIXPANEL_TOKEN in the environment first. Nothing was sent.")
    for e in events:
        e["properties"]["token"] = token
    sent = 0
    for i in range(0, len(events), 50):
        chunk = events[i:i + 50]
        req = urllib.request.Request("https://api.mixpanel.com/track?ip=0", data=json.dumps(chunk).encode(),
                                     headers={"Content-Type": "application/json", "Accept": "text/plain"})
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode().strip()
        if body != "1":
            sys.exit("Mixpanel rejected a batch: " + body)
        sent += len(chunk)
    print("Sent %d simulated events (all tagged demo=true)." % sent)


if __name__ == "__main__":
    main()
