import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@atlas/ui", "@atlas/sdk", "@atlas/config"]
};

export default nextConfig;
