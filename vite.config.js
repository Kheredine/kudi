import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],

  // Security headers (applied in dev; for production, configure your hosting)
  server: {
    headers: {
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      // Enable browser XSS protection
      'X-XSS-Protection': '1; mode=block',
      // Control referrer information
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      // Restrict permissions (camera, microphone, geolocation)
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      // Content Security Policy - restrict resource loading
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Vite HMR in dev
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self'",
        "connect-src 'self' https://*.supabase.co https://api.openai.com",
        "frame-ancestors 'none'",
      ].join('; '),
      // Strict Transport Security (requires HTTPS in production)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    },
  },

  // Strip console.* and debugger statements in production builds
  esbuild: {
    drop: ['console', 'debugger'],
  },

  build: {
    // Do NOT deploy source maps to production
    sourcemap: false,
  },
})