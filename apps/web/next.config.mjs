/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the shared workspace package so it works without a build step.
  transpilePackages: ['@ama/shared-types'],
  // Keep stack traces out of responses in production.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
