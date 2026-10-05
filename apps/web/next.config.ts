import type { NextConfig } from "next";

// Static export: the same `out/` folder is deployed to any static host and bundled
// into the Android app for offline use.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@wm/core"],
  reactStrictMode: true,
};

export default config;
