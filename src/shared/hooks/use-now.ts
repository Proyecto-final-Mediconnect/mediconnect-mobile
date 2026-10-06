import { useEffect, useState } from 'react';

/**
 * La hora actual, refrescada cada `intervaloMs`. Para lo que depende del reloj
 * sin que nadie toque nada: el botón de la sala que aparece solo a los 10
 * minutos, la cuenta regresiva del MediPass.
 */
export function useNow(intervaloMs: number): Date {
  const [ahora, setAhora] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);

  return ahora;
}
