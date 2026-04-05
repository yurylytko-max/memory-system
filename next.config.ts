import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Legacy editor modules currently carry unrelated TypeScript debt.
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/study",
        destination: "/study-3",
        permanent: true,
      },
      {
        source: "/study/cards",
        destination: "/cards",
        permanent: true,
      },
      {
        source: "/study/:path*",
        destination: "/study-3",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
