import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // 在服务端构建时，忽略 longport 原生模块
    if (isServer) {
      config.externals.push('longport');
    }

    return config;
  },
} satisfies NextConfig;

export default nextConfig;
