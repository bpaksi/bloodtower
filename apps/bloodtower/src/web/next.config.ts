import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export: the bloodtower server serves ./out. There is no Next.js runtime in production.
  output: "export",
  transpilePackages: ["bloodtower-protocols", "@talking-avatar/player", "@talking-avatar/formats"],
  // iPad on the LAN opens next dev by IPv4; allow private-range hostnames for HMR (Next 16+).
  allowedDevOrigins: [
    "10.*.*.*",
    "192.168.*.*",
    "172.16.*.*",
    "172.17.*.*",
    "172.18.*.*",
    "172.19.*.*",
    "172.20.*.*",
    "172.21.*.*",
    "172.22.*.*",
    "172.23.*.*",
    "172.24.*.*",
    "172.25.*.*",
    "172.26.*.*",
    "172.27.*.*",
    "172.28.*.*",
    "172.29.*.*",
    "172.30.*.*",
    "172.31.*.*",
    "169.254.*.*",
  ],
  // Agent guidance for this repo lives in the root CLAUDE.md, so skip the generated AGENTS.md.
  agentRules: false,
};

export default config;
