import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export: the funeral server serves ./out. There is no Next.js runtime in production.
  output: "export",
  transpilePackages: ["burgomaster-funeral-poc-protocols"],
  // Agent guidance for this repo lives in the root CLAUDE.md, so skip the generated AGENTS.md.
  agentRules: false,
};

export default config;
