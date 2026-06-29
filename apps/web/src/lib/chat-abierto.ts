/**
 * Rastrea qué chat (viajeId) tiene abierto el monitorista en el detalle del
 * viaje, para que la campana global no acuse "recibido" un mensaje que el chat
 * abierto ya marcará como leído (evita un POST redundante y el parpadeo de
 * estado en el emisor). Singleton de módulo: solo hay un chat abierto a la vez.
 */
let viajeAbierto: string | null = null;

export function setChatAbierto(viajeId: string | null): void {
  viajeAbierto = viajeId;
}

export function esChatAbierto(viajeId: string): boolean {
  return viajeAbierto === viajeId;
}
