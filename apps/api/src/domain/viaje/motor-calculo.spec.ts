import {
  evaluarFlota,
  evaluarUnidad,
  simularCarga,
  type ItemCargaEval,
  type UnidadCandidata,
} from './motor-calculo';

const compatTodo = () => true;
const sinExtra = { metodoDistancia: 'GEODESICA' as const, advertencias: [] };

describe('simularCarga', () => {
  it('toma el peso máximo en el tramo correcto con recoger y entregar', () => {
    // Escala 0: carga 1000. Escala 1: carga 500 (acum 1500 = máx). Escala 2: descarga 1000 (acum 500).
    const items: ItemCargaEval[] = [
      { escalaOrden: 0, sentido: 'CARGA', tipoCarga: 'GENERAL', pesoKg: 1000, volumenM3: 2 },
      { escalaOrden: 1, sentido: 'CARGA', tipoCarga: 'GENERAL', pesoKg: 500, volumenM3: 1 },
      { escalaOrden: 2, sentido: 'DESCARGA', tipoCarga: 'GENERAL', pesoKg: 1000, volumenM3: 2 },
    ];
    const r = simularCarga(items);
    expect(r.pesoMaxKg).toBe(1500);
    expect(r.volumenMaxM3).toBe(3);
  });

  it('maneja "reemplazar" (descarga + carga en la misma escala) sin doble conteo', () => {
    // Escala 0 carga 1000; escala 1 descarga 1000 y carga 800 → máx sigue 1000.
    const items: ItemCargaEval[] = [
      { escalaOrden: 0, sentido: 'CARGA', tipoCarga: 'GENERAL', pesoKg: 1000, volumenM3: 0 },
      { escalaOrden: 1, sentido: 'DESCARGA', tipoCarga: 'GENERAL', pesoKg: 1000, volumenM3: 0 },
      { escalaOrden: 1, sentido: 'CARGA', tipoCarga: 'REFRIGERADA', pesoKg: 800, volumenM3: 0 },
    ];
    const r = simularCarga(items);
    expect(r.pesoMaxKg).toBe(1000);
    expect(r.tiposCargaPresentes.sort()).toEqual(['GENERAL', 'REFRIGERADA']);
  });
});

describe('evaluarUnidad', () => {
  const carga = { pesoMaxKg: 2000, volumenMaxM3: 10, tiposCargaPresentes: ['GENERAL'] };
  const base: UnidadCandidata = {
    id: 'u1', tipo: 'CAMION', capacidadKg: 3000, capacidadM3: 15, autonomiaKm: 800,
  };

  it('apta cuando todo cabe', () => {
    const v = evaluarUnidad(carga, 500, base, compatTodo);
    expect(v.apta).toBe(true);
    expect(v.motivos).toHaveLength(0);
    expect(v.usoPesoPct).toBeCloseTo(66.67, 1);
  });

  it('SOBREPESO cuando excede capacidad', () => {
    const v = evaluarUnidad(carga, 100, { ...base, capacidadKg: 1500 }, compatTodo);
    expect(v.apta).toBe(false);
    expect(v.motivos.map((m) => m.codigo)).toContain('SOBREPESO');
  });

  it('SOBRE_VOLUMEN cuando excede volumen', () => {
    const v = evaluarUnidad(carga, 100, { ...base, capacidadM3: 5 }, compatTodo);
    expect(v.motivos.map((m) => m.codigo)).toContain('SOBRE_VOLUMEN');
  });

  it('TIPO_INCOMPATIBLE cuando la compatibilidad lo niega', () => {
    const v = evaluarUnidad(carga, 100, base, () => false);
    expect(v.apta).toBe(false);
    expect(v.motivos.map((m) => m.codigo)).toContain('TIPO_INCOMPATIBLE');
  });

  it('AUTONOMIA_INSUFICIENTE cuando la distancia supera la autonomía', () => {
    const v = evaluarUnidad(carga, 1000, base, compatTodo);
    expect(v.motivos.map((m) => m.codigo)).toContain('AUTONOMIA_INSUFICIENTE');
  });

  it('DATOS_INCOMPLETOS no bloquea si falta capacidadKg', () => {
    const v = evaluarUnidad(carga, 100, { ...base, capacidadKg: null }, compatTodo);
    expect(v.motivos.map((m) => m.codigo)).toContain('DATOS_INCOMPLETOS');
    expect(v.apta).toBe(true); // solo informativo
  });
});

describe('evaluarFlota', () => {
  it('ordena aptas primero y recomienda la de mejor ajuste', () => {
    const carga = { pesoMaxKg: 1000, volumenMaxM3: 0, tiposCargaPresentes: ['GENERAL'] };
    const unidades: UnidadCandidata[] = [
      { id: 'grande', tipo: 'TRACTOCAMION', capacidadKg: 20000, capacidadM3: null, autonomiaKm: null },
      { id: 'justa', tipo: 'CAMION', capacidadKg: 1200, capacidadM3: null, autonomiaKm: null },
      { id: 'chica', tipo: 'CAMIONETA', capacidadKg: 800, capacidadM3: null, autonomiaKm: null },
    ];
    const r = evaluarFlota(carga, 100, unidades, compatTodo, sinExtra);
    // 'chica' no apta (sobrepeso); 'justa' mejor ajuste que 'grande'.
    expect(r.recomendada).toBe('justa');
    expect(r.veredictos[0].unidadId).toBe('justa');
    expect(r.veredictos.find((v) => v.unidadId === 'chica')?.apta).toBe(false);
  });
});
