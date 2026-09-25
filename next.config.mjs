/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "googleapis",
      "bonjour-service",
    ],
  },
};

export default nextConfig;
