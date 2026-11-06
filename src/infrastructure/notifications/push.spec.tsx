import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Alert } from 'react-native';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { __notifications } from '../../../test-stubs/expo-notifications';
import { __secureStore } from '../../../test-stubs/expo-secure-store';
import { CONVERSACION_GARCIA, GARCIA_CHAT } from '../../mocks/chat';
import { isViewingConversation } from '../../navigation/push-routing';
import { API_URL, server } from '../../test/msw-server';
import { renderApp } from '../../test/render-app';
import { messagePushData } from './push';

/*
 * Push por mensajes nuevos (ENG-71), con la app entera: el permiso, el token en
 * el backend, el toque del aviso y el cierre de sesión.
 */

const AVISO = {
  tipo: 'NUEVO_MENSAJE',
  conversationId: CONVERSACION_GARCIA,
  contraparteId: GARCIA_CHAT.id,
  nombre: GARCIA_CHAT.nombre,
};

/** Registra lo que la app le pide al backend sobre los tokens de push. */
function backendDeTokens(): { registrados: unknown[]; borrados: string[] } {
  const registro = { registrados: [] as unknown[], borrados: [] as string[] };
  server.use(
    http.post(`${API_URL}/push-tokens`, async ({ request }) => {
      registro.registrados.push(await request.json());
      return new HttpResponse(null, { status: 204 });
    }),
    http.delete(`${API_URL}/push-tokens/:token`, ({ params }) => {
      registro.borrados.push(decodeURIComponent(String(params.token)));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return registro;
}

/** Contesta el diálogo que explica el permiso con el botón `respuesta`. */
function contestarExplicacion(respuesta: 'Activar' | 'Ahora no') {
  return vi.spyOn(Alert, 'alert').mockImplementation((_t, _m, botones) => {
    botones?.find((b) => b.text === respuesta)?.onPress?.();
  });
}

afterEach(() => {
  __notifications.reset();
  vi.restoreAllMocks();
});

describe('Notificaciones push (ENG-71)', () => {
  it('explica el permiso antes de pedirlo y registra el token del celular', async () => {
    const explicacion = contestarExplicacion('Activar');
    const backend = backendDeTokens();

    await renderApp();

    await waitFor(() =>
      expect(backend.registrados).toEqual([
        { token: 'ExponentPushToken[test-token-123]', platform: 'android' },
      ]),
    );
    expect(explicacion).toHaveBeenCalledWith(
      'Avisos de mensajes',
      expect.stringMatching(/quién te escribió, no lo que te escribió/),
      expect.any(Array),
      expect.any(Object),
    );
    expect(__notifications.state.requested).toBe(1);
  });

  it('con "Ahora no" no pide el permiso, no registra nada y no vuelve a preguntar', async () => {
    const explicacion = contestarExplicacion('Ahora no');
    const backend = backendDeTokens();

    await renderApp();
    await waitFor(() => expect(explicacion).toHaveBeenCalledTimes(1));

    expect(__notifications.state.requested).toBe(0);
    expect(backend.registrados).toEqual([]);
    expect(__secureStore.items.get('push-permiso-explicado')).toBe('1');
  });

  it('en Android 13+ el permiso arranca en "denied" pero se puede pedir: lo explica y lo pide', async () => {
    __notifications.state.status = 'denied';
    __notifications.state.canAskAgain = true;
    const explicacion = contestarExplicacion('Activar');
    const backend = backendDeTokens();

    await renderApp();

    await waitFor(() => expect(backend.registrados).toHaveLength(1));
    expect(explicacion).toHaveBeenCalledTimes(1);
    expect(__notifications.state.requested).toBe(1);
  });

  it('si el permiso está denegado, la app anda igual y no registra nada', async () => {
    __notifications.state.status = 'denied';
    __notifications.state.canAskAgain = false;
    const explicacion = contestarExplicacion('Activar');
    const backend = backendDeTokens();

    await renderApp();

    expect(explicacion).not.toHaveBeenCalled();
    expect(backend.registrados).toEqual([]);
  });

  it('tocar el aviso abre esa conversación', async () => {
    __notifications.state.status = 'denied';
    __notifications.state.canAskAgain = false;

    await renderApp();
    act(() => __notifications.tap(AVISO));

    expect(await screen.findByRole('heading', { name: 'Ana García' })).toBeInTheDocument();
  });

  it('el aviso que abrió la app lleva a su conversación al terminar de cargar', async () => {
    __notifications.state.status = 'denied';
    __notifications.state.canAskAgain = false;
    __notifications.state.lastResponse = {
      notification: { request: { content: { data: AVISO } } },
    };

    await renderApp();

    expect(await screen.findByRole('heading', { name: 'Ana García' })).toBeInTheDocument();
    // Ya usado: abrir la app de nuevo desde el ícono no vuelve a este chat.
    expect(__notifications.state.lastResponse).toBeNull();
  });

  it('cerrar sesión borra el token del backend antes de soltar la sesión', async () => {
    contestarExplicacion('Activar');
    const backend = backendDeTokens();

    await renderApp();
    await waitFor(() => expect(backend.registrados).toHaveLength(1));

    fireEvent.click(screen.getByRole('tab', { name: 'Perfil' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Sí, cerrar sesión' }));
    await screen.findByRole('heading', { name: 'Ingresá a tu cuenta' });

    await waitFor(() => expect(backend.borrados).toEqual(['ExponentPushToken[test-token-123]']));
  });
});

describe('qué avisos se entienden y cuándo se muestran', () => {
  it('solo se entiende el aviso de mensaje con todos sus datos', () => {
    expect(messagePushData(AVISO)).toEqual(AVISO);
    expect(messagePushData({ ...AVISO, tipo: 'OTRO' })).toBeNull();
    expect(messagePushData({ tipo: 'NUEVO_MENSAJE' })).toBeNull();
    expect(messagePushData(null)).toBeNull();
  });

  it('con la app abierta en esa conversación el aviso no se muestra; en otra pantalla sí', async () => {
    const enElChat = { name: 'Conversacion', params: { conversationId: CONVERSACION_GARCIA } };

    expect(isViewingConversation(enElChat, CONVERSACION_GARCIA)).toBe(true);
    expect(isViewingConversation(enElChat, 'otra')).toBe(false);
    expect(isViewingConversation({ name: 'Inicio' }, CONVERSACION_GARCIA)).toBe(false);

    const decidir = await __notifications.state.handler!.handleNotification({
      request: { content: { data: AVISO } },
    });
    // Sin navegador montado no está en ningún chat: se muestra.
    expect(decidir.shouldShowBanner).toBe(true);
  });
});
