import { describe, expect, it } from 'vitest';
import {
  reprogramHeadline,
  reprogramLead,
  reprogramStepTitle,
  showsReason,
} from './reprogramCause';

/** ENG-237 — una consulta que no se realizó no se cuenta como "canceló". */
describe('textos de un turno a reprogramar según la causa', () => {
  it('si el profesional no se conectó', () => {
    const turno = { reprogramCause: 'AUSENCIA_PROFESIONAL' as const };
    expect(reprogramHeadline(turno, 'Ana Pérez')).toBe('Ana Pérez no se conectó a tu consulta');
    expect(reprogramStepTitle(turno, 'Ana Pérez')).toBe('Ana Pérez no se conectó a la consulta');
    expect(reprogramLead(turno, 'Ana Pérez', 'lunes 3')).toBe(
      'Ana Pérez no se conectó a tu consulta del lunes 3.',
    );
    // El motivo fijo repetiría el título.
    expect(showsReason(turno)).toBe(false);
  });

  it('si hubo una falla técnica, con el motivo del profesional', () => {
    const turno = { reprogramCause: 'FALLA_TECNICA' as const };
    expect(reprogramHeadline(turno, 'Ana Pérez')).toBe(
      'Tu consulta no se pudo completar por una falla técnica',
    );
    expect(reprogramStepTitle(turno, 'Ana Pérez')).toBe('Ana Pérez informó una falla técnica');
    expect(showsReason(turno)).toBe(true);
  });

  it('sin causa es la cancelación del profesional, como antes', () => {
    for (const turno of [{}, { reprogramCause: null }]) {
      expect(reprogramHeadline(turno, 'Ana Pérez')).toBe('Ana Pérez no va a poder atenderte');
      expect(reprogramStepTitle(turno, 'Ana Pérez')).toBe('Ana Pérez canceló el turno');
      expect(showsReason(turno)).toBe(true);
    }
  });
});
