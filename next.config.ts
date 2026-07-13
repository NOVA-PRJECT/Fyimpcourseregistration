import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

// In production, remove 'unsafe-eval' (only needed for HMR/Turbopack in dev).
// 'unsafe-inline' is kept for scripts because Next.js injects inline bootstrap
// scripts for hydration; replace with nonce-based CSP for full hardening.
const scriptSrc = isDev
  ? "'self' 'unsafe-eval' 'unsafe-inline' https://*.supabase.co https://*.supabase.in"
  : "'self' 'unsafe-inline' https://*.supabase.co https://*.supabase.in"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/login',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in; img-src 'self' data: https://*.supabase.co https://*.supabase.in; frame-ancestors 'none';`,
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

