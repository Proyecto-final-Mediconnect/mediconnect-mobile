import { QueryClient } from '@tanstack/react-query';

/**
 * Mismo criterio que la web: un reintento y no más. En un celular con señal
 * que va y viene conviene uno; más de uno deja al paciente mirando una ruedita
 * que no avisa que algo falló.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: 1 } } });
}
