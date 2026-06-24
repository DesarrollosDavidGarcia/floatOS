import { decodificarPolilinea } from './google-polyline.util';

describe('decodificarPolilinea', () => {
  it('decodifica el vector de ejemplo oficial de Google', () => {
    // developers.google.com/maps/documentation/utilities/polylinealgorithm
    const enc = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const pts = decodificarPolilinea(enc);
    expect(pts).toHaveLength(3);
    expect(pts[0][0]).toBeCloseTo(38.5, 5);
    expect(pts[0][1]).toBeCloseTo(-120.2, 5);
    expect(pts[1][0]).toBeCloseTo(40.7, 5);
    expect(pts[1][1]).toBeCloseTo(-120.95, 5);
    expect(pts[2][0]).toBeCloseTo(43.252, 5);
    expect(pts[2][1]).toBeCloseTo(-126.453, 5);
  });

  it('cadena vacía → sin puntos', () => {
    expect(decodificarPolilinea('')).toEqual([]);
  });
});
