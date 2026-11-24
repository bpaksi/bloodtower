#!/usr/bin/env python3
"""Read a forgekit plan (GitHub issues in a `Plan:` milestone), validate it, and
report what is ready to dispatch. See PLAN-FORMAT.md.

Prints one JSON object. Exits 0 when the plan is valid, 1 when it is not (the
JSON then has `errors` and an empty `dispatch`), 2 on usage or `gh` failure.
"""
import argparse
import json
import re
import subprocess
import sys

KINDS = {"kind:code", "kind:test", "kind:docs", "kind:art", "kind:story", "kind:design", "kind:config"}
GROK_KINDS = {"kind:art", "kind:story"}
WHERE = {"where:hammer", "where:anvil"}
DEPENDS_RE = re.compile(r"^[ \t]*Depends on:[ \t]*(.*?)[ \t]*$", re.IGNORECASE | re.MULTILINE)
DONE_RE = re.compile(r"^##[ \t]+Done when[ \t]*$", re.IGNORECASE | re.MULTILINE)
CHECKBOX_RE = re.compile(r"^[ \t]*[-*][ \t]+\[[ xX]\]", re.MULTILINE)
REF_RE = re.compile(r"^#(\d+)$")


def gh_json(args):
    try:
        out = subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout
    except FileNotFoundError:
        sys.exit(_fatal("gh is not installed"))
    except subprocess.CalledProcessError as e:
        sys.exit(_fatal(f"gh {' '.join(args[:2])} failed: {e.stderr.strip()}"))
    return json.loads(out)


def _fatal(msg):
    print(json.dumps({"ok": False, "errors": [msg], "dispatch": []}))
    return 2


def fetch(repo, milestone_title):
    milestones = gh_json(["api", f"repos/{repo}/milestones?state=open&per_page=100"])
    plan = pick_milestone(milestones, milestone_title)
    if plan is None:
        return None, []
    issues = gh_json([
        "issue", "list", "-R", repo, "--milestone", plan["title"], "--state", "all",
        "--limit", "500", "--json", "number,title,state,labels,body,url",
    ])
    return plan, issues


def pick_milestone(milestones, title):
    plans = [m for m in milestones if m["title"].lower().startswith("plan:")]
    if title is not None:
        plans = [m for m in plans if m["title"] == title]
    return max(plans, key=lambda m: m["number"]) if plans else None


def labels_of(issue):
    return {(l["name"] if isinstance(l, dict) else l) for l in issue.get("labels", [])}


def parse_issue(issue, errors):
    n = issue["number"]
    body = issue.get("body") or ""
    labels = labels_of(issue)

    kinds = labels & KINDS
    if len(kinds) != 1:
        errors.append(f"#{n}: needs exactly one kind label ({', '.join(sorted(KINDS))}), has {sorted(kinds) or 'none'}")
    if len(labels & WHERE) > 1:
        errors.append(f"#{n}: has both where:hammer and where:anvil")

    deps = []
    lines = DEPENDS_RE.findall(body)
    if len(lines) != 1:
        errors.append(f"#{n}: needs exactly one 'Depends on:' line, found {len(lines)}")
    else:
        value = lines[0]
        if value.lower() != "none":
            for part in (p.strip() for p in value.split(",")):
                m = REF_RE.match(part)
                if not m:
                    errors.append(f"#{n}: bad 'Depends on' entry {part!r} (use '#12, #14' or 'none')")
                else:
                    deps.append(int(m.group(1)))

    done = DONE_RE.search(body)
    if not done or not CHECKBOX_RE.search(body[done.end():]):
        errors.append(f"#{n}: needs a '## Done when' section with at least one '- [ ]' item")

    return {
        "number": n,
        "title": issue["title"],
        "url": issue.get("url"),
        "closed": issue["state"].upper() == "CLOSED",
        "kind": next(iter(kinds)) if len(kinds) == 1 else None,
        "where": next(iter(labels & WHERE), None) if len(labels & WHERE) == 1 else None,
        "long": "size:long" in labels,
        "labels": sorted(labels),
        "depends_on": deps,
    }


