import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VitalSummary } from './VitalSummary';

describe('VitalSummary', () => {
  // Dato clínico mostrado a un tercero: no puede recortarse con "…" en
  // pantallas angostas o con fuente grande.
  it('no recorta el rótulo ni el valor del grupo sanguíneo', () => {
    render(<VitalSummary vital={{ nombre: 'Ana', grupoSanguineo: 'AB RH negativo', edad: 42 }} />);

    for (const texto of ['GRUPO SANGUÍNEO', 'AB RH negativo', '42 años']) {
      const el = screen.getByText(texto);
      // react-native-web traduce numberOfLines={1} a estas clases.
      expect(el.className).not.toMatch(/r-textOverflow|r-whiteSpace/);
    }
  });
});
