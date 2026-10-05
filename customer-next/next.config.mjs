/** @type {import('next').NextConfig} */
const backend = process.env.BACKEND_URL || 'http://localhost:8000'

const nextConfig = {
  // Same job as the proxy block in the Vite config: the contact form posts to
  // /adminpanel/contact/ on this origin, and Next forwards it to Django.
  async rewrites() {
    return [{ source: '/adminpanel/:path*', destination: `${backend}/adminpanel/:path*` }]
  },
}

export default nextConfig
