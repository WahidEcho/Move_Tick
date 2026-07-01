import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
