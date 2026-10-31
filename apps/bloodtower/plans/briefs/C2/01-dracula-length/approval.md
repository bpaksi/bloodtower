# Approval: C2 / 01-dracula-length

| Item | Approved by | When (America/Detroit) | Chat link | Version (commit sha of file) |
|------|-------------|------------------------|-----------|------------------------------|
| eval.md | Bob Paksi | 2026-10-31 19:40 | Approved EV-05 scoped to Dracula pack in chat | 925bee42 |
| mockup.html | n/a | | | no mockup: no screen change |

Bob approved all ten C2 folders at once in chat, assumptions included ("Bob: OK?" lines in each eval.md). Any later edit to eval.md or mockup.html needs a new row.

Superseded 2026-10-31: Bob ruled at 7:28 PM ET (relayed by Wright) that Dracula keeps the live skip (Choose goes straight to "Not playable yet", no Game settings screen); the YAML cut stays (Short and Standard, default Standard, Long removed). EV-02 and EV-06 were rewritten. Bob Paksi approved the revised eval.md at 7:32 PM ET.

Also revised 2026-10-31: EV-05 now checks only `packs/dracula/pack.yaml` (no Long length; lengths exactly Short and Standard) instead of grepping all e2e specs, since legit Long hits remain in `w3-pick-story.spec.ts` (EV-02 absence check) and `opening-screens.spec.ts` (Proving Grounds, EV-03). Bob Paksi approved this at 7:40 PM ET.
