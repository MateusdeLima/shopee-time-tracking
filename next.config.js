/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: true,
    parallelServerCompiles: true,
    parallelServerBuildTraces: true,
  },
  
  // Otimizações para build (swcMinify é padrão no Next.js 15)
  
  // Configurações de imagem
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  
  // Configurações de bundle
  webpack: (config, { isServer }) => {
    // Otimizações para reduzir bundle size
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      }
    }
    
    return config
  },
  
  // Configurações de output
  output: 'standalone',
  
  // Configurações de build
  generateBuildId: async () => {
    return 'shopee-time-tracking-build'
  },
  
  // Configurações de headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
