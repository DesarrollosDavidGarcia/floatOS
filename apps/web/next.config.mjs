/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@flotaos/shared-types'],
  // ESLint cuenta en el build: `next lint` pasa con 0 errores (solo quedan
  // warnings, que no rompen el build). Si en el futuro un error de lint debe
  // tolerarse temporalmente, prefiérase un disable puntual y justificado.
};

export default nextConfig;
