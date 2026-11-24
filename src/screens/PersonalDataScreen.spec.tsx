import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { API_URL } from '../test/msw-server';
import { FICHA } from '../test/patient-api';
import { renderApp } from '../test/render-app';

// ENG-236: completar y editar los datos personales desde la app.

async function abrirDatos(
  boton: string,
  ...respuestas: Parameters<typeof renderApp>
): Promise<void> {
  await renderApp(...respuestas);
  fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
  fireEvent.click(await screen.findByRole('button', { name: boton }));
}

function escribir(label: string, valor: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value: valor } });
}

function guardar(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar mis datos' }));
}

describe('Mis datos personales', () => {
  it('arranca con los datos de la ficha, y sin cambios no deja guardar', async () => {
    await abrirDatos('Editar mis datos');

    expect(await screen.findByLabelText('Nombre')).toHaveValue('Marina');
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveValue('12/04/1985');
    expect(screen.getByLabelText('DNI')).toHaveValue(FICHA.dni);
    expect(screen.getByRole('button', { name: 'Guardar mis datos' })).toBeDisabled();
  });

  it('al guardar manda los cinco datos y el nombre nuevo se ve en toda la app', async () => {
    let body: unknown;
    await abrirDatos(
      'Editar mis datos',
      http.put(`${API_URL}/patients/me`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ ...FICHA, ...(body as object), completed: true });
      }),
    );

    await screen.findByLabelText('Nombre');
    escribir('Nombre', 'Marina Inés');
    guardar();

    // Vuelve al perfil, con el nombre nuevo arriba.
    expect(await screen.findByText('Marina Inés Sosa')).toBeVisible();
    expect(body).toEqual({
      firstName: 'Marina Inés',
      lastName: 'Sosa',
      birthDate: '1985-04-12',
      dni: '30418992',
      phone: '+54 351 555 0192',
    });

    // El saludo del inicio también, sin reiniciar.
    fireEvent.click(screen.getByRole('tab', { name: 'Inicio' }));
    expect(
      await screen.findByRole('heading', {
        name: /^(Buen día|Buenas tardes|Buenas noches), Marina Inés$/,
      }),
    ).toBeVisible();
  });

  it('con la ficha sin completar, la completa y el aviso del perfil desaparece', async () => {
    await abrirDatos(
      'Completar mis datos',
      http.get(`${API_URL}/patients/me`, () =>
        HttpResponse.json({ ...FICHA, birthDate: null, dni: null, phone: null, completed: false }),
      ),
    );

    expect(await screen.findByRole('heading', { name: 'Completar mis datos' })).toBeVisible();
    escribir('Fecha de nacimiento', '12041985');
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveValue('12/04/1985');
    escribir('DNI', '30.418.992');
    escribir('Teléfono', '+54 351 555 0192');
    guardar();

    expect(await screen.findByRole('button', { name: 'Editar mis datos' })).toBeVisible();
    expect(screen.queryByText(/Todavía no completaste tus datos/)).not.toBeInTheDocument();
  });

  it('valida antes de mandar, con los mensajes de la web', async () => {
    let llamadas = 0;
    await abrirDatos(
      'Editar mis datos',
      http.put(`${API_URL}/patients/me`, () => {
        llamadas += 1;
        return HttpResponse.json(FICHA);
      }),
    );

    await screen.findByLabelText('Apellido');
    escribir('Apellido', ' ');
    escribir('DNI', '123');
    guardar();

    expect(await screen.findByText('El apellido es obligatorio')).toBeVisible();
    expect(
      screen.getByText('El DNI debe tener 7 u 8 dígitos (sin puntos ni letras)'),
    ).toBeVisible();
    expect(llamadas).toBe(0);
  });

  it('un DNI que ya usa otro paciente se marca en el DNI', async () => {
    await abrirDatos(
      'Editar mis datos',
      http.put(`${API_URL}/patients/me`, () =>
        HttpResponse.json({ message: 'Ese DNI ya está registrado.' }, { status: 409 }),
      ),
    );

    await screen.findByLabelText('DNI');
    escribir('DNI', '20111222');
    guardar();

    expect(await screen.findByText('Ese DNI ya está registrado.')).toBeVisible();
    // Al corregirlo, el aviso se va.
    escribir('DNI', '20111223');
    await waitFor(() =>
      expect(screen.queryByText('Ese DNI ya está registrado.')).not.toBeInTheDocument(),
    );
  });

  it('si el backend falla, lo dice y deja reintentar', async () => {
    await abrirDatos(
      'Editar mis datos',
      http.put(`${API_URL}/patients/me`, () =>
        HttpResponse.json(
          { message: 'No pudimos guardar tu perfil. Probá de nuevo en unos minutos.' },
          { status: 500 },
        ),
      ),
    );

    await screen.findByLabelText('Teléfono');
    escribir('Teléfono', '+54 351 555 0000');
    guardar();

    expect(
      await screen.findByText('No pudimos guardar tu perfil. Probá de nuevo en unos minutos.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Guardar mis datos' })).toBeEnabled();
  });
});
