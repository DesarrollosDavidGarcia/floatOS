'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Paperclip, Send, X } from 'lucide-react';
import { WS_EVENTS, type MensajeChatPayload } from '@flotaos/shared-types';
import { api, apiError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const TIPOS_OK = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

/** Inserta un mensaje al final de la cache del chat, evitando duplicados. */
function agregarMensaje(
  qc: ReturnType<typeof useQueryClient>,
  viajeId: string,
  msg: MensajeChatPayload,
) {
  qc.setQueryData<MensajeChatPayload[]>(['chat', viajeId], (prev) => {
    const lista = prev ?? [];
    if (lista.some((m) => m.id === msg.id)) return lista;
    return [...lista, msg];
  });
}

/**
 * Antepone una página de mensajes más antiguos a la cache, evitando duplicados
 * y preservando el orden ascendente (viejos→nuevos).
 */
function anteponerMensajes(
  qc: ReturnType<typeof useQueryClient>,
  viajeId: string,
  pagina: MensajeChatPayload[],
) {
  qc.setQueryData<MensajeChatPayload[]>(['chat', viajeId], (prev) => {
    const lista = prev ?? [];
    const existentes = new Set(lista.map((m) => m.id));
    const nuevos = pagina.filter((m) => !existentes.has(m.id));
    return [...nuevos, ...lista];
  });
}

export function ChatViaje({ viajeId }: { viajeId: string }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Paginación del histórico: ¿hay mensajes más antiguos por cargar?
  const [hayMas, setHayMas] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);
  const finRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Id del último mensaje "visto" abajo, para autoscroll solo en mensajes nuevos
  // (no al anteponer histórico).
  const ultimoIdRef = useRef<string | null>(null);

  // Carga inicial: la página MÁS RECIENTE. La metadata de paginación viaja en
  // cabeceras (X-Chat-Has-More / X-Chat-Next-Cursor) para no romper el contrato
  // del array que esperan otros clientes.
  const { data: mensajes } = useQuery({
    queryKey: ['chat', viajeId],
    queryFn: async () => {
      const res = await api.get<MensajeChatPayload[]>(
        `/viajes/${viajeId}/chat`,
      );
      setHayMas(res.headers['x-chat-has-more'] === 'true');
      return res.data;
    },
  });

  // Carga la página de mensajes anteriores usando como cursor el id del mensaje
  // más antiguo ya cargado. Preserva la posición de scroll del usuario.
  async function cargarMas() {
    const lista = qc.getQueryData<MensajeChatPayload[]>(['chat', viajeId]);
    const cursor = lista?.[0]?.id;
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    const cont = scrollRef.current;
    const alturaPrevia = cont?.scrollHeight ?? 0;
    try {
      const res = await api.get<MensajeChatPayload[]>(
        `/viajes/${viajeId}/chat`,
        { params: { cursor } },
      );
      anteponerMensajes(qc, viajeId, res.data);
      setHayMas(res.headers['x-chat-has-more'] === 'true');
      // Mantiene la vista anclada tras anteponer (compensa el alto añadido).
      requestAnimationFrame(() => {
        if (cont) cont.scrollTop += cont.scrollHeight - alturaPrevia;
      });
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setCargandoMas(false);
    }
  }

  // Marca leídos los mensajes del conductor y refresca el contador de la campana.
  const marcarLeido = () => {
    api
      .post(`/viajes/${viajeId}/chat/leer`)
      .then(() => qc.invalidateQueries({ queryKey: ['chat-no-leidos'] }))
      .catch(() => undefined);
  };

  // Al abrir el chat: marca como leído lo pendiente de este viaje.
  useEffect(() => {
    marcarLeido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viajeId]);

  // Tiempo real: la suscripción a la sala `viaje:<id>` la mantiene el detalle del
  // viaje (useViajeEnVivo); aquí solo escuchamos los mensajes nuevos.
  useEffect(() => {
    const socket = getSocket();
    const onMensaje = (m: MensajeChatPayload) => {
      if (m.viajeId !== viajeId) return;
      agregarMensaje(qc, viajeId, m);
      // Como el chat está abierto, marcamos leído lo que llega del conductor.
      if (m.autorTipo === 'CONDUCTOR') marcarLeido();
    };
    socket.on(WS_EVENTS.CHAT_MENSAJE, onMensaje);
    return () => {
      socket.off(WS_EVENTS.CHAT_MENSAJE, onMensaje);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viajeId, qc]);

  // Autoscroll al último mensaje, pero solo cuando llega uno NUEVO al final
  // (no al anteponer histórico con "cargar anteriores").
  useEffect(() => {
    const ultimo = mensajes?.[mensajes.length - 1]?.id ?? null;
    if (ultimo && ultimo !== ultimoIdRef.current) {
      const esPrimera = ultimoIdRef.current === null;
      ultimoIdRef.current = ultimo;
      finRef.current?.scrollIntoView({
        behavior: esPrimera ? 'auto' : 'smooth',
      });
    }
  }, [mensajes]);

  function elegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    if (!TIPOS_OK.includes(f.type)) {
      toast.error('Solo se permiten imágenes (JPG, PNG, WEBP) o PDF.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('El archivo supera el máximo de 10 MB.');
      return;
    }
    setArchivo(f);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t && !archivo) return;
    setEnviando(true);
    try {
      const fd = new FormData();
      if (t) fd.append('texto', t);
      if (archivo) fd.append('archivo', archivo);
      const { data } = await api.post<MensajeChatPayload>(
        `/viajes/${viajeId}/chat`,
        fd,
        { headers: { 'Content-Type': undefined } },
      );
      agregarMensaje(qc, viajeId, data);
      setTexto('');
      setArchivo(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setEnviando(false);
    }
  }

  const lista = mensajes ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-lg">Chat con el conductor</CardTitle>
      </CardHeader>

      <CardContent
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[28rem] min-h-[16rem]"
      >
        {hayMas && (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cargarMas}
              disabled={cargandoMas}
            >
              {cargandoMas ? 'Cargando…' : 'Cargar mensajes anteriores'}
            </Button>
          </div>
        )}
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay mensajes. Escribe para iniciar la conversación.
          </p>
        ) : (
          lista.map((m) => <Burbuja key={m.id} mensaje={m} />)
        )}
        <div ref={finRef} />
      </CardContent>

      <form onSubmit={enviar} className="flex items-center gap-2 border-t p-3">
        <input
          ref={inputArchivo}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={elegirArchivo}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => inputArchivo.current?.click()}
          aria-label="Adjuntar archivo"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          {archivo && (
            <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{archivo.name}</span>
              <button
                type="button"
                onClick={() => {
                  setArchivo(null);
                  if (inputArchivo.current) inputArchivo.current.value = '';
                }}
                aria-label="Quitar archivo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe un mensaje…"
            autoComplete="off"
          />
        </div>
        <Button type="submit" size="icon" disabled={enviando} aria-label="Enviar">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
}

function Burbuja({ mensaje }: { mensaje: MensajeChatPayload }) {
  const propio = mensaje.autorTipo === 'MONITORISTA';
  const esImagen = mensaje.archivoTipo?.startsWith('image/');

  return (
    <div className={cn('flex', propio ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] rounded-lg px-3 py-2 text-sm',
          propio
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {!propio && (
          <p className="mb-0.5 text-xs font-semibold opacity-80">
            {mensaje.autorNombre}
          </p>
        )}

        {mensaje.archivoUrl &&
          (esImagen ? (
            <a href={mensaje.archivoUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mensaje.archivoUrl}
                alt={mensaje.archivoNombre ?? 'imagen'}
                className="mb-1 max-h-48 rounded-md object-cover"
              />
            </a>
          ) : (
            <a
              href={mensaje.archivoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-1 flex items-center gap-2 underline"
            >
              <FileText className="h-4 w-4 shrink-0" />
              <span className="truncate">{mensaje.archivoNombre ?? 'Archivo'}</span>
            </a>
          ))}

        {mensaje.texto && <p className="whitespace-pre-wrap break-words">{mensaje.texto}</p>}

        <p className={cn('mt-1 text-[10px]', propio ? 'opacity-70' : 'text-muted-foreground')}>
          {format(new Date(mensaje.createdAt), 'd MMM, HH:mm', { locale: es })}
        </p>
      </div>
    </div>
  );
}
