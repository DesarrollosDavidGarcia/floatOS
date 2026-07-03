import { z } from 'zod';
import { textoRequerido } from '@/lib/validacion';
import type { Cliente } from '@/app/(panel)/clientes/tipos';

const opcional = z.string().trim().optional().or(z.literal(''));

const contactoSchema = z.object({
  nombre: textoRequerido('El nombre del contacto es obligatorio').max(255),
  email: z.string().trim().email('Correo inválido').optional().or(z.literal('')),
  telefono: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^\d{10}$/.test(v.replace(/\D/g, '')),
      'El celular debe tener 10 dígitos',
    ),
  esPrincipal: z.boolean().default(false),
});

export const clienteFormSchema = z.object({
  razonSocial: textoRequerido('La razón social es obligatoria').max(200, 'Máximo 200 caracteres'),
  rfc: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || /^[A-ZÑ&0-9]{12,13}$/i.test(v),
      'El RFC debe tener 12 o 13 caracteres',
    ),
  regimenFiscal: opcional,
  usoCfdi: opcional,
  cpFiscal: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{4,5}$/.test(v), 'El C.P. debe tener 5 dígitos'),
  emailFacturacion: z.string().trim().email('Correo inválido').optional().or(z.literal('')),
  direccion: opcional,
  contactos: z.array(contactoSchema),
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;

export const CONTACTO_VACIO: ClienteFormValues['contactos'][number] = {
  nombre: '',
  email: '',
  telefono: '',
  esPrincipal: false,
};

export function defaultsCrear(): ClienteFormValues {
  return {
    razonSocial: '',
    rfc: '',
    regimenFiscal: '',
    usoCfdi: '',
    cpFiscal: '',
    emailFacturacion: '',
    direccion: '',
    contactos: [{ ...CONTACTO_VACIO, esPrincipal: true }],
  };
}

export function defaultsDeCliente(c: Cliente): ClienteFormValues {
  const contactos = (c.contactos ?? []).map((ct) => ({
    nombre: ct.nombre ?? '',
    email: ct.email ?? '',
    telefono: ct.telefono ?? '',
    esPrincipal: Boolean(ct.esPrincipal),
  }));
  // Garantiza un principal si hay contactos y ninguno viene marcado.
  if (contactos.length && !contactos.some((ct) => ct.esPrincipal)) {
    contactos[0].esPrincipal = true;
  }
  return {
    razonSocial: c.razonSocial ?? '',
    rfc: c.rfc ?? '',
    regimenFiscal: c.regimenFiscal ?? '',
    usoCfdi: c.usoCfdi ?? '',
    cpFiscal: c.cpFiscal ?? '',
    emailFacturacion: c.emailFacturacion ?? '',
    direccion: c.direccion ?? '',
    contactos: contactos.length ? contactos : [{ ...CONTACTO_VACIO, esPrincipal: true }],
  };
}

/** Convierte el formulario al payload del API (omite vacíos, normaliza contactos). */
export function toPayload(values: ClienteFormValues) {
  const trimOpt = (v?: string) => {
    const t = (v ?? '').trim();
    return t || undefined;
  };
  return {
    razonSocial: values.razonSocial.trim(),
    rfc: trimOpt(values.rfc),
    regimenFiscal: trimOpt(values.regimenFiscal),
    usoCfdi: trimOpt(values.usoCfdi),
    cpFiscal: trimOpt(values.cpFiscal),
    emailFacturacion: trimOpt(values.emailFacturacion),
    direccion: trimOpt(values.direccion),
    contactos: values.contactos
      .filter((c) => c.nombre.trim())
      .map((c) => ({
        nombre: c.nombre.trim(),
        email: trimOpt(c.email),
        telefono: trimOpt(c.telefono),
        esPrincipal: c.esPrincipal,
      })),
  };
}
