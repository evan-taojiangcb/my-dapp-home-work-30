import "@my-dapp-home-work-30/env/web";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
};

export default nextConfig;

initOpenNextCloudflareForDev();
