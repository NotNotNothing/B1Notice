import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: 'standalone',

  // 禁用 Turbopack，使用 Webpack（解决 pnpm 符号链接问题）
  // Turbopack 配置已注释 - 在 Next.js 16 中默认启用，但我们禁用它
  // turbopack: {
  //   root: process.cwd(),
  // },

  // 保留 webpack 配置作为后备，用于处理特殊模块
  webpack: (config, { isServer }) => {
    // 解决 pnpm 符号链接问题
    config.resolve.symlinks = true;

    // 添加 @tanstack 包的模块解析
    const path = require('path');
    const tanstackPath = path.resolve(__dirname, 'node_modules/@tanstack');
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    config.resolve.alias['@tanstack/react-table'] = path.join(tanstackPath, 'react-table');

    // 修复 @tanstack/react-table 的 ES 模块解析问题
    // 确保正确处理 ES 模块格式
    config.module.rules.push({
      test: /@tanstack\/.*\.js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    if (isServer) {
      // 在服务端外部化 longport 模块 - 在构建环境中避免加载问题
      config.externals.push({
        'longport': 'commonjs longport',
      });

      // 在 Docker 构建环境中，进一步外部化可能有问题的模块
      if (process.env.NODE_ENV === 'production') {
        config.externals.push({
          '@prisma/client': 'commonjs @prisma/client',
        });
      }

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
  serverExternalPackages: ['longport', '@tanstack/react-table'],
};

export default nextConfig;
