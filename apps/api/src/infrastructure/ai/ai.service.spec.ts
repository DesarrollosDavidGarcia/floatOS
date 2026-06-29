import { AiService, type ExtraccionCliente } from './ai.service';

/**
 * Tests de los normalizadores fiscales (puros y deterministas). Son la pieza más
 * crítica de la IA: un error silencioso prellena datos fiscales equivocados. El
 * constructor de AiService es seguro sin API key (deja el cliente en null), así
 * que se instancia directo y se ejercitan los métodos vía un cast tipado.
 */

// Acceso a los métodos privados sin perder tipado del resto del servicio.
type Privados = {
  normalizarFecha(v: unknown): string | null;
  normalizarRfc(v: unknown): string | null;
  normalizarCp(v: unknown): string | null;
  mapearRegimen(n: string | null): string | null;
  salvarObjetoPorRegex(crudo: string): Record<string, unknown> | null;
  mapearCliente(obj: Record<string, unknown>): ExtraccionCliente;
};

describe('AiService — normalizadores', () => {
  let svc: Privados;

  beforeEach(() => {
    delete process.env.NOVITA_API_KEY;
    delete process.env.AI_API_KEY;
    svc = new AiService() as unknown as Privados;
  });

  describe('normalizarFecha', () => {
    it('acepta ISO YYYY-MM-DD', () => {
      expect(svc.normalizarFecha('2026-06-08')).toBe('2026-06-08');
      expect(svc.normalizarFecha('2026-6-8')).toBe('2026-06-08');
    });

    it('acepta DD/MM/YYYY y DD-MM-YYYY (orden mexicano)', () => {
      expect(svc.normalizarFecha('08/06/2026')).toBe('2026-06-08');
      expect(svc.normalizarFecha('8-6-2026')).toBe('2026-06-08');
    });

    it('acepta la forma larga en español', () => {
      expect(svc.normalizarFecha('08 DE JUNIO DE 2026')).toBe('2026-06-08');
      expect(svc.normalizarFecha('1 de enero de 2025')).toBe('2025-01-01');
    });

    it('rechaza fechas de calendario imposibles', () => {
      expect(svc.normalizarFecha('31/02/2026')).toBeNull(); // febrero no tiene 31
      expect(svc.normalizarFecha('2026-13-01')).toBeNull(); // mes 13
      expect(svc.normalizarFecha('00/06/2026')).toBeNull(); // día 0
    });

    it('rechaza basura y no-strings', () => {
      expect(svc.normalizarFecha('mañana')).toBeNull();
      expect(svc.normalizarFecha('')).toBeNull();
      expect(svc.normalizarFecha(null)).toBeNull();
      expect(svc.normalizarFecha(20260608)).toBeNull();
    });

    it('no sufre desfase de zona horaria (día estable)', () => {
      // Regresión: usar Date local en vez de UTC corría el día en TZ negativas.
      expect(svc.normalizarFecha('2026-01-01')).toBe('2026-01-01');
      expect(svc.normalizarFecha('2026-12-31')).toBe('2026-12-31');
    });
  });

  describe('normalizarRfc', () => {
    it('pasa a mayúsculas y quita espacios', () => {
      expect(svc.normalizarRfc('  xaxx010101000 ')).toBe('XAXX010101000');
      expect(svc.normalizarRfc('xax x01 0101 000')).toBe('XAXX010101000');
    });

    it('devuelve null si queda vacío o no es string', () => {
      expect(svc.normalizarRfc('   ')).toBeNull();
      expect(svc.normalizarRfc(null)).toBeNull();
      expect(svc.normalizarRfc(123)).toBeNull();
    });
  });

  describe('normalizarCp', () => {
    it('extrae 4-5 dígitos', () => {
      expect(svc.normalizarCp('64000')).toBe('64000');
      expect(svc.normalizarCp('C.P. 64000')).toBe('64000');
      expect(svc.normalizarCp('0640')).toBe('0640');
    });

    it('descarta lo que no encaja', () => {
      expect(svc.normalizarCp('640000')).toBeNull(); // 6 dígitos sin separador
      expect(svc.normalizarCp('abc')).toBeNull();
      expect(svc.normalizarCp(null)).toBeNull();
    });
  });

  describe('mapearRegimen', () => {
    it('mapea nombres SAT a su código', () => {
      expect(svc.mapearRegimen('Régimen Simplificado de Confianza')).toBe('626');
      expect(svc.mapearRegimen('Sueldos y Salarios')).toBe('605');
      expect(svc.mapearRegimen('Arrendamiento')).toBe('606');
    });

    it('los genéricos no le ganan a los específicos', () => {
      // "personas morales con fines no lucrativos" debe dar 603, no 601.
      expect(svc.mapearRegimen('Personas Morales con Fines no Lucrativos')).toBe(
        '603',
      );
      expect(svc.mapearRegimen('General de Ley Personas Morales')).toBe('601');
    });

    it('es insensible a acentos/mayúsculas y devuelve null si no reconoce', () => {
      expect(svc.mapearRegimen('ENAJENACIÓN DE BIENES')).toBe('607');
      expect(svc.mapearRegimen('régimen inventado')).toBeNull();
      expect(svc.mapearRegimen(null)).toBeNull();
    });
  });

  describe('salvarObjetoPorRegex', () => {
    it('reconstruye un objeto cuando el JSON viene truncado/roto', () => {
      const crudo = '{"rfc": "XAXX010101000", "razonSocial": "ACME SA", "cp';
      const obj = svc.salvarObjetoPorRegex(crudo);
      expect(obj).toMatchObject({ rfc: 'XAXX010101000', razonSocial: 'ACME SA' });
    });

    it('toma solo la primera aparición de cada clave (bucle de repetición)', () => {
      const crudo = '{"rfc":"AAA010101AAA"} {"rfc":"BBB020202BBB"}';
      expect(svc.salvarObjetoPorRegex(crudo)?.rfc).toBe('AAA010101AAA');
    });

    it('devuelve null si no hay pares válidos', () => {
      expect(svc.salvarObjetoPorRegex('texto sin json')).toBeNull();
    });
  });

  describe('mapearCliente (integración de normalizadores)', () => {
    it('normaliza todo el objeto de la CSF', () => {
      const r = svc.mapearCliente({
        razonSocial: '  ACME SA DE CV ',
        rfc: 'xaxx 010101 000',
        regimenFiscal: 'Régimen Simplificado de Confianza',
        cpFiscal: 'C.P. 64000',
        certeza: 'ALTA',
      });
      expect(r.razonSocial).toBe('ACME SA DE CV');
      expect(r.rfc).toBe('XAXX010101000');
      expect(r.regimenFiscal).toBe('626');
      expect(r.cpFiscal).toBe('64000');
      expect(r.confianza).toBe('alta');
    });

    it('avisa cuando detecta un régimen que no pudo mapear', () => {
      const r = svc.mapearCliente({ regimenFiscal: 'régimen raro inexistente' });
      expect(r.regimenFiscal).toBeNull();
      expect(r.advertencias.some((a) => a.includes('régimen raro'))).toBe(true);
    });
  });
});
