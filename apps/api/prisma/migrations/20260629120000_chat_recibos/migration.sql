-- Palomitas de estado del chat: "entregado" por lado (recibido en el dispositivo
-- del destinatario). El "leído" ya existía (leido*). leído implica recibido.
ALTER TABLE "mensajes_chat" ADD COLUMN     "recibidoConductor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recibidoMonitorista" BOOLEAN NOT NULL DEFAULT false;
