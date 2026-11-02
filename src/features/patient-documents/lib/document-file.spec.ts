import { describe, expect, it } from 'vitest';

import type { PatientDocument } from '../types';
import {
  documentSummary,
  fileNameFor,
  fileProblem,
  formatSize,
  MAX_BYTES,
  mimeTypeOf,
  validateUploadForm,
} from './document-file';

describe('fileProblem: lo que se corta antes de subir', () => {
  it.each(['application/pdf', 'image/jpeg', 'image/png'])('acepta %s', (mimeType) => {
    expect(fileProblem({ mimeType, sizeBytes: 500_000 })).toBeNull();
  });

  it('rechaza otros tipos', () => {
    expect(fileProblem({ mimeType: 'image/gif', sizeBytes: 1000 })).toBe(
      'Solo se pueden subir PDF, JPG o PNG.',
    );
  });

  // La galería de un iPhone puede entregar el original: se explica cómo seguir.
  it('rechaza HEIC con un mensaje que dice qué hacer', () => {
    expect(fileProblem({ mimeType: 'image/heic', sizeBytes: 1000 })).toMatch(/HEIC.*cámara/);
  });

  it('acepta justo 10 MB y rechaza un byte más', () => {
    expect(fileProblem({ mimeType: 'application/pdf', sizeBytes: MAX_BYTES })).toBeNull();
    expect(fileProblem({ mimeType: 'application/pdf', sizeBytes: MAX_BYTES + 1 })).toBe(
      'El archivo no puede pasar los 10 MB.',
    );
  });

  // Sin el tamaño no se adivina: lo valida el backend.
  it('sin tamaño informado no lo bloquea', () => {
    expect(fileProblem({ mimeType: 'image/jpeg', sizeBytes: null })).toBeNull();
  });
});

describe('mimeTypeOf y fileNameFor', () => {
  it('usa el tipo informado, y la extensión si no hay', () => {
    expect(mimeTypeOf('a.bin', 'image/png')).toBe('image/png');
    expect(mimeTypeOf('a.jpg', 'image/jpg')).toBe('image/jpeg');
    expect(mimeTypeOf('estudio.PDF')).toBe('application/pdf');
    expect(mimeTypeOf('IMG_0001.HEIC')).toBe('image/heic');
  });

  it('nombra la foto sin nombre y corrige la extensión al tipo real', () => {
    expect(fileNameFor(null, 'image/jpeg', new Date('2026-11-02T12:00:00Z'))).toBe(
      'foto-2026-11-02.jpg',
    );
    expect(fileNameFor('IMG_0001.HEIC', 'image/jpeg')).toBe('IMG_0001.jpg');
  });
});

describe('validateUploadForm', () => {
  const hoy = new Date('2026-11-02T12:00:00-03:00');

  it('pide el nombre', () => {
    expect(validateUploadForm({ title: '   ' }, hoy).title).toMatch(/Poné un nombre/);
  });

  it('acepta los opcionales vacíos', () => {
    expect(
      validateUploadForm({ title: 'Hemograma', documentDate: '', sourceInstitution: '' }, hoy),
    ).toEqual({});
  });

  it.each(['2025-13-01', '2025-02-30', '12/03/2025', '2026-11-03'])(
    'rechaza la fecha %s',
    (documentDate) => {
      expect(validateUploadForm({ title: 'Hemograma', documentDate }, hoy).documentDate).toBe(
        'Usá el formato AAAA-MM-DD, con una fecha que ya pasó.',
      );
    },
  );

  it('acepta una fecha real de hoy o antes', () => {
    expect(validateUploadForm({ title: 'Hemograma', documentDate: '2026-11-02' }, hoy)).toEqual({});
  });

  it('corta nombre e institución a 120 caracteres', () => {
    const largo = 'x'.repeat(121);
    expect(validateUploadForm({ title: largo, sourceInstitution: largo }, hoy)).toEqual({
      title: 'Hasta 120 caracteres.',
      sourceInstitution: 'Hasta 120 caracteres.',
    });
  });
});

describe('cómo se muestra', () => {
  const doc: PatientDocument = {
    id: 'd1',
    type: 'EPICRISIS',
    title: 'Alta de la internación',
    documentDate: '2025-03-12',
    sourceInstitution: 'Hospital Italiano',
    mimeType: 'application/pdf',
    sizeBytes: 2_483_000,
    uploadedAt: '2026-10-30T15:00:00Z',
  };

  it('arma la línea de tipo, fecha e institución, sin huecos', () => {
    expect(documentSummary(doc)).toBe('Epicrisis · 12 mar 2025 · Hospital Italiano');
    expect(documentSummary({ ...doc, documentDate: null, sourceInstitution: null })).toBe(
      'Epicrisis',
    );
  });

  it('muestra el tamaño en KB o MB', () => {
    expect(formatSize(2_483_000)).toBe('2,4 MB');
    expect(formatSize(81_000)).toBe('79 KB');
  });
});
