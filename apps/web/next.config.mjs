/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@flotaos/shared-types'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
