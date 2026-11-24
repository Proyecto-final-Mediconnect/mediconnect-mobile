import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { RootNavigator } from '../navigation/RootNavigator';
import { API_URL, server } from '../test/msw-server';

// ENG-235: crear la cuenta de paciente desde la app, con el navegador real y la
// API respondida por MSW.

async function abrirRegistro(): Promise<void> {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <RootNavigator />
    </QueryClientProvider>,
  );
  fireEvent.click(await screen.findByRole('link', { name: 'Crear una cuenta' }));
  await screen.findByRole('heading', { name: 'Crear cuenta' });
}

/**
 * El campo del registro: el ingreso queda montado debajo en el stack, con su
 * propio "Email" y su "Contraseña".
 */
function campo(label: string): HTMLElement {
  return screen.getAllByLabelText(label).at(-1)!;
}

function completar({
  email = 'nueva@mail.com',
  password = 'Clave2026',
  confirmacion = password,
  aceptar = true,
}: { email?: string; password?: string; confirmacion?: string; aceptar?: boolean } = {}): void {
  fireEvent.change(campo('Email'), { target: { value: email } });
  fireEvent.change(campo('Contraseña'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
    target: { value: confirmacion },
  });
  if (aceptar) fireEvent.click(screen.getByRole('checkbox'));
}

function enviar(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

/** `POST /auth/register` que responde como el backend y guarda lo que recibió. */
function registroQueResponde(): { body: unknown } {
  const recibido: { body: unknown } = { body: undefined };
  server.use(
    http.post(`${API_URL}/auth/register`, async ({ request }) => {
      recibido.body = await request.json();
      return HttpResponse.json(
        { message: 'Si el email no estaba registrado, te enviamos un enlace.' },
        { status: 201 },
      );
    }),
  );
  return recibido;
}

describe('RegisterScreen', () => {
  it('se llega desde el ingreso, que ya no manda a registrarse en la web', async () => {
    await abrirRegistro();

    expect(screen.queryByText(/Registrate desde la web/)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false');
  });

  it('valida como la web y no manda nada si falta algo', async () => {
    let llamadas = 0;
    server.use(
      http.post(`${API_URL}/auth/register`, () => {
        llamadas += 1;
        return HttpResponse.json({ message: 'ok' }, { status: 201 });
      }),
    );
    await abrirRegistro();

    completar({ email: 'nueva', password: 'clave', confirmacion: 'otra', aceptar: false });
    enviar();

    expect(await screen.findByText('El email no tiene un formato válido')).toBeVisible();
    expect(screen.getByText('La contraseña debe tener al menos 8 caracteres')).toBeVisible();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeVisible();
    expect(
      screen.getByText(/tenés que aceptar los términos y condiciones, la política de privacidad/),
    ).toBeVisible();
    expect(llamadas).toBe(0);
  });

  it('muestra las reglas de la contraseña y las tilda mientras se escribe', async () => {
    await abrirRegistro();

    expect(screen.getByLabelText('Una mayúscula (falta)')).toBeInTheDocument();
    fireEvent.change(campo('Contraseña'), { target: { value: 'Clave' } });

    expect(screen.getByLabelText('Una mayúscula (cumplido)')).toBeInTheDocument();
    expect(screen.getByLabelText('Al menos 8 caracteres (falta)')).toBeInTheDocument();
    expect(screen.getByLabelText('Un número (falta)')).toBeInTheDocument();
  });

  it('crea la cuenta con la versión de los textos aceptados y explica que falta confirmar el email', async () => {
    const recibido = registroQueResponde();
    await abrirRegistro();

    completar({ email: '  nueva@mail.com ' });
    enviar();

    expect(await screen.findByRole('heading', { name: 'Revisá tu email' })).toBeVisible();
    expect(screen.getByText(/Si nueva@mail.com todavía no estaba registrado/)).toBeVisible();
    expect(recibido.body).toEqual({
      email: 'nueva@mail.com',
      password: 'Clave2026',
      passwordConfirmation: 'Clave2026',
      acceptedLegalVersion: '2026-10-13',
    });
  });

  it('"Ir a ingresar" vuelve al ingreso con el email escrito y el aviso de confirmarlo', async () => {
    registroQueResponde();
    await abrirRegistro();
    completar();
    enviar();

    fireEvent.click(await screen.findByRole('button', { name: 'Ir a ingresar' }));

    expect(await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible();
    expect(screen.getByLabelText('Email')).toHaveValue('nueva@mail.com');
    expect(
      screen.getByText('Confirmá tu email con el enlace que te mandamos y después ingresá acá.'),
    ).toBeVisible();
  });

  it('muestra el error del backend y deja reintentar', async () => {
    server.use(
      http.post(`${API_URL}/auth/register`, () =>
        HttpResponse.json(
          { message: 'Demasiados intentos. Probá de nuevo en unos minutos.' },
          { status: 503 },
        ),
      ),
    );
    await abrirRegistro();
    completar();
    enviar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiados intentos. Probá de nuevo en unos minutos.',
    );
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });

  it('un error sin mensaje para la persona muestra uno genérico', async () => {
    server.use(
      http.post(`${API_URL}/auth/register`, () =>
        HttpResponse.json({ message: ['email must be an email'] }, { status: 400 }),
      ),
    );
    await abrirRegistro();
    completar();
    enviar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos crear tu cuenta. Intentá de nuevo.',
    );
  });

  it('"¿Ya tenés cuenta?" vuelve al ingreso', async () => {
    await abrirRegistro();

    fireEvent.click(screen.getByText('Ingresá'));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Ingresá a tu cuenta' })).toBeVisible(),
    );
    expect(
      screen.queryByText('Confirmá tu email con el enlace que te mandamos y después ingresá acá.'),
    ).not.toBeInTheDocument();
  });
});
