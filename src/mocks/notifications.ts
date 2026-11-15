import type { InAppInbox, InAppNotification } from '../features/notifications/types';

/**
 * Avisos de ejemplo para los tests: lo que contesta el backend falso (MSW) en
 * `GET /notifications/me`. Uno de cada destino —MediPass, turno, sin destino—,
 * dos sin leer.
 */
function crearAvisos(ahora: Date): InAppNotification[] {
  const hace = (min: number) => new Date(ahora.getTime() - min * 60_000).toISOString();
  return [
    {
      id: 'aviso-medipass',
      type: 'MEDIPASS_ACCESO',
      appointmentId: null,
      title: 'Abrieron tu MediPass',
      body: 'Alguien que dijo ser Dr. Guardia (matrícula MP 12345) abrió tu MediPass con tu código. Si no lo reconocés, cortale el acceso.',
      createdAt: hace(0),
      readAt: null,
    },
    {
      id: 'aviso-pago',
      type: 'PAGO_ACREDITADO',
      appointmentId: 'turno-noche',
      title: 'Pago acreditado',
      body: 'Se acreditó el pago de tu turno con Martín Olivares.',
      createdAt: hace(90),
      readAt: null,
    },
    {
      id: 'aviso-resena',
      type: 'RESENA_MODERADA',
      appointmentId: null,
      title: 'Publicamos tu reseña',
      body: 'Tu reseña sobre Ana García ya se ve en su perfil.',
      createdAt: hace(3 * 24 * 60),
      readAt: hace(2 * 24 * 60),
    },
  ];
}

let avisos = crearAvisos(new Date());

export const avisosDemo = {
  bandeja: (): InAppInbox => ({
    unreadCount: avisos.filter((a) => a.readAt === null).length,
    notifications: avisos.map((a) => ({ ...a })),
  }),
  marcarLeido(id: string): void {
    avisos = avisos.map((a) =>
      a.id === id && a.readAt === null ? { ...a, readAt: new Date().toISOString() } : a,
    );
  },
  reiniciar(ahora?: Date): void {
    avisos = crearAvisos(ahora ?? new Date());
  },
};
