import { describe, expect, it } from 'vitest';

import type { InAppNotification } from '../types';
import { badgeText, iconOf, relativeTime, targetOf } from './notifications';

const AHORA = new Date('2026-11-16T00:30:00.000Z');

function aviso(cambios: Partial<InAppNotification>): InAppNotification {
  return {
    id: 'a1',
    type: 'PAGO_ACREDITADO',
    appointmentId: null,
    title: 'Pago acreditado',
    body: '',
    createdAt: AHORA.toISOString(),
    readAt: null,
    ...cambios,
  };
}

describe('avisos', () => {
  it('dice cuándo llegó como una bandeja', () => {
    const hace = (ms: number) => new Date(AHORA.getTime() - ms).toISOString();
    expect(relativeTime(AHORA, hace(20_000))).toBe('recién');
    expect(relativeTime(AHORA, hace(5 * 60_000))).toBe('hace 5 minutos');
    expect(relativeTime(AHORA, hace(26 * 3_600_000))).toBe('ayer');
    expect(relativeTime(AHORA, hace(60_000))).toBe('hace 1 minuto');
    expect(relativeTime(AHORA, hace(50 * 3_600_000))).toBe('anteayer');
    expect(relativeTime(AHORA, hace(4 * 86_400_000))).toBe('hace 4 días');
    expect(relativeTime(AHORA, 'no es una fecha')).toBe('');
  });

  it('lleva cada aviso a donde se resuelve', () => {
    expect(targetOf(aviso({ type: 'NUEVO_MENSAJE', conversationId: 'c1' }))).toEqual({
      kind: 'conversacion',
      conversationId: 'c1',
    });
    expect(targetOf(aviso({ type: 'MEDIPASS_ACCESO' }))).toEqual({ kind: 'medipass' });
    expect(targetOf(aviso({ appointmentId: 't1' }))).toEqual({
      kind: 'turno',
      appointmentId: 't1',
    });
    expect(targetOf(aviso({ type: 'RESENA_MODERADA' }))).toBeNull();
  });

  it('cada tipo tiene su ícono, y uno genérico si es nuevo', () => {
    expect(iconOf('MEDIPASS_ACCESO')).toBe('qr-code-outline');
    expect(iconOf('UN_TIPO_NUEVO')).toBe('notifications-outline');
  });

  it('el globito llega hasta 9', () => {
    expect(badgeText(3)).toBe('3');
    expect(badgeText(12)).toBe('9+');
  });
});
