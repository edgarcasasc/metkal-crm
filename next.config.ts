import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // ¡Aquí ya NO ponemos eslint!
};

export default nextConfig;