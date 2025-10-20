import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Default to LiveKit for video calls
    NEXT_PUBLIC_VC_PROVIDER: process.env.NEXT_PUBLIC_VC_PROVIDER || 'livekit',
  },
};

export default nextConfig;
