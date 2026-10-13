import type { NextConfig } from "next";

const config: NextConfig = {
  // Static export: the tower server serves ./out, so there is no Next.js runtime in production.
  output: "export",
  transpilePackages: ["tower-poc-protocols"],
};

export default config;
