import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 95],
  },
  async redirects() {
    return [
      // The public teardown of the assistant was removed on 2026-09-13 (owner
      // decision: chat only, no internals). Old links land on the homepage.
      { source: "/how-it-works", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
