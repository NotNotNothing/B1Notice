import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: 'standalone',

  // Turbopack 配置 - Next.js 16 中默认启用
  turbopack: {
    // 设置工作空间根目录以避免警告
    root: process.cwd(),
  },

  // 保留 webpack 配置作为后备，用于处理特殊模块
  webpack: (config, { isServer }) => {
    if (isServer) {
      // 在服务端外部化 longport 模块
      config.externals.push({
        'longport': 'commonjs longport',
      });

      // 处理原生 Node.js 模块
      config.resolve.extensions.push('.node');

      // 配置 .node 文件的处理
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader',
      });
    }

    return config;
  },

  // Next.js 16 中，直接在根级别指定 serverExternalPackages
  serverExternalPackages: ['longport'],
};

export default nextConfig;
