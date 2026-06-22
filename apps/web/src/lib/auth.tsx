'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { closeSocket } from './socket';

/** Usuario autenticado del panel (vista pública que devuelve GET /auth/me). */
export interface AuthUser {
  id: string;
  nombre: string;
  email?: string;
  type: string;
  /** Rol del panel. Solo presente para admins (type === 'admin'). */
  rol?: 'ADMIN' | 'MONITORISTA';
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // La sesión vive en cookies httpOnly; preguntamos al backend quién somos.
    // El interceptor de api intentará refrescar si el access token expiró.
    api
      .get<AuthUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { data } = await api.post<{ user: AuthUser }>('/auth/login', {
      email,
      password,
    });
    setUser(data.user);
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => undefined);
    // Cierra el socket de tracking: con la cookie ya invalidada, el singleton
    // global reintentaría conectar en bucle (el gateway lo rechaza). Forzar un
    // handshake nuevo en el próximo login.
    closeSocket();
    setUser(null);
    router.push('/login');
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

/** True si el usuario actual es monitorista (acceso de solo lectura a gestión). */
export function useSoloLectura() {
  const { user } = useAuth();
  return user?.rol === 'MONITORISTA';
}
