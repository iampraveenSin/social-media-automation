import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "heic-convert", "heic-decode"],
};

export default nextConfig;
