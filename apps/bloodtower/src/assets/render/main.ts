import { runRender } from "./cli.ts";

process.exitCode = await runRender(process.argv.slice(2), {
  env: process.env,
  cwd: process.env.INIT_CWD ?? process.cwd(),
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
});
