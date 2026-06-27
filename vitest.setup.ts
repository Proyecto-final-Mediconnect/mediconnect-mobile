// Extiende los matchers de Vitest con los de @testing-library/jest-dom
// (toBeInTheDocument, toHaveTextContent, etc.).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
