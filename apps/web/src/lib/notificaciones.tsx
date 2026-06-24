'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  WS_EVENTS,
  type AlertaLlegadaPayload,
  type IncidenciaReportadaPayload,
} from '@flotaos/shared-types';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from '@/components/ui/sonner';
import type { NotificacionLlegada } from '@/components/tracking/tipos';

const STORAGE_KEY = 'flotaos.notif.llegadas';
const MAX_NOTIFS = 50;

/** Título corto de una notificación de llegada (compartido por toast y campana). */
export function tituloLlegada(n: {
  folio: number | null;
  escalaOrden: number | null;
  esDestino: boolean;
}): string {
  const viaje = n.folio != null ? `Viaje #${n.folio}` : 'Un viaje';
  if (n.esDestino) return `${viaje} llegó a su destino`;
  if (n.escalaOrden != null) return `${viaje} llegó a la parada ${n.escalaOrden + 1}`;
  return `${viaje} llegó a una parada`;
}

/** Construye una notificación a partir del payload WS / del historial. */
function aNotificacion(
  p: AlertaLlegadaPayload,
  recibidaEn: string,
  leida: boolean,
): NotificacionLlegada {
  // ID estable por arribo (una escala se notifica una sola vez): así un evento
  // en vivo y su entrada de historial comparten id y no se duplican.
  return {
    id: `${p.viajeId}-${p.escalaOrden}`,
    viajeId: p.viajeId,
    folio: p.folio,
    escalaOrden: p.escalaOrden,
    escalaDireccion: p.escalaDireccion,
    esDestino: p.esDestino,
    recibidaEn,
    leida,
  };
}

/** Une dos listas por id (las `actuales` ganan), ordena por recencia y acota. */
function mezclar(
  actuales: NotificacionLlegada[],
  extra: NotificacionLlegada[],
): NotificacionLlegada[] {
  const ids = new Set(actuales.map((n) => n.id));
  const nuevos = extra.filter((n) => !ids.has(n.id));
  return [...actuales, ...nuevos]
    .sort((a, b) => (a.recibidaEn < b.recibidaEn ? 1 : -1))
    .slice(0, MAX_NOTIFS);
}

type PermisoEscritorio = 'default' | 'granted' | 'denied' | 'no-soportado';

interface NotificacionesContextValue {
  notificaciones: NotificacionLlegada[];
  noLeidas: number;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
  limpiar: () => void;
  permisoEscritorio: PermisoEscritorio;
  activarEscritorio: () => void;
}

const NotificacionesContext = createContext<NotificacionesContextValue | null>(null);

function leerStorage(): NotificacionLlegada[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Saneo mínimo: descarta entradas sin id/viajeId válidos (datos viejos).
    return (parsed as NotificacionLlegada[])
      .filter((n) => n && typeof n.id === 'string' && typeof n.viajeId === 'string')
      .slice(0, MAX_NOTIFS);
  } catch {
    return [];
  }
}

function permisoActual(): PermisoEscritorio {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'no-soportado';
  }
  return Notification.permission as PermisoEscritorio;
}

/**
 * Proveedor global de notificaciones de llegada. Se monta una sola vez en el
 * layout del panel: hidrata el historial reciente desde el backend, escucha el
 * evento WS 'alerta' (geocerca) en la sala de admin, acumula las notificaciones
 * (persistidas en localStorage), avisa con un toast + notificación de escritorio,
 * y refresca las queries afectadas.
 */
