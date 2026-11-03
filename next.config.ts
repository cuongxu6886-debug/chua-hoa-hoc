import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dự án không cài ESLint; bỏ qua bước lint khi build để không bị báo lỗi thiếu ESLint
  eslint: { ignoreDuringBuilds: true },
  // Giọng đọc tiếng Việt (app/api/doc) dùng thư viện chạy trên máy chủ, không gói vào bundle
  serverExternalPackages: ["msedge-tts"],
};

export default nextConfig;
