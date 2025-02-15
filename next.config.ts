import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 在服务端构建时，忽略 longport 原生模块
    if (isServer) {
      config.externals.push('longport');
    }

    return config;
  },
};

export default nextConfig;
