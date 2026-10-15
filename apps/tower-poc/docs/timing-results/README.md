# Timing results

`pnpm timing` (from `apps/tower-poc`) saves a file here when Bob presses Save results on http://localhost:3000/timing.

The name is `timing-<UTC timestamp>.json`. Times inside are milliseconds since the epoch, UTC. A time the tower did not give is `null`, never `0`. `notes` is Bob's own text, and is present even when he left it empty. `savedAt` is when the service wrote the file.

Nothing in this folder is required for the app to start. A run with the tower in front of you creates the file.
