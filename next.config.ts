import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  basePath: '/six-degrees',
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
