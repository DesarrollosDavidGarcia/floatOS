# Auditoría UX/UI — FlotaOS (frontend `apps/web`)

**Fecha:** 2026-06-05 · **Método:** 4 agentes en paralelo (a11y+formularios, design system, responsive+navegación, estados+feedback+microcopy) sobre el código, con la app corriendo. Auditoría **de implementación** (no visual con capturas).

> Etiquetas: **[SEGURO]** objetivo/bajo riesgo · **[RIESGOSO]** opinable/visible/estructural · **[APLICADO]**.

---

## Veredicto general
Base sólida: shadcn/ui con CVA, semántica de color centralizada (`lib/estado-viaje.ts`, `lib/vencimiento.ts`), hooks compartidos, y buen trabajo responsive táctico (grids colapsan, tablas con overflow, drawer cierra al navegar). Los problemas son **transversales y de consistencia**, no de funcionalidad:
1. **Accesibilidad**: 0 uso de `aria-invalid/aria-describedby` (validación no se anuncia); labels no asociadas en todos los `CatalogoSelect`; botones-icono sin nombre accesible.
2. **Consistencia**: 4 formatos de fecha distintos; paginación/búsqueda/estados de tabla copiados en 4 páginas con comportamientos divergentes.
3. **Responsive/IA**: formularios largos sin `max-h/overflow` (botón Guardar inalcanzable en móvil); no hay sidebar persistente en desktop ni título de página.
4. **Estados/microcopy**: errores unas veces reales y otras genéricos; vacíos no distinguen "sin búsqueda" vs "sin datos"; terminología "flota/flotilla", "Item", textos de botón inconsistentes.

---

## 🔴 Alto impacto

### U-1. Formularios largos sin `max-h`/scroll → botón Guardar inalcanzable en móvil — [SEGURO] [APLICADO]
Varios `DialogContent` no acotan altura (`form-ui.tsx` ExpedienteFormDialog, `conductor-form-dialog`, `cliente-form-dialog`, `incidencias-tab`, `viajes-dialog`). En un teléfono el form excede el viewport y el footer queda fuera sin scroll. **Aplicado:** `max-h-[90vh] overflow-y-auto` por defecto en el `DialogContent` base (`ui/dialog.tsx`) → cubre todos los diálogos.

### U-2. Validación no accesible: falta `aria-invalid`/`aria-describedby`/`role=alert` — [RIESGOSO]
`components/conductores/expediente/form-ui.tsx` (componente `Campo`, átomo de todos los formularios) pinta el error visualmente pero no lo asocia ni anuncia. Requiere que `Campo` inyecte props al control (cloneElement) → estructural. Propuesto.

### U-3. `CatalogoSelect` sin `id`/`aria-label` → labels huérfanas — [SEGURO] [APLICADO parcial]
`components/catalogos/catalogo-select.tsx` no propaga `id`/`aria-label` al `SelectTrigger`, así que cada `Campo` que lo envuelve omite `htmlFor`. **Aplicado:** `CatalogoSelect` ahora acepta `id`/`aria-label` y los reenvía; añadido `aria-label` en los usos requeridos (documentos, unidad). Resto de call-sites: pendiente (mecánico).

### U-4. Botones-icono sin nombre accesible — [SEGURO] [APLICADO parcial]
Acciones de tabla (Editar/Eliminar con solo ícono) en los 11 tabs del expediente sin `aria-label`; triggers de menú con `title` en vez de `aria-label`. **Aplicado:** `aria-label` en los menús de acción de las 4 listas + catálogos + campana de notificaciones (con conteo). Tabs del expediente (11×2): pendiente (mecánico).

### U-5. Estados de error inconsistentes (real vs genérico) — [SEGURO] [APLICADO]
`conductores`/`viajes`/`documentos-dialog-base` mostraban texto fijo; `clientes`/`flota`/`tracking`/`alertas` el error real (`apiError`). **Aplicado:** unificado a `apiError(error)` con fallback en conductores y viajes (se extrae `error` del `useQuery`).

### U-6. No hay sidebar persistente en desktop ni título de página — [SEGURO (título) / RIESGOSO (sidebar)]
El menú hamburguesa está en todos los tamaños; en desktop esconde la navegación y no hay indicación de sección. **Aplicado:** título de página dinámico en el `Topbar` (deriva de la ruta). **Propuesto (riesgoso):** sidebar fijo desde `lg` (el `SidebarContent` ya es reutilizable).

---

## 🟡 Medio

### U-7. Formato de fecha fragmentado (4 variantes) — [SEGURO]
Conviven `toLocaleDateString('es-MX')` y `date-fns/format` con formatos distintos ("15 ene 2026" vs "15 de ene 2026" vs "15 de enero 2026, 14:30"). Propuesta: `lib/fecha.ts` con `fechaCorta`/`fechaHora`/`rango` (date-fns + locale es) y migrar. (Es el B-6 de la auditoría de código.) Propuesto.

### U-8. Paginación, búsqueda y estados de tabla duplicados en 4 páginas — [SEGURO]
Footer de paginación (~25 líneas), `SearchInput`, y bloque loading/error/empty repetidos con comportamientos divergentes (footer visible o no en vacío; nº de filas skeleton 4/5/6). Propuesta: `<PaginacionFooter>`, `<SearchInput>`, `<EstadoTabla>`. Propuesto (extracción sin cambio visual).

