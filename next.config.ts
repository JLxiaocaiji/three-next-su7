import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],

  // 1. 输出模式（必选）
  output: 'standalone',

  // 2. 打包器：Turbopack（默认）
  // 如需回退 webpack：添加 --webpack

  // 3. 压缩与优化
  compress: true,           // 开启 Brotli/Gzip
  productionBrowserSourceMaps: false, // 关 SourceMap（减体积）

  // 4. 代码分割 & 依赖打包
  serverExternalPackages: [], // 服务端不打包的大依赖（如 pdfkit）

  // 5. 实验性（Next 16+ 推荐）
  experimental: {
    turbopackFileSystemCacheForBuild: true, // 持久化缓存
    inlineCss: true,            // 关键 CSS 内联（首屏加速）
    globalNotFound: true,       // 404 页面所需的全局样式
  },

  // 6. 图片优化（减少打包体积）
  images: {
    formats: ['image/avif', 'image/webp'], // 现代格式
    deviceSizes: [640, 750, 1080, 1200],   // 按需尺寸
  },
};

export default nextConfig;
