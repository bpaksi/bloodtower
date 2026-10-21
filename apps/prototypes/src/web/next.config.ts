import type { NextConfig } from "next";

const config: NextConfig = {
  // Agent guidance for this repo lives in the root CLAUDE.md, so skip the generated AGENTS.md.
  agentRules: false,
};

export default config;
