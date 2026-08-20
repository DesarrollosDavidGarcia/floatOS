import { calcularMargen, DatosMargen } from './motor-margen';

/** Viaje con todo capturado: sirve de base y cada test cambia solo lo suyo. */
const BASE: DatosMargen = {
  precioAcordado: 20000,
  distanciaEstimadaKm: 500,
  odometroInicial: 100000,
  odometroFinal: 100550,
  unidad: {
    rendimientoKmL: 2.5,
    costoMantenimientoPorKm: 4,
    costoFijoMensual: 20000,
    viajesDelMes: 10,
  },
  conductor: {
    sueldoPeriodo: 4500,
    periodicidadSueldo: 'SEMANAL',
    viajesDelPeriodo: 3,
    porcentajeFlete: 2,
  },
  precioDieselPorLitro: 27.99,
  gastos: [{ tipo: 'CASETA', monto: 800 }],
};

const linea = (r: ReturnType<typeof calcularMargen>, concepto: string) =>
  r.costos.find((l) => l.concepto === concepto);

describe('motor de margen: kilómetros', () => {
  it('usa el odómetro cuando hay lectura inicial y final', () => {
    const r = calcularMargen(BASE);
    expect(r.km).toBe(550);
    expect(r.origenKm).toBe('ODOMETRO');
    // Con odómetro no debe quejarse de los km.
    expect(r.faltantes.join(' ')).not.toContain('odómetro');
  });

  it('cae a la distancia estimada y lo advierte', () => {
    const r = calcularMargen({ ...BASE, odometroInicial: null, odometroFinal: null });
    expect(r.km).toBe(500);
    expect(r.origenKm).toBe('ESTIMADO');
    expect(r.faltantes.some((f) => f.includes('odómetro'))).toBe(true);
  });

  it('no inventa kilómetros si no hay ni odómetro ni ruta', () => {
    const r = calcularMargen({
      ...BASE,
      odometroInicial: null,
      odometroFinal: null,
      distanciaEstimadaKm: null,
    });
    expect(r.km).toBe(0);
    expect(r.origenKm).toBe('SIN_DATO');
  });

  it('ignora un odómetro final menor que el inicial', () => {
    const r = calcularMargen({ ...BASE, odometroFinal: 99000 });
    expect(r.origenKm).toBe('ESTIMADO');
  });
});

describe('motor de margen: combustible', () => {
  it('el ticket manda sobre el estimado', () => {
    const r = calcularMargen({
      ...BASE,
      gastos: [{ tipo: 'COMBUSTIBLE', monto: 5000 }],
    });
    expect(r.origenDiesel).toBe('TICKET');
    expect(linea(r, 'Combustible')?.monto).toBe(5000);
    expect(linea(r, 'Combustible')?.real).toBe(true);
    expect(linea(r, 'Combustible (estimado)')).toBeUndefined();
  });

  it('estima con rendimiento y precio por litro cuando no hay ticket', () => {
    const r = calcularMargen(BASE);
    expect(r.origenDiesel).toBe('ESTIMADO');
    // 550 km / 2.5 km/L = 220 L x 27.99 = 6157.80
    expect(linea(r, 'Combustible (estimado)')?.monto).toBe(6157.8);
    expect(linea(r, 'Combustible (estimado)')?.real).toBe(false);
  });

  it('avisa en vez de suponer cero si falta el rendimiento', () => {
    const r = calcularMargen({
      ...BASE,
      unidad: { ...BASE.unidad, rendimientoKmL: null },
    });
    expect(r.origenDiesel).toBe('SIN_DATO');
    expect(r.faltantes.some((f) => f.includes('rendimiento'))).toBe(true);
    // Un costo que no se pudo calcular no debe aparecer como línea en 0.
    expect(linea(r, 'Combustible (estimado)')).toBeUndefined();
  });

  it('avisa si no hay precio de diesel cargado', () => {
    const r = calcularMargen({ ...BASE, precioDieselPorLitro: null });
    expect(r.origenDiesel).toBe('SIN_DATO');
    expect(r.faltantes.some((f) => f.includes('precio de diesel'))).toBe(true);
  });
});

describe('motor de margen: prorrateos', () => {
  it('reparte el costo fijo de la unidad entre los viajes del mes', () => {
    const r = calcularMargen(BASE);
    expect(linea(r, 'Costo fijo de la unidad')?.monto).toBe(2000);
  });

  it('carga el fijo completo si la unidad no tiene otros viajes', () => {
    const r = calcularMargen({
      ...BASE,
      unidad: { ...BASE.unidad, viajesDelMes: 0 },
    });
    // Dividir entre 0 viajes daría Infinity: el piso es 1.
    expect(linea(r, 'Costo fijo de la unidad')?.monto).toBe(20000);
  });

  it('reparte el sueldo del conductor entre los viajes de su periodo', () => {
    const r = calcularMargen(BASE);
    expect(linea(r, 'Sueldo del conductor (prorrateado)')?.monto).toBe(1500);
  });
});

describe('motor de margen: pago del conductor', () => {
  it('suma todos los componentes que tengan valor', () => {
    const r = calcularMargen({
      ...BASE,
      conductor: {
        sueldoPeriodo: 3000,
        viajesDelPeriodo: 3,
        tarifaPorViaje: 500,
        pagoPorKm: 2,
        porcentajeFlete: 1,
      },
    });
    expect(linea(r, 'Sueldo del conductor (prorrateado)')?.monto).toBe(1000);
    expect(linea(r, 'Tarifa del conductor')?.monto).toBe(500);
    expect(linea(r, 'Pago por km del conductor')?.monto).toBe(1100); // 550 km x 2
    expect(linea(r, 'Comisión del conductor')?.monto).toBe(200); // 1% de 20000
  });

  it('avisa si el conductor no tiene ningún componente de pago', () => {
    const r = calcularMargen({ ...BASE, conductor: {} });
    expect(r.faltantes.some((f) => f.includes('componente de pago'))).toBe(true);
  });

  it('marca como no real el pago por km calculado sobre distancia estimada', () => {
    const r = calcularMargen({
      ...BASE,
      odometroInicial: null,
      odometroFinal: null,
      conductor: { pagoPorKm: 2 },
    });
    // El monto se calcula igual, pero queda señalado como estimación.
    expect(linea(r, 'Pago por km del conductor')?.monto).toBe(1000);
    expect(linea(r, 'Pago por km del conductor')?.real).toBe(false);
  });
});

describe('motor de margen: resultado', () => {
  it('el margen es el ingreso menos la suma de las líneas', () => {
    const r = calcularMargen(BASE);
    const suma = r.costos.reduce((t, l) => t + l.monto, 0);
    expect(r.costoTotal).toBeCloseTo(suma, 2);
    expect(r.margen).toBeCloseTo(20000 - suma, 2);
    expect(r.margenPct).toBeCloseTo((r.margen / 20000) * 100, 2);
  });

  it('sin precio acordado no hay porcentaje y lo declara faltante', () => {
    const r = calcularMargen({ ...BASE, precioAcordado: null });
    expect(r.ingreso).toBe(0);
    expect(r.margenPct).toBeNull();
    expect(r.faltantes.some((f) => f.includes('precio acordado'))).toBe(true);
    // El margen queda negativo a propósito: los costos existen aunque el
    // ingreso no se haya capturado.
    expect(r.margen).toBeLessThan(0);
  });

  it('un viaje sin gastos capturados lo dice', () => {
    const r = calcularMargen({ ...BASE, gastos: [] });
    expect(r.faltantes.some((f) => f.includes('gastos capturados'))).toBe(true);
  });
});
