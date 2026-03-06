import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "export", // disabled - API routes need server
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
