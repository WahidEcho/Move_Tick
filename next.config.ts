import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client router cache: reuse a visited dynamic page for 30s instead of
    // refetching on every back/forward or repeat navigation.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  images: {
    // Event cover images live in Supabase Storage; allow next/image to
    // optimize them (responsive sizes + WebP/AVIF).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
