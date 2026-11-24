import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { __documentos } from '../../test-stubs/expo-document-picker';
import { __disco } from '../../test-stubs/expo-file-system';
import { API_URL, server } from '../test/msw-server';
import { renderApp } from '../test/render-app';

/** ENG-246 — importar el resumen de salud IPS para cargar los datos de emergencia. */

const URI = 'file:///cache/DocumentPicker/resumen-ips.json';

const PREVIEW = {
  documento: {
    titulo: 'Resumen del paciente al 26 de Enero de 2018, 14:30hs',
    fecha: '2018-01-26T14:30:00-03:00',
    dniCoincide: true,
  },
  propuesta: {
    allergies: [{ que: 'alergia a la penicilina', gravedad: 'Grave' }],
    medications: [{ droga: 'salbutamol 200 mcg', dosis: '1 disparo' }],
    conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
  },
  vacunas: [{ vacuna: 'antigripal', fecha: '2017-05-22' }],
  ignorados: [],
};

/** El paciente elige un archivo con este contenido. */
function elegirArchivo(contenido: string): void {
  __documentos.proximo = {
    name: 'resumen-ips.json',
    size: contenido.length,
    uri: URI,
    mimeType: 'application/octet-stream',
    lastModified: 0,
  };
  __disco.contenidos.set(URI, contenido);
}

/** `POST /patients/me/ips/preview` que guarda lo que recibió. */
function previewQueResponde(respuesta: object = PREVIEW, status = 200): { body: unknown } {
  const recibido: { body: unknown } = { body: undefined };
  server.use(
    http.post(`${API_URL}/patients/me/ips/preview`, async ({ request }) => {
      recibido.body = await request.json();
      return HttpResponse.json(respuesta, { status });
    }),
  );
  return recibido;
}

async function abrirDatosDeEmergencia(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Cargar mis datos de emergencia' }));
  await screen.findByText(/Cargá lo que te puede salvar la vida/);
}

describe('Importar un resumen de salud (ENG-246)', () => {
  it('manda el documento, muestra lo que trae y borra la copia del caché', async () => {
    const recibido = previewQueResponde();
    elegirArchivo('{"resourceType":"Bundle","type":"document"}');
    await abrirDatosDeEmergencia();

    fireEvent.click(screen.getByRole('button', { name: 'Importar un resumen de salud' }));

    expect(
      await screen.findByRole('checkbox', { name: /alergia a la penicilina/ }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Del 26 de enero de 2018')).toBeInTheDocument();
    expect(screen.getByText(/El MediPass no guarda vacunas/)).toBeInTheDocument();
    expect(recibido.body).toEqual({ resourceType: 'Bundle', type: 'document' });
    expect(__disco.borrados).toContain(URI);
  });

  it('lo elegido se suma al formulario y se guarda con "Guardar"', async () => {
    previewQueResponde();
    elegirArchivo('{}');
    await abrirDatosDeEmergencia();
    fireEvent.click(screen.getByRole('button', { name: 'Importar un resumen de salud' }));

    fireEvent.click(await screen.findByRole('checkbox', { name: /salbutamol/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar 2 datos' }));

    expect(await screen.findByText(/Agregamos 2 datos de tu resumen/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('alergia a la penicilina')).toBeInTheDocument();
    expect(screen.getByDisplayValue('asma')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('salbutamol 200 mcg')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos de emergencia' }));
    expect(await screen.findByText('alergia a la penicilina')).toBeInTheDocument();
  });

  it('avisa si el DNI del resumen no es el del paciente', async () => {
    previewQueResponde({ ...PREVIEW, documento: { ...PREVIEW.documento, dniCoincide: false } });
    elegirArchivo('{}');
    await abrirDatosDeEmergencia();

    fireEvent.click(screen.getByRole('button', { name: 'Importar un resumen de salud' }));

    expect(await screen.findByText(/El DNI de este resumen no es el tuyo/)).toBeInTheDocument();
  });

  it('un archivo que no es JSON no se manda', async () => {
    const recibido = previewQueResponde();
    elegirArchivo('no es json');
    await abrirDatosDeEmergencia();

    fireEvent.click(screen.getByRole('button', { name: 'Importar un resumen de salud' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/en formato JSON/);
    expect(recibido.body).toBeUndefined();
  });

  it('muestra el error del backend si no es un resumen IPS', async () => {
    previewQueResponde(
      {
        message:
          'El archivo no es un resumen de salud IPS: tiene que ser un documento FHIR (Bundle de tipo "document").',
      },
      400,
    );
    elegirArchivo('{"resourceType":"Patient"}');
    await abrirDatosDeEmergencia();

    fireEvent.click(screen.getByRole('button', { name: 'Importar un resumen de salud' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/no es un resumen de salud IPS/),
    );
  });

  it('si cancela la elección no pasa nada', async () => {
    const recibido = previewQueResponde();
    __documentos.proximo = null;
    await abrirDatosDeEmergencia();

    fireEvent.click(screen.getByRole('button', { name: 'Importar un resumen de salud' }));

    await waitFor(() => expect(recibido.body).toBeUndefined());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
