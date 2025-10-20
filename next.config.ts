import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Default to LiveKit for video calls
    NEXT_PUBLIC_VC_PROVIDER: process.env.NEXT_PUBLIC_VC_PROVIDER || 'livekit',
  },
  // Fix workspace root detection for Vercel
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
