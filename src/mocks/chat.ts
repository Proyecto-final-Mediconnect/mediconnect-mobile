import type {
  ChatCounterpart,
  ChatMessage,
  ConversationInbox,
  ConversationSummary,
  MessagesPage,
} from '../features/chat/types';
import { PACIENTE_DEMO } from './patient';

/**
 * El chat de ejemplo (ENG-152), con los mismos profesionales que los turnos de
 * ejemplo: una conversación con Ana García, que atendió el control, con dos
 * mensajes sin leer; y Valeria Ocampo y Martín Olivares, con turnos pagos, para
 * empezar una nueva.
 *
 * Las fechas son relativas a cuándo se arma, como en los turnos: la
 * conversación siempre es de ayer y de hoy.
 */

export const GARCIA_CHAT: ChatCounterpart = {
  id: 'pro-garcia',
  nombre: 'Ana García',
  rol: 'PROFESIONAL',
};
export const OCAMPO_CHAT: ChatCounterpart = {
  id: 'pro-ocampo',
  nombre: 'Valeria Ocampo',
  rol: 'PROFESIONAL',
};
const OLIVARES_CHAT: ChatCounterpart = {
  id: 'pro-olivares',
  nombre: 'Martín Olivares',
  rol: 'PROFESIONAL',
};

export const CONVERSACION_GARCIA = 'conv-garcia';

interface Conversacion {
  id: string;
  contraparte: ChatCounterpart;
  creadaEl: string;
  mensajes: ChatMessage[];
}

let conversaciones: Conversacion[] = [];
let disponibles: ChatCounterpart[] = [];
let secuencia = 0;

function mensaje(
  conversacionId: string,
  autorId: string,
  contenido: string,
  enviadoEl: Date,
  leido: boolean,
): ChatMessage {
  secuencia += 1;
  return {
    id: `msg-${String(secuencia).padStart(4, '0')}`,
    conversacionId,
    autorId,
    contenido,
    enviadoEl: enviadoEl.toISOString(),
    leidoEl: leido ? enviadoEl.toISOString() : null,
  };
}

function crear(ahora: Date): void {
  secuencia = 0;
  const hace = (minutos: number): Date => new Date(ahora.getTime() - minutos * 60_000);
  const yo = PACIENTE_DEMO.id;
  const ana = GARCIA_CHAT.id;
  const id = CONVERSACION_GARCIA;
  conversaciones = [
    {
      id,
      contraparte: GARCIA_CHAT,
      creadaEl: hace(26 * 60).toISOString(),
      mensajes: [
        mensaje(
          id,
          yo,
          'Hola doctora, ¿le puedo mandar los resultados del laboratorio?',
          hace(26 * 60),
          true,
        ),
        mensaje(id, ana, 'Hola Marina, sí, cuando los tengas.', hace(25 * 60), true),
        mensaje(id, yo, 'Listo, los subí a la historia clínica.', hace(24 * 60), true),
        mensaje(id, ana, 'Los vi, está todo bien.', hace(12), false),
        mensaje(id, ana, 'Seguí con la misma dosis y nos vemos en el control.', hace(11), false),
      ],
    },
  ];
  disponibles = [OCAMPO_CHAT, OLIVARES_CHAT];
}

function resumen(c: Conversacion): ConversationSummary {
  return {
    id: c.id,
    contraparte: c.contraparte,
    ultimoMensaje: c.mensajes.at(-1) ?? null,
    noLeidos: c.mensajes.filter((m) => m.autorId !== PACIENTE_DEMO.id && m.leidoEl === null).length,
    creadaEl: c.creadaEl,
  };
}

export const chatDemo = {
  bandeja(): ConversationInbox {
    return {
      conversaciones: conversaciones
        .map(resumen)
        .sort((a, b) =>
          (b.ultimoMensaje?.enviadoEl ?? b.creadaEl).localeCompare(
            a.ultimoMensaje?.enviadoEl ?? a.creadaEl,
          ),
        ),
      disponibles: disponibles.map((d) => ({ ...d })),
    };
  },
  /** `null` si la conversación no existe o no es de la paciente: el backend responde 404. */
  mensajes(id: string): MessagesPage | null {
    const c = conversaciones.find((x) => x.id === id);
    return c ? { mensajes: c.mensajes.map((m) => ({ ...m })), hayMas: false } : null;
  },
  abrir(contraparteId: string): ConversationSummary | null {
    const existente = conversaciones.find((c) => c.contraparte.id === contraparteId);
    if (existente) return resumen(existente);
    const contraparte = disponibles.find((d) => d.id === contraparteId);
    if (!contraparte) return null;
    const nueva: Conversacion = {
      id: `conv-${contraparteId}`,
      contraparte,
      creadaEl: new Date().toISOString(),
      mensajes: [],
    };
    conversaciones.push(nueva);
    disponibles = disponibles.filter((d) => d.id !== contraparteId);
    return resumen(nueva);
  },
  enviar(id: string, contenido: string): ChatMessage | null {
    const c = conversaciones.find((x) => x.id === id);
    if (!c) return null;
    const nuevo = mensaje(id, PACIENTE_DEMO.id, contenido, new Date(), false);
    c.mensajes.push(nuevo);
    return { ...nuevo };
  },
  /** Un archivo que manda la paciente (ENG-102). El tipo y el tamaño, como los guarda el backend. */
  enviarArchivo(
    id: string,
    adjunto: { tipo: string; tamano: number },
    contenido: string,
  ): ChatMessage | null {
    const c = conversaciones.find((x) => x.id === id);
    if (!c) return null;
    const nuevo = { ...mensaje(id, PACIENTE_DEMO.id, contenido, new Date(), false), adjunto };
    c.mensajes.push(nuevo);
    return { ...nuevo };
  },
  /** Una foto que manda la profesional, para ver cómo se muestra (ENG-102). */
  recibirFoto(id: string): string | null {
    const c = conversaciones.find((x) => x.id === id);
    if (!c) return null;
    const nuevo = {
      ...mensaje(id, c.contraparte.id, '', new Date(), false),
      adjunto: { tipo: 'image/jpeg', tamano: 340 * 1024 },
    };
    c.mensajes.push(nuevo);
    return nuevo.id;
  },
  /** Lo que mandaría la otra persona, para probar que la app lo trae sola. */
  recibir(id: string, contenido: string): void {
    const c = conversaciones.find((x) => x.id === id);
    if (c) c.mensajes.push(mensaje(id, c.contraparte.id, contenido, new Date(), false));
  },
  marcarLeido(id: string): void {
    const c = conversaciones.find((x) => x.id === id);
    const ahora = new Date().toISOString();
    c?.mensajes.forEach((m) => {
      if (m.autorId !== PACIENTE_DEMO.id && m.leidoEl === null) m.leidoEl = ahora;
    });
  },
  reiniciar(ahora?: Date): void {
    crear(ahora ?? new Date());
  },
};

crear(new Date());
