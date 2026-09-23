import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import * as Brightness from 'expo-brightness';
import { describe, expect, it } from 'vitest';

import { renderApp } from '../test/render-app';

async function abrirMediPass(): Promise<void> {
  await renderApp();
  fireEvent.click(screen.getByRole('tab', { name: 'MediPass' }));
  await screen.findByText('Dra. Valeria Ocampo');
}

describe('Mi MediPass (ENG-117)', () => {
  it('muestra el código rotatorio con su cuenta regresiva', async () => {
    await abrirMediPass();

    expect(screen.getByTestId('qr-value')).toHaveTextContent(/^MP-AR-8F42-[0-9A-F]{4}$/);
    expect(screen.getByText(/^Se renueva en \d\d:\d\d$/)).toBeInTheDocument();
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

  it('revocar pide confirmación y saca el acceso de la lista', async () => {
    await abrirMediPass();

    fireEvent.click(
      screen.getByRole('button', { name: 'Revocar el acceso de Dra. Valeria Ocampo' }),
    );
    const hoja = await screen.findByRole('alert');
    fireEvent.click(within(hoja).getByRole('button', { name: 'Revocar acceso' }));

    await waitFor(() => expect(screen.queryByText('Dra. Valeria Ocampo')).not.toBeInTheDocument());
    expect(screen.getByText('Guardia · Hospital Italiano')).toBeInTheDocument();
  });

  // Un teléfono que queda sobre una mesa no puede seguir mostrando la llave.
  it('oculta el código cuando la app pasa a segundo plano', async () => {
    await abrirMediPass();

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(await screen.findByText('Código oculto')).toBeInTheDocument();
    expect(screen.queryByTestId('qr-value')).not.toBeInTheDocument();

    act(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar código' }));

    expect(screen.getByTestId('qr-value')).toBeInTheDocument();
  });
});
