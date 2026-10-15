import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export: the bloodtower server serves ./out. There is no Next.js runtime in production.
  output: "export",
  transpilePackages: ["bloodtower-protocols"],
  // Agent guidance for this repo lives in the root CLAUDE.md, so skip the generated AGENTS.md.
  agentRules: false,
};

export default config;
