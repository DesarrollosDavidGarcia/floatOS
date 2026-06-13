import 'package:flutter/material.dart';

import '../../domain/estado_viaje.dart';

class EstadoChip extends StatelessWidget {
  const EstadoChip(this.estado, {super.key, this.compacto = false});

  final EstadoViaje estado;
  final bool compacto;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compacto ? 8 : 12,
        vertical: compacto ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: estado.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: estado.color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(estado.icono, size: compacto ? 13 : 15, color: estado.color),
          const SizedBox(width: 5),
          Text(
            estado.etiqueta,
            style: TextStyle(
              color: estado.colorTexto,
              fontSize: compacto ? 12 : 13,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}
