import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatMessage, MessagesPage } from '../types';
import {
  CHAT_INBOX_KEY,
  INBOX_INVALIDATE_MS,
  INBOX_LIVE_REFRESH_MS,
  INBOX_REFRESH_MS,
  SIGNAL_REFETCH_MS,
  TYPING_VISIBLE_MS,
  useChatSignals,
  useConversationRealtime,
  useConversations,
  useInboxRealtime,
} from './use-chat';

/** Los hooks de Realtime del chat (ENG-70): suscripción, AppState y ahorro de pedidos. */

const rt = vi.hoisted(() => ({
  inboxLive: false,
  subscribeToInbox: vi.fn(),
  subscribeToConversation: vi.fn(),
  subscribeToChatSignals: vi.fn(),
}));
vi.mock('../lib/realtime', () => ({
  isInboxLive: () => rt.inboxLive,
  subscribeToInbox: rt.subscribeToInbox,
  subscribeToConversation: rt.subscribeToConversation,
  subscribeToChatSignals: rt.subscribeToChatSignals,
}));

const api = vi.hoisted(() => ({ getMessages: vi.fn(), getMyConversations: vi.fn() }));
vi.mock('../api', () => ({
  getMessages: api.getMessages,
  getMyConversations: api.getMyConversations,
  markConversationRead: vi.fn(),
  openConversation: vi.fn(),
  sendAttachment: vi.fn(),
  sendMessage: vi.fn(),
}));

/** AppState controlable: el estado actual y quién escucha los cambios. */
const app = { state: 'active', listeners: new Set<(s: string) => void>() };
function cambiarAppState(state: string): void {
  app.state = state;
  act(() => app.listeners.forEach((l) => l(state)));
}

let queryClient: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const msg = (id: string): ChatMessage => ({
  id,
  conversacionId: 'c1',
  autorId: 'otro',
  contenido: id,
  enviadoEl: '2026-10-30T12:00:00.000Z',
  leidoEl: null,
});
const pagina = (...ids: string[]): MessagesPage => ({ mensajes: ids.map(msg), hayMas: false });

beforeEach(() => {
  vi.useFakeTimers();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  app.state = 'active';
  app.listeners.clear();
  rt.inboxLive = false;
  rt.subscribeToInbox.mockReset().mockReturnValue(vi.fn());
  rt.subscribeToConversation.mockReset().mockReturnValue(vi.fn());
  rt.subscribeToChatSignals.mockReset().mockReturnValue({
    notifyTyping: vi.fn(),
    notifyMessage: vi.fn(),
    notifyRead: vi.fn(),
    stop: vi.fn(),
  });
  api.getMessages.mockReset().mockResolvedValue(pagina('m1'));
  api.getMyConversations.mockReset().mockResolvedValue({ conversaciones: [], disponibles: [] });
  vi.spyOn(AppState, 'addEventListener').mockImplementation(((
    _t: string,
    cb: (s: string) => void,
  ) => {
    app.listeners.add(cb);
    return { remove: () => app.listeners.delete(cb) };
  }) as never);
  Object.defineProperty(AppState, 'currentState', { get: () => app.state, configurable: true });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useInboxRealtime', () => {
  it('varios INSERT seguidos releen la bandeja una sola vez', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useInboxRealtime(), { wrapper });
    const onChange = rt.subscribeToInbox.mock.calls[0]![0] as () => void;

    onChange();
    onChange();
    onChange();
    expect(invalidate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(INBOX_INVALIDATE_MS);

    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CHAT_INBOX_KEY });
  });

  it('en segundo plano baja la suscripción y al volver se une y relee la bandeja', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    const baja = vi.fn();
    rt.subscribeToInbox.mockReturnValue(baja);
    renderHook(() => useInboxRealtime(), { wrapper });
    expect(rt.subscribeToInbox).toHaveBeenCalledTimes(1);

    cambiarAppState('background');
    expect(baja).toHaveBeenCalledTimes(1);
    expect(rt.subscribeToInbox).toHaveBeenCalledTimes(1);

    cambiarAppState('active');
    expect(rt.subscribeToInbox).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(INBOX_INVALIDATE_MS);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('inactive (selector de apps) no corta la suscripción', () => {
    const baja = vi.fn();
    rt.subscribeToInbox.mockReturnValue(baja);
    renderHook(() => useInboxRealtime(), { wrapper });

    cambiarAppState('inactive');

    expect(baja).not.toHaveBeenCalled();
  });

  it('Home y Mensajes montan el hook a la vez y cada uno se suscribe y se baja por su cuenta', () => {
    const bajas = [vi.fn(), vi.fn()];
    rt.subscribeToInbox.mockReturnValueOnce(bajas[0]).mockReturnValueOnce(bajas[1]);
    const home = renderHook(() => useInboxRealtime(), { wrapper });
    const mensajes = renderHook(() => useInboxRealtime(), { wrapper });

    expect(rt.subscribeToInbox).toHaveBeenCalledTimes(2);
    home.unmount();
    expect(bajas[0]).toHaveBeenCalledTimes(1);
    expect(bajas[1]).not.toHaveBeenCalled();
    mensajes.unmount();
    expect(bajas[1]).toHaveBeenCalledTimes(1);
  });
});

