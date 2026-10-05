// Extiende los matchers de Vitest con los de @testing-library/jest-dom
// (toBeInTheDocument, toHaveTextContent, etc.).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// jsdom no implementa `ResizeObserver` y `@react-navigation/elements` lo usa en
// su camino web para medir el header. ADR-016.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
