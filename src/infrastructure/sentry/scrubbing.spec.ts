import type { Breadcrumb, ErrorEvent } from '@sentry/react-native';
import { describe, expect, it } from 'vitest';

import { scrubBreadcrumb, scrubEvent } from './scrubbing';

describe('scrubEvent', () => {
  it('le saca al evento capturado los campos sensibles', () => {
    const evento = {
      request: {
        url: 'https://api.mediconnect/patients/abc/clinical-record?codigo=K7XQ2M9P',
        headers: { Authorization: 'Bearer token-secreto' },
        data: { diagnostico: 'Diabetes tipo 1' },
      },
      user: { id: 'u-1', email: 'ana@mail.com', username: 'Ana Pérez' },
    } as unknown as ErrorEvent;

    const limpio = scrubEvent(evento);

    // La ruta queda, sin el query string, donde podría ir un código MediPass.
    expect(limpio.request).toEqual({
      url: 'https://api.mediconnect/patients/abc/clinical-record',
    });
    expect(limpio.user).toEqual({ id: 'u-1' });
  });

  it('deja el usuario vacío si no trae id', () => {
    const evento = { user: { email: 'ana@mail.com' } } as unknown as ErrorEvent;

    expect(scrubEvent(evento).user).toEqual({});
  });

  it('no inventa campos que el evento no traía', () => {
    const evento = { message: 'falló algo' } as ErrorEvent;

    expect(scrubEvent(evento)).toEqual({ message: 'falló algo' });
  });
});

describe('scrubBreadcrumb', () => {
  it('descarta los breadcrumbs de consola: su texto puede traer la historia clínica', () => {
    const breadcrumb: Breadcrumb = {
      category: 'console',
      message: 'respuesta {"diagnostico":"Diabetes tipo 1"}',
    };

    expect(scrubBreadcrumb(breadcrumb)).toBeNull();
  });

  it('de un request conserva método y código, y descarta la URL', () => {
    const breadcrumb: Breadcrumb = {
      category: 'xhr',
      data: {
        method: 'POST',
        status_code: 500,
        url: 'https://api.mediconnect/medipass/sessions?codigo=K7XQ2M9P',
      },
    };

    expect(scrubBreadcrumb(breadcrumb)?.data).toEqual({ method: 'POST', status_code: 500 });
  });

  it('de una navegación descarta los parámetros de la ruta', () => {
    const breadcrumb: Breadcrumb = {
      category: 'navigation',
      data: { from: 'Turnos', to: 'DetalleTurno', params: { turnoId: 't-123' } },
    };

    expect(scrubBreadcrumb(breadcrumb)?.data).toEqual({});
  });

  it('deja pasar sin cambios un breadcrumb sin datos', () => {
    const breadcrumb: Breadcrumb = { category: 'touch', message: 'Toque en Entrar' };

    expect(scrubBreadcrumb(breadcrumb)).toEqual(breadcrumb);
  });
});