describe('useConversations', () => {
  async function pedidosEn(ms: number): Promise<number> {
    renderHook(() => useConversations(), { wrapper });
    await vi.advanceTimersByTimeAsync(0);
    api.getMyConversations.mockClear();
    await vi.advanceTimersByTimeAsync(ms);
    return api.getMyConversations.mock.calls.length;
  }

  it('sin el canal de la bandeja en vivo, se refresca cada 15 s', async () => {
    expect(await pedidosEn(INBOX_REFRESH_MS)).toBe(1);
  });

  it('con el canal en vivo, aflojan a 30 s', async () => {
    rt.inboxLive = true;
    expect(await pedidosEn(INBOX_REFRESH_MS)).toBe(0);
    await vi.advanceTimersByTimeAsync(INBOX_LIVE_REFRESH_MS - INBOX_REFRESH_MS);
    expect(api.getMyConversations).toHaveBeenCalledTimes(1);
  });
});

describe('useConversationRealtime', () => {
  const ultimoEstado = () =>
    rt.subscribeToConversation.mock.calls.at(-1)![2] as (s: string) => void;

  it('al quedar en vivo pide solo lo último, no todas las páginas', async () => {
    queryClient.setQueryData<InfiniteData<MessagesPage, string | undefined>>(
      ['chat', 'messages', 'c1'],
      { pages: [pagina('m2'), pagina('m1')], pageParams: [undefined, 'm2'] },
    );
    const fetchPages = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useConversationRealtime('c1'), { wrapper });
    expect(result.current).toBe('conectando');

    act(() => ultimoEstado()('en-vivo'));
    await vi.advanceTimersByTimeAsync(0);

    expect(result.current).toBe('en-vivo');
    expect(api.getMessages).toHaveBeenCalledTimes(1);
    expect(api.getMessages).toHaveBeenCalledWith('c1');
    expect(fetchPages).not.toHaveBeenCalledWith({ queryKey: ['chat', 'messages', 'c1'] });
  });

  it('en segundo plano se desuscribe y no queda "en-vivo"; al volver se une de nuevo', async () => {
    const baja = vi.fn();
    rt.subscribeToConversation.mockReturnValue(baja);
    const { result } = renderHook(() => useConversationRealtime('c1'), { wrapper });
    act(() => ultimoEstado()('en-vivo'));
    expect(result.current).toBe('en-vivo');

    cambiarAppState('background');
    expect(baja).toHaveBeenCalledTimes(1);
    expect(result.current).toBe('conectando');

    cambiarAppState('active');
    expect(rt.subscribeToConversation).toHaveBeenCalledTimes(2);
    expect(result.current).toBe('conectando');
    api.getMessages.mockClear();
    act(() => ultimoEstado()('en-vivo'));
    await vi.advanceTimersByTimeAsync(0);
    expect(result.current).toBe('en-vivo');
    // Al volver se re-sincroniza lo que llegó con el socket cerrado.
    expect(api.getMessages).toHaveBeenCalledTimes(1);
  });

  it('un mensaje por el socket entra a la caché; uno ilegible se pide al backend', async () => {
    queryClient.setQueryData<InfiniteData<MessagesPage, string | undefined>>(
      ['chat', 'messages', 'c1'],
      { pages: [pagina('m1')], pageParams: [undefined] },
    );
    renderHook(() => useConversationRealtime('c1'), { wrapper });
    const [, onMessage, , onUnreadable] = rt.subscribeToConversation.mock.calls[0]!;

    act(() => onMessage(msg('m2')));
    const data = queryClient.getQueryData<InfiniteData<MessagesPage>>(['chat', 'messages', 'c1']);
    expect(data?.pages[0]?.mensajes.map((m) => m.id)).toEqual(['m1', 'm2']);

    expect(api.getMessages).not.toHaveBeenCalled();
    act(() => onUnreadable());
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getMessages).toHaveBeenCalledTimes(1);
  });
});

