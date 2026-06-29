import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../domain/viaje.dart';
import 'estado_chip.dart';

class ViajeCard extends StatelessWidget {
  const ViajeCard({super.key, required this.viaje, required this.onTap});

  final Viaje viaje;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    final fecha = viaje.fechaProgramada;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      viaje.folioTexto,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                  if (viaje.esPersonal) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: colores.secondaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.groups_outlined,
                              size: 13, color: colores.onSecondaryContainer),
                          const SizedBox(width: 4),
                          Text(
                            'Personal',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: colores.onSecondaryContainer,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 6),
                  ],
                  EstadoChip(viaje.estado, compacto: true),
                ],
              ),
              if (viaje.clienteNombre != null) ...[
                const SizedBox(height: 2),
                Text(
                  viaje.clienteNombre!,
                  style: TextStyle(
                    fontSize: 13,
                    color: colores.onSurfaceVariant,
                  ),
                ),
              ],
              const SizedBox(height: 12),
              _Ruta(
                origen: viaje.origenDireccion,
                destino: viaje.destinoDireccion,
                escalasIntermedias:
                    viaje.escalas.length > 2 ? viaje.escalas.length - 2 : 0,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  if (fecha != null) ...[
                    Icon(Icons.event, size: 15, color: colores.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      DateFormat("d MMM · HH:mm", 'es').format(fecha),
                      style: TextStyle(
                        fontSize: 12.5,
                        color: colores.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(width: 14),
                  ],
                  if (viaje.distanciaEstimadaKm > 0) ...[
                    Icon(Icons.route_outlined,
                        size: 15, color: colores.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      '${viaje.distanciaEstimadaKm.toStringAsFixed(0)} km',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: colores.onSurfaceVariant,
                      ),
                    ),
                  ],
                  const Spacer(),
                  Icon(Icons.chevron_right,
                      size: 20, color: colores.onSurfaceVariant),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Ruta extends StatelessWidget {
  const _Ruta({
    required this.origen,
    required this.destino,
    required this.escalasIntermedias,
  });

  final String origen;
  final String destino;
  final int escalasIntermedias;

  @override
  Widget build(BuildContext context) {
    final colores = Theme.of(context).colorScheme;
    const estiloDir = TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            const SizedBox(height: 3),
            Icon(Icons.trip_origin, size: 13, color: colores.primary),
            Container(
              width: 2,
              height: escalasIntermedias > 0 ? 26 : 18,
              margin: const EdgeInsets.symmetric(vertical: 2),
              color: colores.outlineVariant,
            ),
            Icon(Icons.location_on, size: 15, color: colores.error),
          ],
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 2 líneas: en direcciones MX la ciudad va al final — con una
              // sola línea el conductor no distingue a dónde va cada viaje.
              Text(origen,
                  maxLines: 2, overflow: TextOverflow.ellipsis, style: estiloDir),
              if (escalasIntermedias > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Text(
                    '+$escalasIntermedias parada${escalasIntermedias == 1 ? '' : 's'} intermedia${escalasIntermedias == 1 ? '' : 's'}',
                    style: TextStyle(
                      fontSize: 12,
                      color: colores.onSurfaceVariant,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                )
              else
                const SizedBox(height: 8),
              Text(destino,
                  maxLines: 2, overflow: TextOverflow.ellipsis, style: estiloDir),
            ],
          ),
        ),
      ],
    );
  }
}
