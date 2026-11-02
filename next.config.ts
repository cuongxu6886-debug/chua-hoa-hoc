import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dự án không cài ESLint; bỏ qua bước lint khi build để không bị báo lỗi thiếu ESLint
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
