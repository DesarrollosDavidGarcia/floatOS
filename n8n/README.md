# n8n — Bot de cotización (FlotaOS + Zavu + IA)

Automatización del bot de cotización. n8n orquesta: **mensaje → IA (parsea) →
API de FlotaOS (cotiza) → respuesta**.

## 1. Levantar n8n
```bash
docker compose -f docker-compose.n8n.yml up -d   # UI en http://localhost:5678
```
Los secretos viven en `.env.n8n` (gitignored): `ZAVU_API_KEY`, `NOVITA_API_KEY`,
`NOVITA_MODEL_BOT`, `BOT_API_KEY`, `FLOTAOS_API_URL`. El workflow los lee con
expresiones `{{ $env.NOMBRE }}`.

## 2. Crear la cuenta (una vez)
Abre http://localhost:5678 y crea la cuenta de **owner** (asistente de n8n).

## 3. Importar el workflow
En n8n: **Workflows → ⋯ → Import from File** → `n8n/cotizacion-bot.workflow.json`.

## 4. Probar AHORA (sin WhatsApp)
El workflow trae un **Webhook** de prueba. Con el workflow abierto, pulsa
**“Execute workflow / Listen for test event”** y manda una solicitud:
```bash
curl -s -X POST http://localhost:5678/webhook-test/cotizar \
  -H "Content-Type: application/json" \
  -d '{"mensaje":"Cotiza un flete de Ciudad de Mexico a Monterrey, 20 toneladas, 1 escala"}'
```
Debe responder con el resumen de la cotización (origen/destino, km, total MXN).
Para dejarlo siempre activo (sin “Listen”), **Activa** el workflow y usa la URL
de producción `http://localhost:5678/webhook/cotizar`.

## 5. Conectar Zavu (cuando tengas número de WhatsApp)
El nodo **“Zavu: responder”** está incluido pero **desconectado** (porque aún no
hay número). Cuando tengas canal:
1. Conéctalo después de **“FlotaOS: cotizar”**.
2. Verifica la URL y el esquema del body (`channel`/`to`/`content`) contra la doc
   de Zavu — el nodo trae valores de ejemplo.
3. Reemplaza el **Webhook** de prueba por el **webhook de entrada de Zavu** (el
   que Zavu llama cuando llega un mensaje), mapeando el texto y el remitente.

> 💡 **Sin pagar WhatsApp:** Zavu también soporta **email** (incluido en el plan
> gratis). Puedes probar el bot respondiendo por correo cambiando `channel` a
> `email` y `to` a tu correo (requiere remitente verificado en Zavu).

## Notas
- n8n alcanza la API de FlotaOS (en el host) vía `http://host.docker.internal:3000/api`.
- La cotización usa las **tarifas por defecto** de la config de empresa
  (`PATCH /empresa` con `tarifasCotizacion`), o defaults del código si no hay.
