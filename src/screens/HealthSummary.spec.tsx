import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { describe, expect, it } from 'vitest';

import type { IpsResumen } from '../features/patient-profile/ips';
import type { PatientDocument } from '../features/patient-documents/types';
import { API_URL } from '../test/msw-server';
import { multipartFields } from '../test/multipart';
import { renderApp } from '../test/render-app';
import { __documentos } from '../../test-stubs/expo-document-picker';

/**
 * ENG-246 (ADR-022) — el resumen de salud IPS se sube como un documento más,
 * se ve ordenado y, si el paciente quiere, se suma a su MediPass.
 */

const RESUMEN_DOC: PatientDocument = {
  id: 'doc-ips',
  type: 'INFORME',
  title: 'Resumen de salud',
  documentDate: null,
  sourceInstitution: 'Hospital Pintos',
  mimeType: 'application/fhir+json',
  sizeBytes: 9000,
  uploadedAt: '2026-11-24T15:00:00Z',
};

const RESUMEN: IpsResumen = {
  documento: {
    titulo: 'Resumen del paciente al 26 de Enero de 2018, 14:30hs',
    fecha: '2018-01-26T14:30:00-03:00',
  },
  propuesta: {
    allergies: [{ que: 'alergia a la penicilina', gravedad: 'Grave' }],
    medications: [{ droga: 'salbutamol 200 mcg', dosis: '1 disparo' }],
    conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
  },
  vacunas: [{ vacuna: 'antigripal', fecha: '2017-05-22' }],
  ignorados: [],
};

/**
 * Los documentos del paciente con el resumen, y lo que llega al subir o guardar.
 * Los handlers van por `renderApp`, después de los datos de ejemplo: el PUT del
 * MediPass de acá tiene que ganarle al de siempre.
 */
function servir(iniciales: PatientDocument[] = [RESUMEN_DOC]) {
  let lista = [...iniciales];
  const recibido = {
    subida: undefined as Record<string, string> | undefined,
    vital: undefined as unknown,
  };
  const handlers = [
    http.get(`${API_URL}/patients/me/documents`, () => HttpResponse.json(lista)),
    http.post(`${API_URL}/patients/me/documents`, async ({ request }) => {
      recibido.subida = await multipartFields(request);
      lista = [RESUMEN_DOC, ...lista];
      return HttpResponse.json(RESUMEN_DOC, { status: 201 });
    }),
    http.get(`${API_URL}/patient-documents/doc-ips/ips`, () => HttpResponse.json(RESUMEN)),
    http.put(`${API_URL}/patients/me/vital`, async ({ request }) => {
      recibido.vital = await request.json();
      return HttpResponse.json({ ...(recibido.vital as object) });
    }),
  ];
  return { recibido, handlers };
}

async function abrirHistoria(handlers: RequestHandler[]): Promise<void> {
  await renderApp(...handlers);
  fireEvent.click(screen.getByRole('button', { name: 'Historia clínica' }));
  await screen.findByRole('heading', { name: 'Mis documentos' });
}

describe('Resumen de salud (ENG-246)', () => {
  it('"Ver" lo abre ordenado, marcado como no validado, y no como archivo', async () => {
    const { handlers } = servir();
    await abrirHistoria(handlers);

    expect(await screen.findByText('Resumen de salud · 9 KB')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Resumen de salud' }));

    expect(
      await screen.findByText('Resumen del paciente al 26 de Enero de 2018, 14:30hs'),
    ).toBeInTheDocument();
    expect(screen.getByText('Del 26 de enero de 2018')).toBeInTheDocument();
    expect(screen.getByText('NO VALIDADO')).toBeInTheDocument();
    expect(screen.getByText('asma')).toBeInTheDocument();
    expect(screen.getByText('alergia a la penicilina')).toBeInTheDocument();
    expect(screen.getByText('antigripal')).toBeInTheDocument();
  });

  it('suma lo elegido al MediPass', async () => {
    const { recibido, handlers } = servir();
    await abrirHistoria(handlers);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver Resumen de salud' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Sumar a mi MediPass' }));
    fireEvent.click(await screen.findByRole('checkbox', { name: /salbutamol/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sumar 2 datos a mi MediPass' }));

    expect(await screen.findByText('Listo: ya se ve en tu MediPass.')).toBeInTheDocument();
    expect(recibido.vital).toEqual({
      allergies: [{ que: 'alergia a la penicilina', gravedad: 'Grave' }],
      conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
    });
  });

  it('se sube desde "Subir documento" como informe y se abre ordenado', async () => {
    const { recibido, handlers } = servir([]);
    __documentos.proximo = {
      name: 'IPS-9000022.json',
      size: 9000,
      uri: 'file:///cache/DocumentPicker/IPS-9000022.json',
      // Android suele informar un JSON así.
      mimeType: 'application/octet-stream',
      lastModified: 0,
    };
    await abrirHistoria(handlers);

    fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resumen de salud (IPS)' }));
    expect(await screen.findByDisplayValue('Resumen de salud')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('Del 26 de enero de 2018')).toBeInTheDocument();
    expect(recibido.subida).toMatchObject({ type: 'INFORME', title: 'Resumen de salud' });
  });

  it('un archivo que no es .json no se sube', async () => {
    const { recibido, handlers } = servir([]);
    __documentos.proximo = {
      name: 'foto.pdf',
      size: 9000,
      uri: 'file:///cache/DocumentPicker/foto.pdf',
      mimeType: 'application/pdf',
      lastModified: 0,
    };
    await abrirHistoria(handlers);

    fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resumen de salud (IPS)' }));

    expect(
      await screen.findByText('Elegí el archivo .json de tu resumen de salud (IPS).'),
    ).toBeInTheDocument();
    await waitFor(() => expect(recibido.subida).toBeUndefined());
  });
});
