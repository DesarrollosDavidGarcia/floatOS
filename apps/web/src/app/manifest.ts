import type { MetadataRoute } from 'next';

// Servido automáticamente por Next.js en /manifest.webmanifest
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FlotaOS — Panel',
    short_name: 'FlotaOS',
    description: 'Panel de administración y monitoreo de FlotaOS',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // Sin bloqueo de orientación: el panel con mapas se usa también en landscape.
    background_color: '#0f172a',
    theme_color: '#0f172a',
    lang: 'es',
    dir: 'ltr',
    categories: ['business', 'productivity', 'navigation'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
