import { runImportCli } from "./cli.ts";

process.exitCode = runImportCli(process.argv.slice(2), {
  env: process.env,
  cwd: process.env.INIT_CWD ?? process.cwd(),
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
});
