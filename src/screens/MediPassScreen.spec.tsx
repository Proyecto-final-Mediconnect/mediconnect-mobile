import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as Brightness from 'expo-brightness';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { codigoDemo } from '../mocks/medipass';
import { API_URL } from '../test/msw-server';
import { renderApp } from '../test/render-app';

function pasarA(estado: 'hidden' | 'visible'): void {
  act(() => {
    Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

async function abrirMediPass(...respuestas: Parameters<typeof renderApp>): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(screen.getByRole('tab', { name: 'MediPass' }));
  await screen.findByText('Dra. Valeria Ocampo');
}

describe('Mi MediPass (ENG-117)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('ya no es una vista previa: muestra los datos del backend', async () => {
    await abrirMediPass();

    expect(screen.queryByText(/Vista previa con datos de ejemplo/)).not.toBeInTheDocument();
  });

  it('el QR lleva la ficha de emergencia de la web con el código del backend', async () => {
    await abrirMediPass();
    const { codigo } = codigoDemo();

    expect(await screen.findByTestId('qr-value')).toHaveTextContent(
      new RegExp(`/medipass/emergencia\\?codigo=${codigo}$`),
    );
    expect(screen.getByText(`${codigo.slice(0, 4)}-${codigo.slice(4)}`)).toBeInTheDocument();
    expect(screen.getByText(/^Se renueva en \d\d:\d\d$/)).toBeInTheDocument();
  });

  it('si no puede pedir el código lo dice y deja reintentar', async () => {
    await abrirMediPass(
      http.get(`${API_URL}/medipass/me`, () =>
        HttpResponse.json({ message: 'No pudimos cargar tu código MediPass.' }, { status: 500 }),
      ),
    );

    expect(await screen.findByText('No pudimos cargar tu código MediPass.')).toBeInTheDocument();
    expect(screen.queryByTestId('qr-value')).not.toBeInTheDocument();
  });

  it('con el bloque vital sin cargar dice qué falta', async () => {
    await abrirMediPass(
      http.get(`${API_URL}/medipass/me/vital`, () => HttpResponse.json({ nombre: 'Marina Sosa' })),
    );

    expect((await screen.findAllByText('Sin cargar')).length).toBeGreaterThan(0);
  });

  it('muestra lo que ve quien lo escanea', async () => {
    await abrirMediPass();

    expect(await screen.findByText('Penicilina')).toBeInTheDocument();
    expect(screen.getByText('0 Rh+')).toBeInTheDocument();
    expect(screen.getByText('Apixabán 5 mg')).toBeInTheDocument();
  });

  it('sube el brillo mientras está abierto', async () => {
    await abrirMediPass();

    await waitFor(async () => expect(await Brightness.getBrightnessAsync()).toBe(1));
  });

  // En iOS el brillo es el del sistema: minimizar la app no puede dejarlo al máximo.
  it('devuelve el brillo al pasar a segundo plano y lo vuelve a subir al volver', async () => {
    await Brightness.setBrightnessAsync(0.4);
    await abrirMediPass();
    await waitFor(async () => expect(await Brightness.getBrightnessAsync()).toBe(1));

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(async () => expect(await Brightness.getBrightnessAsync()).toBe(0.4));

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(async () => expect(await Brightness.getBrightnessAsync()).toBe(1));
  });

  it('revocar pide confirmación y saca el acceso de la lista', async () => {
    await abrirMediPass();

    fireEvent.click(
      screen.getByRole('button', { name: 'Revocar el acceso de Dra. Valeria Ocampo' }),
    );
    const hoja = await screen.findByRole('alert');
    fireEvent.click(within(hoja).getByRole('button', { name: 'Revocar acceso' }));

    await waitFor(() => expect(screen.queryByText('Dra. Valeria Ocampo')).not.toBeInTheDocument());
    expect(screen.getByText('Guardia Hospital Italiano')).toBeInTheDocument();
  });

  // Un teléfono que queda sobre una mesa no puede seguir mostrando la llave.
  it('oculta el código cuando la app pasa a segundo plano', async () => {
    await abrirMediPass();

    await screen.findByTestId('qr-value');

    pasarA('hidden');

    expect(await screen.findByText('Código oculto')).toBeInTheDocument();
    expect(screen.queryByTestId('qr-value')).not.toBeInTheDocument();

    pasarA('visible');
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar código' }));

    // Se pide de nuevo al backend: el anterior no quedó guardado.
    expect(await screen.findByTestId('qr-value')).toBeInTheDocument();
  });

  // ENG-149: el paciente elige qué ve quien escanea, desde la misma ficha.
  it('apagar un bloque lo marca como oculto para quien escanea', async () => {
    await abrirMediPass();

    const interruptor = await screen.findByLabelText('Mostrar medicación a quien escanea');
    fireEvent.click(interruptor);

    expect(await screen.findByText('No lo ve quien escanea tu código')).toBeInTheDocument();
  });
  // Un código vencido no se puede quedar en pantalla porque falló la renovación.
  it('si al vencer no puede renovar el código, no muestra el viejo y deja reintentar', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let pedidos = 0;
    await abrirMediPass(
      http.get(`${API_URL}/medipass/me`, () => {
        pedidos += 1;
        if (pedidos === 1) {
          return HttpResponse.json({
            codigo: 'AB12CD34',
            expiraEl: new Date(Date.now() + 2_000).toISOString(),
          });
        }
        if (pedidos === 2) return HttpResponse.json({ message: 'Error' }, { status: 503 });
        return HttpResponse.json(codigoDemo());
      }),
    );
    expect(await screen.findByText('AB12-CD34')).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(6_000));

    expect(await screen.findByText('No pudimos renovar tu código.')).toBeInTheDocument();
    expect(screen.queryByText('AB12-CD34')).not.toBeInTheDocument();
    expect(screen.queryByTestId('qr-value')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Probá de nuevo' }));

    expect(await screen.findByTestId('qr-value')).toBeInTheDocument();
  });

  it('no pide el código mientras está en otra pestaña y lo vuelve a pedir al volver', async () => {
    let pedidos = 0;
    await abrirMediPass(
      http.get(`${API_URL}/medipass/me`, () => {
        pedidos += 1;
        return HttpResponse.json(codigoDemo());
      }),
    );
    await screen.findByTestId('qr-value');
    expect(pedidos).toBe(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Turnos' }));
    fireEvent.click(screen.getByRole('tab', { name: 'MediPass' }));

    await waitFor(() => expect(pedidos).toBe(2));
    expect(await screen.findByTestId('qr-value')).toBeInTheDocument();
  });

  it('si no carga el scope lo avisa en vez de mostrar el bloque sin interruptores', async () => {
    let falla = true;
    await abrirMediPass(
      http.get(`${API_URL}/medipass/me/scope`, () =>
        falla
          ? HttpResponse.json({ message: 'Error' }, { status: 500 })
          : HttpResponse.json({ vital: true, medicacion: true, condiciones: true, contacto: true }),
      ),
    );

    expect(
      await screen.findByText(/No pudimos cargar qué bloques ve quien escanea/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Mostrar medicación a quien escanea')).not.toBeInTheDocument();

    falla = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByLabelText('Mostrar medicación a quien escanea')).toBeInTheDocument();
  });
});
