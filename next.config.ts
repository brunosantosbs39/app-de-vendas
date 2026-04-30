import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Accept dev requests from the Cloudflare Quick Tunnel domain
  // so Server Actions / asset fetches aren't blocked as cross-origin.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
