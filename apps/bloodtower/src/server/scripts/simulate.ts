import { formatSimReport } from "../../engine/sim/report.ts";
import { simulateBatch as runBatch } from "../../engine/sim/runner.ts";

const parseArgs = () => {
  const args = process.argv.slice(2);
  let games = 1;
  let days = 1;
  let seed = "s";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--games" && args[i + 1]) {
      games = Number(args[++i]);
    } else if (arg === "--days" && args[i + 1]) {
      days = Number(args[++i]);
    } else if (arg === "--seed" && args[i + 1]) {
      seed = args[++i] ?? seed;
    }
  }
  if (!Number.isInteger(games) || games < 1) throw new Error("--games must be a positive integer.");
  if (!Number.isInteger(days) || days < 1) throw new Error("--days must be a positive integer.");
  return { games, days, seed };
};

const main = () => {
  const { games, days, seed } = parseArgs();
  const results = runBatch(games, days, seed);
  const sampleCount = games <= 3 ? games : 1;
  process.stdout.write(`${formatSimReport(results, sampleCount)}\n`);
};

main();
