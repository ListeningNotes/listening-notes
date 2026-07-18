/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the dev server's hot-reload connection work when opened from a phone
  // or another computer on the LAN via this Mac's IP, not just localhost.
  // Next.js blocks it by default; update this if the Mac's LAN IP changes.
  allowedDevOrigins: ['192.168.1.154'],
};

export default nextConfig;
