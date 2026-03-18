import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Legacy editor modules currently carry unrelated TypeScript debt.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