export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [notificaciones, setNotificaciones] = useState<NotificacionLlegada[]>([]);
  const [permisoEscritorio, setPermisoEscritorio] =
    useState<PermisoEscritorio>('default');
  const permisoRef = useRef<PermisoEscritorio>('default');

  // Hidrata: 1) localStorage (sync), 2) historial del backend (merge).
  useEffect(() => {
    setNotificaciones(leerStorage());
    const p = permisoActual();
    permisoRef.current = p;
    setPermisoEscritorio(p);

    let cancelado = false;
    api
      .get<AlertaLlegadaPayload[]>('/viajes/llegadas/recientes')
      .then(({ data }) => {
        if (cancelado || !Array.isArray(data)) return;
        const historicos = data.map((p) => aNotificacion(p, p.detectadoEn, true));
        setNotificaciones((prev) => mezclar(prev, historicos));
      })
      .catch(() => {
        /* sin historial (offline / sin permiso): se ignora */
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Persiste los cambios.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notificaciones));
    } catch {
      /* cuota llena o storage deshabilitado: se ignora */
    }
  }, [notificaciones]);

  // Escucha global del evento de llegada (sala admin; ver TrackingGateway).
  useEffect(() => {
    const socket = getSocket();

    const onAlerta = (p: AlertaLlegadaPayload) => {
      if (!p || p.tipo !== 'llegada_escala' || !p.viajeId) return;

      const notif = aNotificacion(p, new Date().toISOString(), false);
      setNotificaciones((prev) =>
        prev.some((n) => n.id === notif.id)
          ? prev
          : [notif, ...prev].slice(0, MAX_NOTIFS),
      );

      const titulo = tituloLlegada(notif);
      const cuerpo = notif.escalaDireccion ?? undefined;
      if (notif.esDestino) {
        toast.success(titulo, { description: cuerpo });
      } else {
        toast.info(titulo, { description: cuerpo });
      }

      if (
        permisoRef.current === 'granted' &&
        typeof window !== 'undefined' &&
        'Notification' in window
      ) {
        try {
          new Notification(titulo, { body: cuerpo, tag: notif.id });
        } catch {
          /* algunos navegadores requieren Service Worker: se ignora */
        }
      }

      // Refresca solo lo que depende de la llegada: el detalle del viaje y el
      // mapa de activos. NO el listado ['viajes'] (una llegada no cambia lo que
      // muestra la lista y forzaría un refetch innecesario del listado pesado).
      void queryClient.invalidateQueries({ queryKey: ['viaje', p.viajeId] });
      void queryClient.invalidateQueries({ queryKey: ['tracking', 'viajes-activos'] });
    };

    const onIncidencia = (p: IncidenciaReportadaPayload) => {
      if (!p || !p.viajeId) return;
      // Pánico/SOS o gravedad CRÍTICA = emergencia: resalta en rojo y usa toast
      // de error (más persistente) en vez del warning ámbar de un aviso normal.
      const critica = p.tipo === 'PANICO' || p.gravedad?.toUpperCase() === 'CRITICA';
      const notif: NotificacionLlegada = {
        id: `inc-${p.viajeId}-${p.reportadoEn}`,
        kind: 'incidencia',
        viajeId: p.viajeId,
        folio: p.folio,
        escalaOrden: null,
        escalaDireccion: p.descripcion ?? p.conductorNombre ?? null,
        esDestino: false,
        titulo: p.titulo,
        gravedad: p.gravedad,
        critica,
        recibidaEn: new Date().toISOString(),
        leida: false,
      };
      setNotificaciones((prev) =>
        prev.some((n) => n.id === notif.id)
          ? prev
          : [notif, ...prev].slice(0, MAX_NOTIFS),
      );
      const descripcion =
        p.descripcion ?? (p.varado ? 'El viaje quedó varado' : undefined);
      if (critica) {
        toast.error(p.titulo, { description: descripcion, duration: 15_000 });
      } else {
        toast.warning(p.titulo, { description: descripcion });
      }
      if (
        permisoRef.current === 'granted' &&
        typeof window !== 'undefined' &&
        'Notification' in window
      ) {
        try {
          new Notification(p.titulo, { body: p.descripcion ?? undefined, tag: notif.id });
        } catch {
          /* requiere Service Worker en algunos navegadores: se ignora */
        }
      }
      void queryClient.invalidateQueries({ queryKey: ['viaje', p.viajeId] });
      void queryClient.invalidateQueries({ queryKey: ['tracking', 'viajes-activos'] });
    };

    socket.on(WS_EVENTS.ALERTA, onAlerta);
    socket.on(WS_EVENTS.INCIDENCIA_REPORTADA, onIncidencia);
    return () => {
      socket.off(WS_EVENTS.ALERTA, onAlerta);
      socket.off(WS_EVENTS.INCIDENCIA_REPORTADA, onIncidencia);
    };
  }, [queryClient]);

  const marcarLeida = useCallback((id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id && !n.leida ? { ...n, leida: true } : n)),
    );
  }, []);

  const marcarTodasLeidas = useCallback(() => {
    setNotificaciones((prev) =>
      prev.some((n) => !n.leida) ? prev.map((n) => ({ ...n, leida: true })) : prev,
    );
  }, []);

  const limpiar = useCallback(() => setNotificaciones([]), []);

  const activarEscritorio = useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    void Notification.requestPermission().then((res) => {
      const p = res as PermisoEscritorio;
      permisoRef.current = p;
      setPermisoEscritorio(p);
    });
  }, []);

  const noLeidas = useMemo(
    () => notificaciones.filter((n) => !n.leida).length,
    [notificaciones],
  );

  const value = useMemo<NotificacionesContextValue>(
    () => ({
      notificaciones,
      noLeidas,
      marcarLeida,
      marcarTodasLeidas,
      limpiar,
      permisoEscritorio,
      activarEscritorio,
    }),
    [
      notificaciones,
      noLeidas,
      marcarLeida,
      marcarTodasLeidas,
      limpiar,
      permisoEscritorio,
      activarEscritorio,
    ],
  );

  return (
    <NotificacionesContext.Provider value={value}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones(): NotificacionesContextValue {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) {
    throw new Error('useNotificaciones debe usarse dentro de <NotificacionesProvider>');
  }
  return ctx;
}
