
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.imgur.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ibb.co',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https',
        hostname: 'i.meee.com.tw',
        port: '',
        pathname: '/**',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/students-template.csv',
        destination: '/api/download-template',
      },
       {
        source: '/buke-template.csv',
        destination: '/api/download-buke-template',
      }
    ]
  },
};

export default nextConfig;
