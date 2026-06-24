-- Índices para acelerar el conteo de mensajes de chat no leídos por lado
-- (panel vs conductor). Complementan a "mensajes_chat_viajeId_createdAt_idx".

-- CreateIndex
CREATE INDEX "mensajes_chat_autorTipo_leidoMonitorista_idx" ON "mensajes_chat"("autorTipo", "leidoMonitorista");

-- CreateIndex
CREATE INDEX "mensajes_chat_autorTipo_leidoConductor_idx" ON "mensajes_chat"("autorTipo", "leidoConductor");
