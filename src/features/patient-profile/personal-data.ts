import { diaArgentino } from '../../shared/lib/argentina-time';
import type { PatientProfile, PatientProfileInput } from './types';

/**
 * El formulario de datos personales (ENG-236), sin React: pasar del perfil a lo
 * que se edita y de lo editado a lo que se manda, con las mismas reglas y
 * mensajes que el `patientProfileSchema` de la web y el
 * `UpdatePatientProfileDto` del backend.
 *
 * La fecha se escribe como en un formulario argentino, `DD/MM/AAAA`, y viaja
 * `AAAA-MM-DD`: la app no tiene un selector de fechas, y en el teclado numérico
 * es más rápido escribirla que buscar el año en un calendario.
 */

export type PersonalDataForm = {
  firstName: string;
  lastName: string;
  /** `DD/MM/AAAA`, como la escribe la persona. */
  birthDate: string;
  dni: string;
  phone: string;
};

export type PersonalDataErrors = Partial<Record<keyof PersonalDataForm, string>>;

/** La edad más alta que acepta el backend. */
const EDAD_MAXIMA = 120;
const TELEFONO = /^\+?[\d\s-]{6,20}$/;

const espacios = (texto: string): string => texto.trim().replace(/\s+/g, ' ');

export function toPersonalForm(profile: PatientProfile | undefined): PersonalDataForm {
  const [anio, mes, dia] = profile?.birthDate?.split('-') ?? [];
  return {
    firstName: profile?.firstName ?? '',
    lastName: profile?.lastName ?? '',
    birthDate: anio && mes && dia ? `${dia}/${mes}/${anio}` : '',
    dni: profile?.dni ?? '',
    phone: profile?.phone ?? '',
  };
}

/**
 * Lo que se escribe en la fecha, con las barras puestas solas: "12041985" se
 * ve "12/04/1985". Borrar sigue funcionando, porque solo cuentan los dígitos.
 */
export function maskBirthDate(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

/** `DD/MM/AAAA` a `AAAA-MM-DD`, o `null` si no es una fecha que exista. */
function aIso(texto: string): string | null {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto.trim());
  if (!partes) return null;
  const [, dia, mes, anio] = partes;
  const fecha = new Date(Date.UTC(Number(anio), Number(mes) - 1, Number(dia)));
  // El 31/02 "existe" para Date (pasa al 3 de marzo): se descarta.
  if (fecha.getUTCDate() !== Number(dia) || fecha.getUTCMonth() !== Number(mes) - 1) return null;
  return `${anio}-${mes}-${dia}`;
}

export function toProfileInput(
  form: PersonalDataForm,
  ahora: Date = new Date(),
): { input: PatientProfileInput | null; errors: PersonalDataErrors } {
  const errors: PersonalDataErrors = {};
  const firstName = espacios(form.firstName);
  const lastName = espacios(form.lastName);
  const dni = form.dni.replace(/\D/g, '');
  const phone = espacios(form.phone);

  if (!firstName) errors.firstName = 'El nombre es obligatorio';
  else if (firstName.length > 80) errors.firstName = 'El nombre no puede superar los 80 caracteres';
  if (!lastName) errors.lastName = 'El apellido es obligatorio';
  else if (lastName.length > 80) errors.lastName = 'El apellido no puede superar los 80 caracteres';

  const birthDate = aIso(form.birthDate);
  if (!form.birthDate.trim()) errors.birthDate = 'La fecha de nacimiento es obligatoria';
  else if (!birthDate) errors.birthDate = 'Ingresá una fecha válida (DD/MM/AAAA)';
  else {
    // Hoy en Argentina: la fecha de nacimiento no puede ser después.
    const hoy = diaArgentino(ahora);
    const minima = `${Number(hoy.slice(0, 4)) - EDAD_MAXIMA}${hoy.slice(4)}`;
    if (birthDate > hoy) errors.birthDate = 'La fecha de nacimiento no puede ser futura';
    else if (birthDate < minima)
      errors.birthDate = 'Revisá la fecha de nacimiento: la edad no es válida.';
  }

  // Se aceptan los puntos ("12.345.678"): viajan solo los dígitos, como en la web.
  if (!/^\d{7,8}$/.test(dni)) errors.dni = 'El DNI debe tener 7 u 8 dígitos (sin puntos ni letras)';

  if (phone.length < 6) errors.phone = 'El teléfono es demasiado corto';
  else if (phone.length > 20) errors.phone = 'El teléfono es demasiado largo';
  else if (!TELEFONO.test(phone))
    errors.phone = 'El teléfono solo puede tener números, espacios, guiones y +';

  if (Object.keys(errors).length > 0 || !birthDate) return { input: null, errors };
  return { input: { firstName, lastName, birthDate, dni, phone }, errors };
}
