/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
  // Suppress noisy "punycode" deprecation warning from jose/node internals
  webpack(config) {
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ },
    ];
    return config;
  },
};

export default nextConfig;