describe('useChatSignals', () => {
  const handlers = () =>
    rt.subscribeToChatSignals.mock.calls.at(-1)![1] as {
      onTyping: () => void;
      onRead: () => void;
      onMessage: () => void;
    };

  it('una ráfaga de "leí"/"mensaje" pide los mensajes una vez ya y una más al cerrar la ventana', async () => {
    renderHook(() => useChatSignals('c1'), { wrapper });

    handlers().onRead();
    handlers().onMessage();
    handlers().onRead();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getMessages).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(SIGNAL_REFETCH_MS);
    expect(api.getMessages).toHaveBeenCalledTimes(2);

    // Pasada la ventana, el siguiente aviso vuelve a pedir al instante.
    await vi.advanceTimersByTimeAsync(SIGNAL_REFETCH_MS);
    handlers().onRead();
    await vi.advanceTimersByTimeAsync(0);
    expect(api.getMessages).toHaveBeenCalledTimes(3);
  });

  it('"escribiendo" se apaga solo si dejan de llegar avisos', () => {
    const { result } = renderHook(() => useChatSignals('c1'), { wrapper });

    act(() => handlers().onTyping());
    expect(result.current.othersTyping).toBe(true);
    act(() => void vi.advanceTimersByTime(TYPING_VISIBLE_MS));
    expect(result.current.othersTyping).toBe(false);
  });

  it('en segundo plano corta los avisos y al volver los retoma', () => {
    const stop = vi.fn();
    rt.subscribeToChatSignals.mockReturnValue({
      notifyTyping: vi.fn(),
      notifyMessage: vi.fn(),
      notifyRead: vi.fn(),
      stop,
    });
    renderHook(() => useChatSignals('c1'), { wrapper });

    cambiarAppState('background');
    expect(stop).toHaveBeenCalledTimes(1);
    cambiarAppState('active');
    expect(rt.subscribeToChatSignals).toHaveBeenCalledTimes(2);
  });

  it('al desmontar, un pedido pendiente de la ventana no se dispara', async () => {
    const { unmount } = renderHook(() => useChatSignals('c1'), { wrapper });
    handlers().onRead();
    handlers().onRead();
    await vi.advanceTimersByTimeAsync(0);
    unmount();
    api.getMessages.mockClear();

    await vi.advanceTimersByTimeAsync(SIGNAL_REFETCH_MS * 2);

    expect(api.getMessages).not.toHaveBeenCalled();
  });
});
