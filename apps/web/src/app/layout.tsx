import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { Providers } from './providers';
import { RegisterSW } from '@/components/pwa/register-sw';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FlotaOS — Panel',
  description: 'Panel de administración y monitoreo de FlotaOS',
  applicationName: 'FlotaOS',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    // 'default' evita que el contenido quede bajo la barra de estado/notch en
    // iOS instalado (no hay safe-area-inset en el layout del panel).
    statusBarStyle: 'default',
    title: 'FlotaOS',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <RegisterSW />
      </body>
    </html>
  );
}
