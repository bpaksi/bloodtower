/**
 * `pnpm graph <command>`: reads the game's cards from the terminal. Run by Node's type stripping,
 * so this file and everything it reaches use erasable TypeScript only and never import `next`
 * or a .tsx file.
 */
import { gapsText } from "../lib/gaps.ts";
import { findText, showText } from "../lib/show.ts";

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "gaps":
    console.log(gapsText());
    break;
  case "show": {
    const text = rest[0] ? showText(rest[0]) : null;
    if (text === null) {
      console.error(
        rest[0] ? `graph show: no card or document ID ${rest[0]}` : "usage: pnpm graph show <ID>",
      );
      process.exitCode = 1;
    } else console.log(text);
    break;
  }
  case "find":
    if (rest.length === 0) {
      console.error("usage: pnpm graph find <words>");
      process.exitCode = 1;
    } else console.log(findText(rest.join(" ")));
    break;
  default:
    console.error("usage: pnpm graph gaps | show <ID> | find <words>");
    process.exitCode = command ? 1 : 0;
}
