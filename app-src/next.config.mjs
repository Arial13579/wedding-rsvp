/** Static export for GitHub Pages (https://arial13579.github.io/wedding-rsvp). */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/wedding-rsvp';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default nextConfig;
