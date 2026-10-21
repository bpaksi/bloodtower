# Prototypes (`prototypes`)

| | |
|---|---|
| Purpose | Throwaway prototypes that prove the saga game's design before Bloodtower builds it: the Story board layouts, a day's turn loop, and each set-piece type |
| Phase | Explore |
| SDLC tier | Experiment |
| Status | Intent written (0001). Plan approved 2026-10-21: [plans/plan.md](plans/plan.md) |
| Disposable? | Yes. Each prototype can be deleted on its own; what it teaches goes back into the design cards |

Each prototype is a page in the browser on the Mac, or on the TV when the test is about the TV. Its controls are on the same page (mouse and keyboard). An iPad is used only when a test needs touch. A prototype about the tower talks to the tower-poc sidecar (port 4747) with `command{capabilityId, params}`, and never sends raw bytes.
