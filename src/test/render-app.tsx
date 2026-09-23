import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

import { turnosDemo } from '../mocks/appointments';
import { accesosDemo } from '../mocks/medipass';
import { RootNavigator } from '../navigation/RootNavigator';

/**
 * Monta la app entera —navegador real, datos de ejemplo— con una caché nueva y
 * los datos de ejemplo recién armados, para que un test no herede lo que otro
 * canceló o revocó.
 */
export async function renderApp(): Promise<void> {
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
