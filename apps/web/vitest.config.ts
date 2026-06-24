import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Configuración mínima de Vitest para el panel web.
 *
 * - environment 'node': los tests actuales cubren lógica pura (fechas, socket
 *   singleton, helpers de notificaciones). No requieren DOM; si algún test futuro
 *   lo necesita, cámbielo a 'jsdom' y añada la devDep `jsdom`.
 * - alias '@/' → './src/': replica el path mapping de tsconfig.json
 *   ("paths": { "@/*": ["./src/*"] }) sin depender de un plugin extra.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
