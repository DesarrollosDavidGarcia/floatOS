// Datos de demostración para FlotaOS. Crea clientes, unidades, conductores,
// documentos (algunos por vencer), viajes en distintos estados y ubicaciones.
// Uso: node seed-demo.mjs   (con el API corriendo en localhost:3000)
const BASE = 'http://localhost:3000/api';
let adminToken = '';

async function call(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await res.json(); } catch { data = null; }
  if (res.status >= 400) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data)}`);
  return data;
}
const a = (m, p, b) => call(m, p, b, adminToken);
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();

async function main() {
  const login = await call('POST', '/auth/login', { email: 'admin@flotaos.local', password: 'Admin1234!' });
  adminToken = login.accessToken;
  console.log('✔ login admin');

  // Clientes
  const cli1 = await a('POST', '/clientes', { razonSocial: 'Comercializadora del Bajío SA de CV', rfc: 'CBA120101AB1', contactoNombre: 'Laura Méndez', contactoTelefono: '4771234567', contactoEmail: 'compras@bajio.mx' });
  const cli2 = await a('POST', '/clientes', { razonSocial: 'Distribuidora Norte SA', rfc: 'DNO980505XY2', contactoNombre: 'Jorge Salas', contactoTelefono: '8181122334' });
  console.log('✔ 2 clientes');

  // Unidades + documentos
  const u1 = await a('POST', '/unidades', { placas: 'MX-7821-A', tipo: 'tractocamion', marca: 'Kenworth', modelo: 'T680', anio: 2021, capacidadKg: 25000, aseguradora: 'Qualitas', numeroPoliza: 'Q-99812' });
  const u2 = await a('POST', '/unidades', { placas: 'MX-4410-B', tipo: 'camion', marca: 'International', modelo: 'DuraStar', anio: 2019, capacidadKg: 12000, aseguradora: 'GNP', numeroPoliza: 'GNP-55120' });
  const u3 = await a('POST', '/unidades', { placas: 'MX-3055-C', tipo: 'camioneta', marca: 'Ford', modelo: 'Transit', anio: 2022, capacidadKg: 1500 });
  await a('POST', `/unidades/${u1.id}/documentos`, { tipo: 'VERIFICACION', fechaVencimiento: inDays(6) });
  await a('POST', `/unidades/${u1.id}/documentos`, { tipo: 'SEGURO', fechaVencimiento: inDays(120) });
  await a('POST', `/unidades/${u2.id}/documentos`, { tipo: 'TARJETA_CIRCULACION', fechaVencimiento: inDays(2) });
  await a('POST', `/unidades/${u2.id}/documentos`, { tipo: 'SEGURO', fechaVencimiento: inDays(45) });
  console.log('✔ 3 unidades + documentos');

  // Conductores + documentos
  const c1 = await a('POST', '/conductores', { nombre: 'Miguel', apellidos: 'Hernández', usuario: 'mhernandez', password: 'Conductor123!', telefono: '5512345678' });
  const c2 = await a('POST', '/conductores', { nombre: 'Ana', apellidos: 'Torres', usuario: 'atorres', password: 'Conductor123!', telefono: '5598765432' });
  await a('POST', `/conductores/${c1.id}/documentos`, { tipo: 'LICENCIA_FEDERAL', numero: 'LF-554120', fechaVencimiento: inDays(9) });
  await a('POST', `/conductores/${c1.id}/documentos`, { tipo: 'EXAMEN_MEDICO', fechaVencimiento: inDays(200) });
  await a('POST', `/conductores/${c2.id}/documentos`, { tipo: 'LICENCIA_FEDERAL', numero: 'LF-778901', fechaVencimiento: inDays(3) });
  console.log('✔ 2 conductores + documentos');

  // Viajes en distintos estados
  const mkViaje = (cliente, unidad, conductor, extra) => a('POST', '/viajes', {
    clienteId: cliente, unidadId: unidad, conductorId: conductor,
    fechaProgramada: inDays(0),
    escalas: [
      {
        accion: 'RECOGER', direccion: extra.origen, lat: extra.oLat, lng: extra.oLng,
        cargas: [{ sentido: 'CARGA', tipoCarga: 'GENERAL', descripcion: extra.tipoCarga, pesoKg: extra.pesoKg }],
      },
      {
        accion: 'ENTREGAR', direccion: extra.destino, lat: extra.dLat, lng: extra.dLng,
        cargas: [{ sentido: 'DESCARGA', tipoCarga: 'GENERAL', descripcion: extra.tipoCarga, pesoKg: extra.pesoKg }],
      },
    ],
  });
  const setEstado = (id, estado, nota) => a('PATCH', `/viajes/${id}/estado`, { estado, nota });

  // Viaje A: en tránsito (CDMX -> Guadalajara)
  const vA = await mkViaje(cli1.id, u1.id, c1.id, { tipoCarga: 'Abarrotes', pesoKg: 18000, origen: 'CDMX, Central de Abasto', oLat: 19.372, oLng: -99.087, destino: 'Guadalajara, Mercado de Abastos', dLat: 20.676, dLng: -103.347 });
  for (const e of ['ACEPTADO', 'EN_CAMINO_ORIGEN', 'CARGANDO', 'EN_TRANSITO']) await setEstado(vA.id, e, 'demo');

  // Viaje B: en camino al origen (Monterrey -> Saltillo)
  const vB = await mkViaje(cli2.id, u2.id, c2.id, { tipoCarga: 'Materiales', pesoKg: 9000, origen: 'Monterrey, Parque Industrial', oLat: 25.686, oLng: -100.316, destino: 'Saltillo, Zona Industrial', dLat: 25.433, dLng: -100.999 });
  for (const e of ['ACEPTADO', 'EN_CAMINO_ORIGEN']) await setEstado(vB.id, e, 'demo');

  // Viaje C: asignado, pendiente
  await mkViaje(cli1.id, u3.id, c1.id, { tipoCarga: 'Paquetería', pesoKg: 800, origen: 'Querétaro, Centro', oLat: 20.588, oLng: -100.389, destino: 'León, Centro', dLat: 21.122, dLng: -101.681 });

  // Viaje D: entregado hoy
  const vD = await mkViaje(cli2.id, u1.id, c2.id, { tipoCarga: 'Electrónica', pesoKg: 5000, origen: 'CDMX, Vallejo', oLat: 19.49, oLng: -99.15, destino: 'Puebla, Centro', dLat: 19.041, dLng: -98.206 });
  for (const e of ['ACEPTADO', 'EN_CAMINO_ORIGEN', 'CARGANDO', 'EN_TRANSITO', 'ENTREGADO']) await setEstado(vD.id, e, 'demo');
  console.log('✔ 4 viajes (en tránsito, en camino, asignado, entregado)');

  // Ubicaciones para el mapa (viaje A en ruta CDMX->GDL)
  const condLogin = await call('POST', '/auth/conductor/login', { usuario: 'mhernandez', password: 'Conductor123!' });
  const ct = condLogin.accessToken;
  const ruta = [
    { lat: 19.6, lng: -99.4 }, { lat: 20.0, lng: -100.2 }, { lat: 20.4, lng: -101.5 }, { lat: 20.6, lng: -102.6 },
  ];
  for (const p of ruta) {
    await call('POST', `/viajes/${vA.id}/ubicacion`, { ...p, velocidad: 88, capturadoEn: new Date().toISOString() }, ct);
  }
  console.log('✔ ubicaciones del viaje en tránsito');

  console.log('\n✅ Datos de demo creados. Entra al panel y explora.');
}
main().catch((e) => { console.error('❌', e.message); process.exit(1); });
