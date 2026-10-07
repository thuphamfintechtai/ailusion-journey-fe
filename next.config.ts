import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Emit a minimal self-contained server in .next/standalone (used by the Dockerfile).
  output: "standalone",
  images: {
    // Ảnh điểm đến lấy từ Wikimedia Commons (giấy phép CC, xem src/lib/destinations.ts).
    remotePatterns: [
      new URL("https://thumb.wikimedia.org/wikipedia/commons/thumb/**"),
    ],
  },
}

export default nextConfig
