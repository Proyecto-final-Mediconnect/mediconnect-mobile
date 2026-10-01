/** Respuesta de `POST /appointments/:id/video`. Mismo tipo que la web. */
export interface VideoConsultationAccess {
  appointmentId: string;
  role: 'PACIENTE' | 'PROFESIONAL';
  /** URL de la sala con el meeting token. Es efímera: no se guarda en ningún lado. */
  roomUrl: string;
  /** ISO-8601. Cuando llega, Daily cierra la sala y expulsa a todos. */
  expiresAt: string;
  /** La otra persona de la consulta. `null` si no tiene el perfil cargado. */
  counterpart: { firstName: string; lastName: string } | null;
  recording: {
    /** Si el audio de esta consulta se está grabando. */
    enabled: boolean;
    mode: 'off' | 'cloud-audio-only';
  };
}
