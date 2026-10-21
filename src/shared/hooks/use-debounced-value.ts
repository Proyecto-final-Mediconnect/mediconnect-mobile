import { useEffect, useState } from 'react';

/**
 * El valor, pero recién cuando deja de cambiar por `ms`. Para un buscador que
 * consulta al backend: sin esto, cada letra sería un request.
 */
export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [demorado, setDemorado] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDemorado(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);

  return demorado;
}
