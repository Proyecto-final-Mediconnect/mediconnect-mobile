import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PatientDocument } from '../features/patient-documents/types';
import { API_URL, server } from '../test/msw-server';
import { multipartFields } from '../test/multipart';
import { renderApp } from '../test/render-app';
import { __disco } from '../../test-stubs/expo-file-system';
import { __fotos } from '../../test-stubs/expo-image-picker';
import { __abiertas } from '../../test-stubs/expo-web-browser';

const HEMOGRAMA: PatientDocument = {
  id: 'doc-1',
  type: 'ESTUDIO',
  title: 'Hemograma completo',
  documentDate: '2025-03-12',
  sourceInstitution: 'Laboratorio Stamboulian',
  mimeType: 'application/pdf',
  sizeBytes: 245_000,
  uploadedAt: '2026-10-30T15:00:00Z',
};

/**
 * El backend de documentos (backend#90) con una lista que cambia: subir suma
 * arriba, retirar saca. Devuelve lo que llegó, para afirmar sobre el request.
 */
function servirDocumentos(iniciales: PatientDocument[] = [HEMOGRAMA]) {
  let lista = [...iniciales];
  const recibido = {
    subidas: [] as Record<string, string>[],
    retirados: [] as string[],
  };
  server.use(
    http.get(`${API_URL}/patients/me/documents`, () => HttpResponse.json(lista)),
    http.post(`${API_URL}/patients/me/documents`, async ({ request }) => {
      const campos = await multipartFields(request);
      recibido.subidas.push(campos);
      const nuevo: PatientDocument = {
        id: `doc-${lista.length + 1}`,
        type: campos.type as PatientDocument['type'],
        title: campos.title ?? '',
        documentDate: campos.documentDate ?? null,
        sourceInstitution: campos.sourceInstitution ?? null,
        mimeType: 'image/jpeg',
        sizeBytes: 1_800_000,
        uploadedAt: new Date().toISOString(),
      };
      lista = [nuevo, ...lista];
      return HttpResponse.json(nuevo, { status: 201 });
    }),
    http.delete(`${API_URL}/patients/me/documents/:id`, ({ params }) => {
      recibido.retirados.push(String(params.id));
      lista = lista.filter((d) => d.id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${API_URL}/patient-documents/:id/download`, ({ params }) =>
      HttpResponse.json({
        url: `https://storage.mediconnect.test/firmada/${String(params.id)}?token=abc`,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
      }),
    ),
  );
  return recibido;
}

/** Los documentos están en la historia clínica, como en la web: arriba de las entradas. */
async function abrirDocumentos(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('button', { name: 'Historia clínica' }));
  await screen.findByRole('heading', { name: 'Mis documentos' });
}

