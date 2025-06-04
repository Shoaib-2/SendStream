/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_STRIPE_PRICE_ID: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        module: false,
      };
    }
    
    // Add support for mjs files
    config.module.rules.push({
      test: /\.m?js$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false
      }
    });

    // Add support for recharts
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        canvas: 'canvas',
      });
    }

    // Resolve .js extensions for TypeScript files
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx']
    };

    // Optimize module resolution
    config.resolve.modules = ['node_modules', ...config.resolve.modules];

    return config;
  }
};

module.exports = nextConfig;