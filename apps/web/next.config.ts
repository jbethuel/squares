import type { NextConfig } from "next";

// ADR 0002: no backend. The app is a static export served as files and
// installed as a PWA; nothing here may introduce a server runtime.
const nextConfig: NextConfig = {
  output: "export",
  // The rules ship as TypeScript source rather than a build step, so Next
  // compiles them the same way it compiles this app.
  transpilePackages: ["@squares/domain"],
  reactStrictMode: true,
  images: { unoptimized: true },
};

export default nextConfig;