async function sacarFoto(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sacar una foto' }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Mis documentos en la historia clínica (ENG-164)', () => {
  it('lista los documentos con tipo, fecha e institución, y aclara que no están validados', async () => {
    servirDocumentos();
    await abrirDocumentos();

    expect(await screen.findByText('Hemograma completo')).toBeInTheDocument();
    expect(screen.getByText('Estudio · 12 mar 2025 · Laboratorio Stamboulian')).toBeInTheDocument();
    expect(screen.getByText('PDF · 239 KB')).toBeInTheDocument();
    expect(screen.getByText('Aportado por vos · no validado')).toBeInTheDocument();
  });

  it('sin documentos lo dice y explica para qué sirven', async () => {
    servirDocumentos([]);
    await abrirDocumentos();

    expect(await screen.findByText('+ Subir el primero')).toBeInTheDocument();
  });

  it('sube una foto de la cámara con los datos del formulario', async () => {
    const recibido = servirDocumentos([]);
    const append = vi.spyOn(FormData.prototype, 'append');
    await abrirDocumentos();
    await screen.findByText('+ Subir el primero');

    await sacarFoto();
    await screen.findByRole('heading', { name: 'Subir documento' });
    expect(
      screen.getByText('foto-' + new Date().toISOString().slice(0, 10) + '.jpg'),
    ).toBeVisible();
    expect(screen.getByText('Imagen · 1,7 MB')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Epicrisis' }));
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Alta de la internación' },
    });
    fireEvent.change(screen.getByLabelText('Fecha del documento (opcional)'), {
      target: { value: '2025-03-12' },
    });
    fireEvent.change(screen.getByLabelText('Institución (opcional)'), {
      target: { value: 'Hospital Italiano' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    // Vuelve a la lista, que ya trae el nuevo.
    expect(await screen.findByText('Alta de la internación')).toBeInTheDocument();
    expect(recibido.subidas).toEqual([
      {
        file: expect.any(String),
        type: 'EPICRISIS',
        title: 'Alta de la internación',
        documentDate: '2025-03-12',
        sourceInstitution: 'Hospital Italiano',
      },
    ]);
    // El archivo va como lo lee el FormData de React Native: desde el disco.
    expect(append).toHaveBeenCalledWith('file', {
      uri: 'file:///cache/ImagePicker/estudio.jpg',
      name: expect.stringMatching(/^foto-.*\.jpg$/),
      type: 'image/jpeg',
    });
    // Comprimida a JPEG, que es lo que evita la HEIC del iPhone.
    expect(__fotos.aperturas[0]).toMatchObject({
      origen: 'camera',
      opciones: { quality: 0.7, mediaTypes: ['images'] },
    });
    // La copia del caché no queda en el teléfono después de subirla.
    expect(__disco.borrados).toEqual(['file:///cache/ImagePicker/estudio.jpg']);
  });

  it('pide la lista entera, que con el tope de 50 vigentes entra en una página', async () => {
    let pedido = '';
    servirDocumentos();
    server.use(
      http.get(`${API_URL}/patients/me/documents`, ({ request }) => {
        pedido = new URL(request.url).search;
        return HttpResponse.json([HEMOGRAMA]);
      }),
    );
    await abrirDocumentos();

    await screen.findByText('Hemograma completo');
    expect(pedido).toBe('?limit=50');
  });

  it('un PDF propone su nombre como título y los opcionales no se mandan vacíos', async () => {
    const recibido = servirDocumentos([]);
    await abrirDocumentos();

    fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir un PDF' }));
    await screen.findByRole('heading', { name: 'Subir documento' });
    expect(screen.getByLabelText('Nombre')).toHaveValue('Hemograma marzo');
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('Hemograma marzo')).toBeInTheDocument();
    expect(recibido.subidas[0]).toEqual({
      file: expect.any(String),
      type: 'ESTUDIO',
      title: 'Hemograma marzo',
    });
  });

  it('pide el nombre antes de subir', async () => {
    const recibido = servirDocumentos([]);
    await abrirDocumentos();
    await sacarFoto();
    await screen.findByRole('heading', { name: 'Subir documento' });

    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText(/Poné un nombre para reconocerlo/)).toBeInTheDocument();
    expect(recibido.subidas).toHaveLength(0);
  });

  // Subir 10 MB por datos móviles para que el backend diga que no es plata y tiempo.
  it('corta un archivo de más de 10 MB antes de subirlo', async () => {
    servirDocumentos([]);
    __fotos.proxima = {
      uri: 'file:///cache/ImagePicker/grande.jpg',
      width: 4000,
      height: 3000,
      fileName: 'grande.jpg',
      fileSize: 11 * 1024 * 1024,
      mimeType: 'image/jpeg',
    };
    await abrirDocumentos();

    fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir de la galería' }));

    expect(await screen.findByText('El archivo no puede pasar los 10 MB.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Subir documento' })).not.toBeInTheDocument();
  });

  it('si el picker no informa el tamaño, lo lee del disco y corta igual', async () => {
    servirDocumentos([]);
    __fotos.proxima = {
      uri: 'file:///cache/ImagePicker/sin-tamano.jpg',
      width: 4000,
      height: 3000,
      fileName: 'sin-tamano.jpg',
      mimeType: 'image/jpeg',
    };
    __disco.tamanos.set('file:///cache/ImagePicker/sin-tamano.jpg', 11 * 1024 * 1024);
    await abrirDocumentos();

    fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir de la galería' }));

    expect(await screen.findByText('El archivo no puede pasar los 10 MB.')).toBeInTheDocument();
    expect(__disco.borrados).toEqual(['file:///cache/ImagePicker/sin-tamano.jpg']);
  });

  it('corta un tipo que no se acepta', async () => {
    servirDocumentos([]);
    __fotos.proxima = {
      uri: 'file:///cache/ImagePicker/animada.gif',
      width: 100,
      height: 100,
      fileName: 'animada.gif',
      fileSize: 1000,
      mimeType: 'image/gif',
    };
    await abrirDocumentos();

    fireEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Elegir de la galería' }));

    expect(await screen.findByText('Solo se pueden subir PDF, JPG o PNG.')).toBeInTheDocument();
  });

  it('sin permiso de cámara explica cómo habilitarla', async () => {
    servirDocumentos([]);
    __fotos.permisoCamara = false;
    await abrirDocumentos();

    await sacarFoto();

    expect(await screen.findByText(/necesita usar la cámara/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir ajustes' })).toBeInTheDocument();
    expect(__fotos.aperturas).toHaveLength(0);
  });

  it('muestra el error del backend y deja reintentar', async () => {
    servirDocumentos([]);
    await abrirDocumentos();
    server.use(
      http.post(`${API_URL}/patients/me/documents`, () =>
        HttpResponse.json(
          { message: 'Completá tu perfil de paciente antes de subir documentos.' },
          { status: 409 },
        ),
      ),
    );
    await sacarFoto();
    await screen.findByRole('heading', { name: 'Subir documento' });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Radiografía' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    expect(
      await screen.findByText('Completá tu perfil de paciente antes de subir documentos.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeEnabled();
  });

  // Multer corta el request antes del controller, sin un mensaje para el paciente.
  it('un 413 dice el límite de 10 MB', async () => {
    servirDocumentos([]);
    await abrirDocumentos();
    server.use(
      http.post(
        `${API_URL}/patients/me/documents`,
        () => new HttpResponse('Payload Too Large', { status: 413 }),
      ),
    );
    await sacarFoto();
    await screen.findByRole('heading', { name: 'Subir documento' });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Radiografía' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('El archivo no puede pasar los 10 MB.')).toBeInTheDocument();
  });

  it('un 422 dice que llegó al tope y qué hacer', async () => {
    servirDocumentos([]);
    await abrirDocumentos();
    server.use(
      http.post(`${API_URL}/patients/me/documents`, () =>
        HttpResponse.json(
          { message: 'Llegaste al máximo de 50 documentos. Retirá alguno para subir otro.' },
          { status: 422 },
        ),
      ),
    );
    await sacarFoto();
    await screen.findByRole('heading', { name: 'Subir documento' });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Radiografía' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    expect(
      await screen.findByText(
        'Llegaste al máximo de 50 documentos. Retirá alguno para subir otro.',
      ),
    ).toBeInTheDocument();
  });

  it('un 400 sin mensaje dice qué tipos se aceptan', async () => {
    servirDocumentos([]);
    await abrirDocumentos();
    server.use(
      http.post(`${API_URL}/patients/me/documents`, () => new HttpResponse(null, { status: 400 })),
    );
    await sacarFoto();
    await screen.findByRole('heading', { name: 'Subir documento' });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Radiografía' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    expect(await screen.findByText('Solo se pueden subir PDF, JPG o PNG.')).toBeInTheDocument();
  });

  it('una subida se puede cancelar y deja volver a intentar', async () => {
    servirDocumentos([]);
    await abrirDocumentos();
    server.use(
      http.post(`${API_URL}/patients/me/documents`, async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );
    await sacarFoto();
    await screen.findByRole('heading', { name: 'Subir documento' });
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Radiografía' } });
    fireEvent.click(screen.getByRole('button', { name: 'Subir' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar envío' }));

    expect(await screen.findByText('Cancelaste el envío.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Cancelar envío' })).not.toBeInTheDocument();
  });

  it('retirar pide confirmación, llama al DELETE y lo saca de la lista', async () => {
    const recibido = servirDocumentos();
    await abrirDocumentos();

    fireEvent.click(await screen.findByRole('button', { name: 'Retirar Hemograma completo' }));
    const hoja = await screen.findByRole('alert');
    expect(within(hoja).getByText(/Deja de verse, pero queda registrado/)).toBeInTheDocument();
    fireEvent.click(within(hoja).getByRole('button', { name: 'Sí, retirarlo' }));

    await waitFor(() => expect(screen.queryByText('Hemograma completo')).not.toBeInTheDocument());
    expect(recibido.retirados).toEqual(['doc-1']);
    expect(screen.getByText('+ Subir el primero')).toBeInTheDocument();
  });

  it('si ya estaba retirado (404), cierra la hoja y actualiza la lista', async () => {
    servirDocumentos();
    await abrirDocumentos();
    // Lo retiraron desde la web: el DELETE da 404 y la lista ya no lo trae.
    server.use(
      http.delete(`${API_URL}/patients/me/documents/:id`, () =>
        HttpResponse.json({ message: 'No encontramos ese documento.' }, { status: 404 }),
      ),
      http.get(`${API_URL}/patients/me/documents`, () => HttpResponse.json([])),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Retirar Hemograma completo' }));
    const hoja = await screen.findByRole('alert');
    fireEvent.click(within(hoja).getByRole('button', { name: 'Sí, retirarlo' }));

    await waitFor(() => expect(screen.queryByText('Hemograma completo')).not.toBeInTheDocument());
    expect(screen.queryByText('No encontramos ese documento.')).not.toBeInTheDocument();
  });

  it('ver pide la URL firmada y la abre', async () => {
    servirDocumentos();
    await abrirDocumentos();

    fireEvent.click(await screen.findByRole('button', { name: 'Ver Hemograma completo' }));

    await waitFor(() =>
      expect(__abiertas).toEqual(['https://storage.mediconnect.test/firmada/doc-1?token=abc']),
    );
  });

  it('si la lista no carga, lo dice y deja reintentar', async () => {
    await renderApp(
      http.get(`${API_URL}/patients/me/documents`, () =>
        HttpResponse.json({ message: 'No pudimos cargar tus documentos.' }, { status: 500 }),
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Historia clínica' }));

    expect(
      await screen.findByText('No pudimos cargar tus documentos.', {}, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probá de nuevo' })).toBeInTheDocument();
  });
});
