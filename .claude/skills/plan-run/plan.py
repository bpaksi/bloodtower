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
TOUCHES_RE = re.compile(r"^[ \t]*Touches:[ \t]*(.*?)[ \t]*$", re.IGNORECASE | re.MULTILINE)
GLOB_CHARS = "*?["


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

    touches = None
    tlines = TOUCHES_RE.findall(body)
    if len(tlines) > 1:
        errors.append(f"#{n}: has {len(tlines)} 'Touches:' lines; use one, comma-separated")
    elif tlines:
        touches = [t.strip().strip("`") for t in tlines[0].split(",") if t.strip().strip("`")]
        if not touches:
            errors.append(f"#{n}: 'Touches:' is empty (list paths or globs, comma-separated)")

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
        "touches": touches,
    }


def touch_prefix(entry):
    """The fixed part of a path or glob: everything before the first wildcard, without a
    trailing '/'. 'src/a/**' -> 'src/a', 'src/a/*.ts' -> 'src/a', 'src/a.ts' -> 'src/a.ts'."""
    cut = min([entry.index(c) for c in GLOB_CHARS if c in entry] or [len(entry)])
    fixed = entry[:cut]
    if cut < len(entry) and "/" in fixed:
        fixed = fixed[:fixed.rindex("/")]
    elif cut < len(entry):
        fixed = ""
    return fixed.strip("/")


def overlaps(a, b):
    """True when two Touches lists could name the same file. Conservative: two globs that
    share a directory count as overlapping, so overlapping work runs one after the other."""
    for x in a:
        for y in b:
            px, py = touch_prefix(x), touch_prefix(y)
            if not px or not py or px == py:
                return True
            if px.startswith(py + "/") or py.startswith(px + "/"):
                return True
    return False


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
    # Issues whose open work could touch the same files run one after the other: an
    # unmerged PR (running or awaiting merge) holds back any ready issue that overlaps it.
    busy = [i for i in ordered if i["status"] in ("running", "awaiting-merge") and i["touches"]]
    dispatch, held = [], []
    for i in ready:
        if len(dispatch) >= slots:
            break
        if i["touches"]:
            clash = [b["number"] for b in busy if overlaps(i["touches"], b["touches"])]
            if clash:
                held.append({"number": i["number"], "overlaps": clash})
                continue
            busy.append(i)
        dispatch.append(i["number"])
    warnings = [f"#{i['number']}: no 'Touches:' line, so it isn't checked for overlap"
                for i in ordered if i["touches"] is None and i["status"] in ("ready", "running")]
    result.update({
        "issues": ordered,
        "counts": {s: sum(1 for i in ordered if i["status"] == s)
                   for s in ("done", "running", "awaiting-merge", "ready", "waiting",
                             "blocked-on-owner", "needs-human", "needs-owner")},
        "running": running,
        "max_running": max_running,
        "dispatch": dispatch,
        "held_for_overlap": held,
        "warnings": warnings,
        "complete": all(i["status"] == "done" for i in ordered),
    })
    return result


def compact(result):
    """The default output: small enough that an agent's shell tool shows it in full instead of
    saving it to a file. Done issues are left out of `issues` (their count stays in `counts`),
    each issue drops `url` and `closed`, and the JSON has no indentation, one issue per line."""
    slim = dict(result)
    issues = [{k: v for k, v in i.items() if k not in ("url", "closed")}
              for i in result.get("issues", []) if i.get("status") != "done"]
    slim.pop("issues", None)
    head = json.dumps(slim, separators=(",", ":"))
    if "issues" not in result:
        return head
    rows = ",\n".join(json.dumps(i, separators=(",", ":")) for i in issues)
    return head[:-1] + (',"issues":[\n' + rows + "\n]}" if issues else ',"issues":[]}')


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", help="owner/name (default: the current repo)")
    ap.add_argument("--milestone", help="exact milestone title (default: newest open 'Plan:' milestone)")
    ap.add_argument("--max-running", type=int, default=2, help="concurrency cap across all machines (default 2)")
    ap.add_argument("--from-json", help="read {milestones, issues} from a file instead of gh (for tests)")
    ap.add_argument("--full", action="store_true",
                    help="print every issue (closed ones too) with its url, indented; the default is compact")
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
    if args.full:
        print(json.dumps(result, indent=2))
    else:
        print(compact(result))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
