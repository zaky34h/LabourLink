import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to THIS folder. The repo root has its own
  // (Expo) lockfile; without this, Next.js infers the parent as the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