def find_cycle(items):
    graph = {i["number"]: [d for d in i["depends_on"] if d in items] for i in items.values()}
    state = {}

    def visit(n, path):
        state[n] = 1
        for d in graph[n]:
            if state.get(d) == 1:
                return path[path.index(d):] + [d] if d in path else [n, d]
            if d not in state:
                found = visit(d, path + [d])
                if found:
                    return found
        state[n] = 2
        return None

    for n in sorted(graph):
        if n not in state:
            found = visit(n, [n])
            if found:
                return found
    return None


def status_of(item, items):
    if item["closed"]:
        return "done"
    labels = set(item["labels"])
    if "needs-owner" in labels:
        return "needs-owner"
    if "plan:blocked" in labels:
        return "blocked-on-owner"
    if "plan:hitl" in labels:
        return "needs-human"
    if "plan:ready" in labels:
        return "awaiting-merge"
    if "plan:in-progress" in labels:
        return "running"
    if any(not items[d]["closed"] for d in item["depends_on"]):
        return "waiting"
    return "ready"


def evaluate(plan, raw_issues, max_running):
    if plan is None:
        return {"ok": False, "errors": ["no open milestone titled 'Plan: …' (see PLAN-FORMAT.md)"], "dispatch": []}
    errors = []
    items = {}
    for raw in raw_issues:
        item = parse_issue(raw, errors)
        items[item["number"]] = item
    if not items:
        errors.append(f"milestone {plan['title']!r} has no issues")
    for item in items.values():
        for d in item["depends_on"]:
            if d == item["number"]:
                errors.append(f"#{d}: depends on itself")
            elif d not in items:
                errors.append(f"#{item['number']}: depends on #{d}, which isn't in this plan")
    if not errors:
        cycle = find_cycle(items)
        if cycle:
            errors.append("dependency cycle: " + " -> ".join(f"#{n}" for n in cycle))

    result = {"ok": not errors, "plan": {"title": plan["title"], "number": plan["number"]}, "errors": errors}
    if errors:
        result["dispatch"] = []
        return result

    for item in items.values():
        item["status"] = status_of(item, items)
        item["needs_grok"] = item["kind"] in GROK_KINDS
    ordered = [items[n] for n in sorted(items)]
    running = [i["number"] for i in ordered if i["status"] == "running"]
    ready = [i for i in ordered if i["status"] == "ready"]
    slots = max(0, max_running - len(running))
    result.update({
        "issues": ordered,
        "counts": {s: sum(1 for i in ordered if i["status"] == s)
                   for s in ("done", "running", "awaiting-merge", "ready", "waiting",
                             "blocked-on-owner", "needs-human", "needs-owner")},
        "running": running,
        "max_running": max_running,
        "dispatch": [i["number"] for i in ready[:slots]],
        "complete": all(i["status"] == "done" for i in ordered),
    })
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", help="owner/name (default: the current repo)")
    ap.add_argument("--milestone", help="exact milestone title (default: newest open 'Plan:' milestone)")
    ap.add_argument("--max-running", type=int, default=2, help="concurrency cap across all machines (default 2)")
    ap.add_argument("--from-json", help="read {milestones, issues} from a file instead of gh (for tests)")
    args = ap.parse_args()
    if args.max_running < 1:
        return _fatal("--max-running must be at least 1")

    if args.from_json:
        with open(args.from_json) as f:
            data = json.load(f)
        plan = pick_milestone(data["milestones"], args.milestone)
        issues = data["issues"] if plan else []
    else:
        repo = args.repo or gh_json(["repo", "view", "--json", "nameWithOwner"])["nameWithOwner"]
        plan, issues = fetch(repo, args.milestone)

    result = evaluate(plan, issues, args.max_running)
    print(json.dumps(result, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
