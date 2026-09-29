/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Serves Firebase's auth handler from our own origin so signInWithRedirect
  // works in browsers that block third-party storage (Chrome, Safari, Firefox).
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
