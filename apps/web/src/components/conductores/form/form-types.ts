import { z } from 'zod';
import type { Conductor, ConductorFormPayload } from '@/components/conductores/types';

const opcional = z.string().trim().optional().or(z.literal(''));
const tel10 = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{10}$/.test(v.replace(/\D/g, '')), 'El teléfono debe tener 10 dígitos');

export const conductorFormSchema = z
  .object({
    // Datos generales
    nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
    apellidos: opcional,
    telefono: tel10,
    email: z.string().trim().email('El email no es válido').optional().or(z.literal('')),
    // Acceso a la app (credenciales)
    usuario: z.string().trim().min(1, 'El usuario es obligatorio'),
    password: opcional, // requerida solo al crear (refine abajo)
    // Contratación
    tipoContratacion: z.string().min(1, 'Selecciona el tipo de contratación'),
    empresaProveedor: opcional,
    empresaProveedorRfc: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[A-ZÑ&0-9]{12,13}$/i.test(v), 'El RFC debe tener 12 o 13 caracteres'),
    proveedorContactoNombre: opcional,
    proveedorContactoTelefono: tel10,
    vigenciaDesde: opcional,
    vigenciaHasta: opcional,
    notasContratacion: opcional,
    // Datos personales / RH
    curp: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[A-Z0-9]{18}$/i.test(v), 'La CURP debe tener 18 caracteres'),
    rfc: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^[A-ZÑ&0-9]{12,13}$/i.test(v), 'El RFC debe tener 12 o 13 caracteres'),
    nss: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || /^\d{11}$/.test(v), 'El NSS debe tener 11 dígitos'),
    fechaNacimiento: opcional,
    tipoSangre: opcional,
    direccion: opcional,
    // Empleo
    numeroEmpleado: opcional,
    puesto: opcional,
    fechaIngreso: opcional,
    // Licencia
    categoriaLicencia: opcional,
    // Contacto de emergencia
    emergenciaNombre: opcional,
    emergenciaTelefono: tel10,
    emergenciaRelacion: opcional,
    // Auxiliar de UI: modo edición (password opcional) — no se envía.
    _esEdicion: z.boolean(),
  })
  .refine((d) => d._esEdicion || (d.password && d.password.length >= 6), {
    path: ['password'],
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  .refine((d) => !d.password || d.password.length >= 6, {
    path: ['password'],
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  .refine((d) => d.tipoContratacion !== 'TERCIARIZADO' || !!d.empresaProveedor?.trim(), {
    path: ['empresaProveedor'],
    message: 'Indica la empresa que presta al conductor',
  })
  .refine(
    (d) => !d.vigenciaDesde || !d.vigenciaHasta || d.vigenciaHasta >= d.vigenciaDesde,
    { path: ['vigenciaHasta'], message: 'No puede ser anterior al inicio de vigencia' },
  );

export type ConductorFormValues = z.infer<typeof conductorFormSchema>;

const VACIO_RH = {
  curp: '',
  rfc: '',
  nss: '',
  fechaNacimiento: '',
  tipoSangre: '',
  direccion: '',
  numeroEmpleado: '',
  puesto: '',
  fechaIngreso: '',
  categoriaLicencia: '',
  emergenciaNombre: '',
  emergenciaTelefono: '',
  emergenciaRelacion: '',
};

export function defaultsCrear(): ConductorFormValues {
  return {
    nombre: '',
    apellidos: '',
    telefono: '',
    email: '',
    usuario: '',
    password: '',
    tipoContratacion: 'PLANTA',
    empresaProveedor: '',
    empresaProveedorRfc: '',
    proveedorContactoNombre: '',
    proveedorContactoTelefono: '',
    vigenciaDesde: '',
    vigenciaHasta: '',
    notasContratacion: '',
    ...VACIO_RH,
    _esEdicion: false,
  };
}

const isoADate = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export function defaultsDeConductor(c: Conductor): ConductorFormValues {
  return {
    nombre: c.nombre ?? '',
    apellidos: c.apellidos ?? '',
    telefono: c.telefono ?? '',
    email: c.email ?? '',
    usuario: c.usuario ?? '',
    password: '',
    tipoContratacion: c.tipoContratacion ?? 'PLANTA',
    empresaProveedor: c.empresaProveedor ?? '',
    empresaProveedorRfc: c.empresaProveedorRfc ?? '',
    proveedorContactoNombre: c.proveedorContactoNombre ?? '',
    proveedorContactoTelefono: c.proveedorContactoTelefono ?? '',
    vigenciaDesde: isoADate(c.vigenciaDesde),
    vigenciaHasta: isoADate(c.vigenciaHasta),
    notasContratacion: c.notasContratacion ?? '',
    curp: c.curp ?? '',
    rfc: c.rfc ?? '',
    nss: c.nss ?? '',
    fechaNacimiento: isoADate(c.fechaNacimiento),
    tipoSangre: c.tipoSangre ?? '',
    direccion: c.direccion ?? '',
    numeroEmpleado: c.numeroEmpleado ?? '',
    puesto: c.puesto ?? '',
    fechaIngreso: isoADate(c.fechaIngreso),
    categoriaLicencia: c.categoriaLicencia ?? '',
    emergenciaNombre: c.emergenciaNombre ?? '',
    emergenciaTelefono: c.emergenciaTelefono ?? '',
    emergenciaRelacion: c.emergenciaRelacion ?? '',
    _esEdicion: true,
  };
}

/**
 * Convierte el formulario al payload del API. La empresa proveedora solo aplica
 * a TERCIARIZADO; la vigencia/notas a cualquier externo. El backend además fuerza
 * la consistencia. Los campos RH se envían siempre (vacío → omitido / no cambia).
 */
export function toPayload(values: ConductorFormValues): ConductorFormPayload {
  const t = (v?: string) => {
    const s = (v ?? '').trim();
    return s || undefined;
  };
  const fecha = (v?: string) => (v ? new Date(v).toISOString() : undefined);
  const externo = values.tipoContratacion !== 'PLANTA';
  const terciarizado = values.tipoContratacion === 'TERCIARIZADO';
  const payload: ConductorFormPayload = {
    nombre: values.nombre.trim(),
    usuario: values.usuario.trim(),
    apellidos: t(values.apellidos),
    email: t(values.email),
    telefono: t(values.telefono),
    tipoContratacion: values.tipoContratacion,
    empresaProveedor: terciarizado ? t(values.empresaProveedor) : undefined,
    empresaProveedorRfc: terciarizado ? t(values.empresaProveedorRfc) : undefined,
    proveedorContactoNombre: terciarizado ? t(values.proveedorContactoNombre) : undefined,
    proveedorContactoTelefono: terciarizado ? t(values.proveedorContactoTelefono) : undefined,
    vigenciaDesde: externo ? fecha(values.vigenciaDesde) : undefined,
    vigenciaHasta: externo ? fecha(values.vigenciaHasta) : undefined,
    notasContratacion: externo ? t(values.notasContratacion) : undefined,
    // RH
    curp: t(values.curp),
    rfc: t(values.rfc),
    nss: t(values.nss),
    fechaNacimiento: fecha(values.fechaNacimiento),
    tipoSangre: t(values.tipoSangre),
    direccion: t(values.direccion),
    numeroEmpleado: t(values.numeroEmpleado),
    puesto: t(values.puesto),
    fechaIngreso: fecha(values.fechaIngreso),
    categoriaLicencia: t(values.categoriaLicencia),
    emergenciaNombre: t(values.emergenciaNombre),
    emergenciaTelefono: t(values.emergenciaTelefono),
    emergenciaRelacion: t(values.emergenciaRelacion),
  };
  if (values.password) payload.password = values.password;
  return payload;
}