### U-9. Estados vacíos no distinguen "sin búsqueda" vs "sin datos" ni ofrecen CTA — [SEGURO texto / RIESGOSO CTA] [APLICADO texto]
Solo `clientes` distinguía. **Aplicado:** textos diferenciados en conductores/viajes/flota. CTA "Nuevo X" en el vacío inicial: propuesto.

### U-10. Áreas táctiles de menús < 44px — [SEGURO] [APLICADO]
`DropdownMenuItem` ~30px. **Aplicado:** subido el padding vertical para tacto cómodo en móvil.

### U-11. Tabla de viajes en móvil oculta la ruta (origen→destino) — [SEGURO]
`< md` solo muestra Folio/Cliente+Estado. Propuesta: inyectar la ruta en el subtítulo de la celda principal en móvil (`md:hidden`). Propuesto.

### U-12. `keepPreviousData` solo en viajes → flash de skeleton al paginar/buscar — [RIESGOSO]
clientes/conductores/flota desmontan la tabla en cada página/búsqueda. Propuesta: `placeholderData: keepPreviousData` + atenuar con `isPlaceholderData` (como viajes). Propuesto.

### U-13. Microcopy / terminología — [SEGURO] [APLICADO]
**Aplicado:** "flota" vs **"flotilla"** unificado en copy; **"Item" → "Opción"** (+ "Activa/Inactiva") en catálogos; **colores** del selector con etiquetas en español; **"Crear" → "Crear conductor"**; conteo de alertas legible ("N documentos por vencer"); ternario muerto eliminado.

### U-14. Mapa de tracking comprimido en móvil — [RIESGOSO]
Altura fija `h-[calc(100vh-7rem)]` con grid apilado deja la lista en una franja diminuta. Propuesta: en `< lg` soltar altura fija (mapa `h-[60vh]`, lista `max-h-[40vh]`). Propuesto.

### U-15. Drawer móvil sin focus-trap ni ESC — [RIESGOSO]
`mobile-nav.tsx` es manual (`div role=dialog`); no atrapa foco ni cierra con Escape. Propuesta: usar el `Dialog` de Radix. Propuesto.

---

## 🟢 Bajo (selección; resto en informes por agente)
- **U-16.** Campos requeridos: asterisco solo visual; falta `required`/`aria-required`. [SEGURO]
- **U-17.** `ExpedienteFormDialog` sin `DialogDescription` (warning Radix). [SEGURO]
- **U-18.** Login sin `<main>`/`<h1>`; credencial demo precargada y sin placeholders. [SEGURO estructura / RIESGOSO credencial]
- **U-19.** `<th scope="col">` ausente en tablas. [SEGURO] [APLICADO]
- **U-20.** Prefijo de folio inconsistente (`#{folio}` vs `{folio}`); nombre de conductor con/sin apellidos. [SEGURO]
- **U-21.** Iconos en botones con `mr-1 h-4 w-4` redundante (Button ya aplica `gap-2` + `size-4`). [SEGURO]
- **U-22.** Sin "Reintentar" en estados de error; dashboard sin error inline (solo toast → métricas en 0). [RIESGOSO]
- **U-23.** Skeleton genérico (`h-10 w-full`) vs el rico de `tabla-skeleton`; nº de filas no alineado con `PAGE_SIZE`. [RIESGOSO]
- **U-24.** Detalle de viaje/expediente con `<h1>` fijo en vez de `PageHeader` responsive. [SEGURO]
- **U-25.** `autoFocus` solo en cliente; el resto enfoca el botón Cerrar. [SEGURO]
- **U-26.** `ConfirmDialog` siempre `destructive` y "Procesando…" (mejor "Eliminando…"). [SEGURO/RIESGOSO]

---

## Aspectos correctos (no tocar)
- Semántica de color de estado centralizada y consistente (badges de viaje/vencimiento/activo).
- Grids de formulario colapsan a 1 columna; `PageHeader` apila acciones en móvil; tablas con overflow.
- Drawer cierra al navegar y bloquea scroll; `aria-label` en el toggle; `TabsList` con `flex-wrap`.
- Validaciones de formulario específicas y en es-MX; botones se deshabilitan en `isPending`; placeholders de búsqueda útiles.
- `apiError` maneja arrays de validación de NestJS.

## Plan sugerido
1. **Aplicado (ronda 1):** U-1, U-3(parcial), U-4(parcial), U-5, U-6(título), U-9(texto), U-10, U-13, U-19.
2. **Aplicado (ronda 2):** U-2 (validación accesible en `Campo`: aria-invalid/describedby/role=alert), U-16 (aria-required), U-17 (DialogDescription), U-7 (`lib/fecha.ts` unifica las 4 variantes de fecha; migrados tabla-ui, documentos, viajes-dialog, vencimientos-card, datos-tab, eventos-laborales).
3. **Siguiente lote seguro (pendiente):** U-8 (extraer `SearchInput`/`PaginacionFooter`/`EstadoTabla` y migrar las 4 listas — dedup puro, ~12 reemplazos), U-25 (autoFocus 1er campo), U-20/U-21/U-24 (folio `#`, márgenes de icono redundantes, `PageHeader` en detalle).
4. **Opinables (validar visualmente):** U-6 sidebar desktop, U-11/U-12 tablas móvil, U-14 mapa, U-15 drawer Radix, U-22 reintentar, U-23 skeletons, U-18 login (credencial precargada).

*Generado con auditoría asistida por Claude Code.*
