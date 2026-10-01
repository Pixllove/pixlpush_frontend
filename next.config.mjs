/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serves Firebase's auth handler from our own origin so signInWithRedirect
  // works in browsers that block third-party storage (Chrome, Safari, Firefox).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // SAMEORIGIN, not DENY: Firebase's sign-in helper is framed from /__/ on this origin.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Production only: on a dev machine it would pin every localhost port to https.
          ...(process.env.NODE_ENV === 'production'
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
            : []),
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/__/:path*',
        destination: `https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}/__/:path*`,
      },
    ];
  },
};
export default nextConfig;
