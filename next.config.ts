import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,  // All images served as-is (no Next.js optimization)
  },
  transpilePackages: ['leaflet', 'react-leaflet'],
  /* TypeScript: strict mode — do not ignore build errors */
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  /* Rewrite /uploads/* to /api/uploads/* so uploaded images are served
     from /app/uploads/ (outside public/) via the API handler */
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
  headers: async () => [
    {
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
    {
      source: '/manifest.json',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400' },
      ],
    },
  ],
};

export default nextConfig;