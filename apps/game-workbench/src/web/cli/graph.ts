/**
 * `pnpm graph <command>`: reads the game's cards from the terminal. Run by Node's type stripping,
 * so this file and everything it reaches use erasable TypeScript only and never import `next`
 * or a .tsx file.
 */
import { gapsText } from "../lib/gaps.ts";

const [command] = process.argv.slice(2);

switch (command) {
  case "gaps":
    console.log(gapsText());
    break;
  case "show":
  case "find":
    console.log(`graph ${command}: not yet`);
    break;
  default:
    console.error("usage: pnpm graph gaps | show <ID> | find <words>");
    process.exitCode = command ? 1 : 0;
}
