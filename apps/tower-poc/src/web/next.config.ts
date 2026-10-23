import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export: the tower server serves ./out, so there is no Next.js runtime in production.
  output: "export",
  transpilePackages: ["@dark-tower/tower"],
  // Agent guidance for this repo lives in the root CLAUDE.md, so skip the generated AGENTS.md.
  agentRules: false,
};

export default config;
