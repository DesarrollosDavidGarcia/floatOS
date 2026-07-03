/**
 * Cabeceras de seguridad aplicadas por Next a todas las rutas (defensa en
 * profundidad; Nginx/Traefik pueden reforzar en el borde, pero no se depende de
 * ello). HSTS solo tiene efecto servido por HTTPS; es inocuo en HTTP.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // No divulgar el framework/versión (reconocimiento).
  poweredByHeader: false,
  transpilePackages: ['@flotaos/shared-types'],
  // ESLint cuenta en el build: `next lint` pasa con 0 errores (solo quedan
  // warnings, que no rompen el build). Si en el futuro un error de lint debe
  // tolerarse temporalmente, prefiérase un disable puntual y justificado.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
