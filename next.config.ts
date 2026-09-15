import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless", "ws"],
  outputFileTracingIncludes: {
    "/api/download/apk": ["./public/fanoos-1.4.apk", "./public/fanoos.apk"],
  },
  async redirects() {
    return [
      { source: "/download", destination: "/download.html", permanent: false },
      { source: "/app", destination: "/download.html", permanent: false },
      { source: "/install", destination: "/download.html", permanent: false },
    ];
  },
  async headers() {
    const apk = [
      { key: "Content-Type", value: "application/vnd.android.package-archive" },
      { key: "Content-Disposition", value: 'attachment; filename="fanoos.apk"' },
      { key: "Cache-Control", value: "public, max-age=120" },
    ];
    const zip = [
      { key: "Content-Type", value: "application/zip" },
      { key: "Content-Disposition", value: 'attachment; filename="fanoos-printer.zip"' },
      { key: "Cache-Control", value: "public, max-age=120" },
    ];
    return [
      { source: "/fanoos.apk", headers: apk },
      { source: "/fanoos-1.4.apk", headers: apk },
      { source: "/fanoos-1.5.apk", headers: apk },
      { source: "/fanoos-printer.zip", headers: zip },
      {
        source: "/:path*",
        headers: [{ key: "Permissions-Policy", value: "local-network-access=(self)" }],
      },
    ];
  },
};

export default nextConfig;
