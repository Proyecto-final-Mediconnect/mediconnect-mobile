import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { RequestHandler } from 'msw';

import { turnosDemo } from '../mocks/appointments';
import { accesosDemo } from '../mocks/medipass';
import { RootNavigator } from '../navigation/RootNavigator';
import { server } from './msw-server';
import { servirDatosDelPaciente } from './patient-api';
import { iniciarSesionGuardada } from './session';

/**
 * Monta la app entera —navegador real, datos de ejemplo, sesión iniciada— con una caché nueva y
 * los datos de ejemplo recién armados, para que un test no herede lo que otro
 * canceló o revocó.
 *
 * `respuestas` reemplaza lo que contesta el backend desde el primer request,
 * para probar errores o casos que los datos de ejemplo no traen.
 */
export async function renderApp(...respuestas: RequestHandler[]): Promise<void> {
  await iniciarSesionGuardada();
  servirDatosDelPaciente();
  if (respuestas.length) server.use(...respuestas);
  turnosDemo.reiniciar();
  accesosDemo.reiniciar();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>,
  );

  await screen.findByRole('heading', { name: /^Hola/ });
}
