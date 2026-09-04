import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project. Without this, Next's root
  // inference can walk up into the user's home directory if a stray
  // package.json/lockfile happens to live there, which breaks the build.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
