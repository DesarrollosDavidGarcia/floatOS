# FlotaOS Conductor — app Flutter

App móvil del conductor (Android + iOS): viajes asignados, avance de estados
y tracking GPS en tiempo real hacia el panel del monitorista.

## Stack

| Necesidad | Paquete |
|---|---|
| Estado | `flutter_riverpod` |
| HTTP + refresh JWT | `dio` (interceptor con cola) |
| Navegación | `go_router` |
| Tokens | `flutter_secure_storage` (Keystore / Keychain) |
| Tiempo real | `socket_io_client` (namespace `/tracking`) |
| Mapas | `flutter_map` + OpenStreetMap (sin API key) |
| GPS | `geolocator` — foreground service nativo en Android, background mode `location` en iOS (sin `flutter_background_service`) |
| UI | Material 3 + `google_fonts` (Manrope) |

## Correr en desarrollo

El API debe estar arriba (`npm run start:dev` en `apps/api`, puerto 3000).

```bash
# Emulador Android (10.0.2.2 = localhost del host; valor por defecto)
flutter run

# Dispositivo físico (misma red WiFi que tu PC)
flutter run --dart-define=API_URL=http://192.168.1.XX:3000/api \
            --dart-define=SOCKET_URL=http://192.168.1.XX:3000

# iOS simulator
flutter run --dart-define=API_URL=http://localhost:3000/api \
            --dart-define=SOCKET_URL=http://localhost:3000
```

> En producción se compila con la URL HTTPS del cliente:
> `flutter build apk --release --dart-define=API_URL=https://cliente.dominio.com/api --dart-define=SOCKET_URL=https://cliente.dominio.com`

Login con las credenciales de conductor creadas desde el panel web
(`/conductores` → pestaña Datos → acceso a la app).

## Flujo del conductor

`ASIGNADO → ACEPTADO → EN_CAMINO_ORIGEN → CARGANDO → EN_TRANSITO → ENTREGADO`

- El botón principal del detalle avanza al siguiente estado (el backend
  valida `TRANSICIONES_VIAJE`); la cancelación es del monitorista.
- El GPS se enciende solo en `EN_CAMINO_ORIGEN / CARGANDO / EN_TRANSITO`
  y se apaga al entregar. En Android aparece la notificación persistente
  del servicio foreground.
- Sin señal: los puntos se acumulan en cola y se envían en lote
  (`POST /viajes/:id/ubicaciones`) al recuperar conexión. (Cola en memoria;
  persistencia con drift/SQLite llega con el modo offline de Fase 2.)

## Verificación

```bash
flutter analyze   # 0 issues
flutter test      # máquina de estados + parsing del modelo
```

## Pendiente (Fase 2)

- POD (foto + firma + geolocalización) y gastos — requieren endpoints nuevos en el API
- Modo offline completo (drift) para estados y POD
- Selección de unidad al iniciar sesión (hoy la unidad viene asignada al viaje)
