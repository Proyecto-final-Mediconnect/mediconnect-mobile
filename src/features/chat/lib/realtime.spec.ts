import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ENG-70 — la conexión a Realtime: cuándo no se conecta y cómo maneja el token.
 * `createClient` se reemplaza para capturar el callback `accessToken`, que es lo
 * que Realtime llama en cada heartbeat.
 */
const supabase = vi.hoisted(() => ({
  createClient: vi.fn(),
  accessToken: null as null | (() => Promise<string>),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: supabase.createClient }));
vi.mock('react-native-url-polyfill/auto', () => ({}));

const getRealtimeToken = vi.hoisted(() => vi.fn());
vi.mock('../api', () => ({ getRealtimeToken }));

function fakeChannel() {
  const channel = {
    on: vi.fn(() => channel),
    send: vi.fn(),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      cb?.('SUBSCRIBED');
      return channel;
    }),
  };
  return channel;
}

/** `supabase-js` se importa de forma diferida: hay que esperar a que llegue. */
async function settled() {
  await vi.dynamicImportSettled();
  await Promise.resolve();
}

async function load(env: { url?: string; key?: string }) {
  vi.resetModules();
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', env.url ?? '');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', env.key ?? '');
  return import('./realtime');
}

beforeEach(() => {
  supabase.createClient.mockReset().mockImplementation((_u, _k, options) => {
    supabase.accessToken = options.accessToken;
    return {
      channel: vi.fn(fakeChannel),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
      realtime: { disconnect: vi.fn(), setAuth: vi.fn().mockResolvedValue(undefined) },
    };
  });
  getRealtimeToken.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('realtime', () => {
  it('sin variables de Supabase no se conecta y avisa que queda sin conexión', async () => {
    const { subscribeToConversation } = await load({});
    const onStatus = vi.fn();

    subscribeToConversation('c-1', vi.fn(), onStatus);

    expect(onStatus).toHaveBeenCalledWith('sin-conexion');
    expect(supabase.createClient).not.toHaveBeenCalled();
  });

  it('una URL mal cargada no rompe la pantalla: queda sin conexión', async () => {
    supabase.createClient.mockImplementation(() => {
      throw new Error('Invalid supabaseUrl');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { subscribeToConversation } = await load({ url: 'no-es-url', key: 'k' });
    const onStatus = vi.fn();

    expect(() => subscribeToConversation('c-1', vi.fn(), onStatus)).not.toThrow();
    await settled();
    expect(onStatus).toHaveBeenCalledWith('sin-conexion');
  });

  it('si falló iniciar Realtime, la próxima suscripción lo reintenta', async () => {
    supabase.createClient.mockImplementationOnce(() => {
      throw new Error('chunk caído');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { subscribeToConversation } = await load({ url: 'https://x.supabase.co', key: 'k' });

    subscribeToConversation('c-1', vi.fn(), vi.fn());
    await settled();
    const onStatus = vi.fn();
    subscribeToConversation('c-1', vi.fn(), onStatus);
    await settled();

    expect(supabase.createClient).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenLastCalledWith('en-vivo');
  });

  it('un token en vuelo al cerrar sesión no se guarda para el próximo usuario', async () => {
    let resolverViejo!: (v: { accessToken: string; expiraEl: string }) => void;
    getRealtimeToken
      .mockReturnValueOnce(new Promise((resolve) => (resolverViejo = resolve)))
      .mockResolvedValue({
        accessToken: 't-nuevo',
        expiraEl: new Date(Date.now() + 3_600_000).toISOString(),
      });
    const { subscribeToConversation, disconnectRealtime } = await load({
      url: 'https://x.supabase.co',
      key: 'k',
    });
    subscribeToConversation('c-1', vi.fn(), vi.fn());
    await settled();
    const clienteViejo = supabase.createClient.mock.results[0]!.value;
    const accessTokenViejo = supabase.accessToken!;

    const enVuelo = accessTokenViejo();
    disconnectRealtime();
    resolverViejo({
      accessToken: 't-viejo',
      expiraEl: new Date(Date.now() + 3_600_000).toISOString(),
    });
    await enVuelo;
    await settled();

    // Corta el socket, no solo los canales.
    expect(clienteViejo.realtime.disconnect).toHaveBeenCalled();
    // El token del usuario anterior no quedó en la caché.
    expect(await accessTokenViejo()).toBe('t-nuevo');
  });

  it('pide el token una vez, lo reusa y lo renueva cuando está por vencer', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-26T15:00:00.000Z') });
    getRealtimeToken
      .mockResolvedValueOnce({ accessToken: 't-1', expiraEl: '2026-10-26T16:00:00.000Z' })
      .mockResolvedValueOnce({ accessToken: 't-2', expiraEl: '2026-10-26T17:00:00.000Z' });
    const { subscribeToConversation } = await load({ url: 'https://x.supabase.co', key: 'k' });
    const onStatus = vi.fn();

    subscribeToConversation('c-1', vi.fn(), onStatus);
    await settled();

    expect(onStatus).toHaveBeenLastCalledWith('en-vivo');
    expect(await supabase.accessToken!()).toBe('t-1');
    expect(await supabase.accessToken!()).toBe('t-1');
    expect(getRealtimeToken).toHaveBeenCalledTimes(1);

    // A 1 minuto del vencimiento ya pide otro.
    vi.setSystemTime(new Date('2026-10-26T15:59:00.000Z'));
    expect(await supabase.accessToken!()).toBe('t-2');
    expect(getRealtimeToken).toHaveBeenCalledTimes(2);
  });

  it('sin sesión el token sale vacío, y al cerrar sesión se olvida', async () => {
    getRealtimeToken.mockRejectedValueOnce(new Error('401')).mockResolvedValue({
      accessToken: 't-1',
      expiraEl: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const { subscribeToConversation, disconnectRealtime } = await load({
      url: 'https://x.supabase.co',
      key: 'k',
    });
    subscribeToConversation('c-1', vi.fn(), vi.fn());
    await settled();

    expect(await supabase.accessToken!()).toBe('');
    expect(await supabase.accessToken!()).toBe('t-1');

    disconnectRealtime();
    await supabase.accessToken!();
    expect(getRealtimeToken).toHaveBeenCalledTimes(3);
  });

  it('"escribiendo" va por un canal privado y se avisa como mucho cada tanto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { subscribeToChatSignals, TYPING_SEND_EVERY_MS } = await load({
      url: 'https://x.supabase.co',
      key: 'k',
    });

    const signals = subscribeToChatSignals('c-1', {
      onTyping: vi.fn(),
      onRead: vi.fn(),
      onMessage: vi.fn(),
    });
    await settled();

    const client = supabase.createClient.mock.results[0]!.value;
    expect(client.channel).toHaveBeenCalledWith('typing:c-1', { config: { private: true } });
    const channel = client.channel.mock.results[0]!.value;

    signals.notifyTyping();
    signals.notifyTyping();
    expect(channel.send).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(TYPING_SEND_EVERY_MS);
    signals.notifyTyping();
    expect(channel.send).toHaveBeenCalledTimes(2);

    // "Leí" no se espacia: se manda cada vez que se marca leído.
    signals.notifyRead();
    expect(channel.send).toHaveBeenLastCalledWith({
      type: 'broadcast',
      event: 'leido',
      payload: {},
    });
    expect(channel.send).toHaveBeenCalledTimes(3);

    signals.stop();
    vi.advanceTimersByTime(TYPING_SEND_EVERY_MS);
    signals.notifyTyping();
    expect(channel.send).toHaveBeenCalledTimes(3);
  });

  it('un "leí" pedido antes de unirse al canal se manda apenas queda unido', async () => {
    let joined: ((status: string) => void) | undefined;
    supabase.createClient.mockImplementation((_u, _k, options) => {
      supabase.accessToken = options.accessToken;
      const channel = {
        on: vi.fn(() => channel),
        send: vi.fn(),
        subscribe: vi.fn((cb: (status: string) => void) => {
          joined = cb;
          return channel;
        }),
      };
      return { channel: vi.fn(() => channel), removeChannel: vi.fn() };
    });
    const { subscribeToChatSignals } = await load({ url: 'https://x.supabase.co', key: 'k' });

    const signals = subscribeToChatSignals('c-1', {
      onTyping: vi.fn(),
      onRead: vi.fn(),
      onMessage: vi.fn(),
    });
    await settled();
    const channel = supabase.createClient.mock.results[0]!.value.channel.mock.results[0]!.value;

    // Todavía uniéndose: ni "escribiendo" ni "leí" salen.
    signals.notifyRead();
    signals.notifyTyping();
    expect(channel.send).not.toHaveBeenCalled();

    joined?.('SUBSCRIBED');
    expect(channel.send).toHaveBeenCalledTimes(1);
    expect(channel.send).toHaveBeenCalledWith({ type: 'broadcast', event: 'leido', payload: {} });
  });

  it('"mandé un mensaje" va por el canal privado y el otro lo recibe', async () => {
    let onBroadcast: Record<string, () => void> = {};
    supabase.createClient.mockImplementation((_u, _k, options) => {
      supabase.accessToken = options.accessToken;
      const channel = {
        on: vi.fn((_t: string, filter: { event: string }, cb: () => void) => {
          onBroadcast[filter.event] = cb;
          return channel;
        }),
        send: vi.fn(),
        subscribe: vi.fn((cb: (status: string) => void) => {
          cb('SUBSCRIBED');
          return channel;
        }),
      };
      return {
        channel: vi.fn(() => channel),
        removeChannel: vi.fn(),
        realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      };
    });
    const { subscribeToChatSignals } = await load({ url: 'https://x.supabase.co', key: 'k' });
    const onMessage = vi.fn();

    const signals = subscribeToChatSignals('c-1', {
      onTyping: vi.fn(),
      onRead: vi.fn(),
      onMessage,
    });
    await settled();
    const channel = supabase.createClient.mock.results[0]!.value.channel.mock.results[0]!.value;

    signals.notifyMessage();
    expect(channel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'mensaje',
      payload: {},
    });

    onBroadcast['mensaje']!();
    expect(onMessage).toHaveBeenCalledTimes(1);
    onBroadcast = {};
  });

  it('deja el token puesto en el socket antes de unirse al canal', async () => {
    const order: string[] = [];
    supabase.createClient.mockImplementation((_u, _k, options) => {
      supabase.accessToken = options.accessToken;
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => {
          order.push('subscribe');
          return channel;
        }),
      };
      return {
        channel: vi.fn(() => channel),
        removeChannel: vi.fn(),
        realtime: {
          setAuth: vi.fn(async () => {
            order.push('setAuth');
          }),
        },
      };
    });
    const { subscribeToConversation } = await load({ url: 'https://x.supabase.co', key: 'k' });

    subscribeToConversation('c-1', vi.fn(), vi.fn());
    await settled();

    expect(order).toEqual(['setAuth', 'subscribe']);
  });

  it('la bandeja escucha los mensajes de todas mis conversaciones, sin filtro', async () => {
    let handler: (() => void) | undefined;
    supabase.createClient.mockImplementation((_u, _k, options) => {
      supabase.accessToken = options.accessToken;
      const channel = {
        on: vi.fn((_t: string, _f: object, cb: () => void) => {
          handler = cb;
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return {
        channel: vi.fn(() => channel),
        removeChannel: vi.fn(),
        realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      };
    });
    const { subscribeToInbox } = await load({ url: 'https://x.supabase.co', key: 'k' });
    const onChange = vi.fn();

    subscribeToInbox(onChange);
    await settled();
    const channel = supabase.createClient.mock.results[0]!.value.channel.mock.results[0]!.value;

    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      expect.any(Function),
    );
    handler?.();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('sin variables de Supabase no hay indicador de escribiendo', async () => {
    const { subscribeToChatSignals } = await load({});

    expect(() =>
      subscribeToChatSignals('c-1', {
        onTyping: vi.fn(),
        onRead: vi.fn(),
        onMessage: vi.fn(),
      }).notifyTyping(),
    ).not.toThrow();
    expect(supabase.createClient).not.toHaveBeenCalled();
  });
});

/**
 * Un cliente que se comporta como realtime-js: `channel(topic)` devuelve el
 * canal que ya existe, y sumarle un `.on('postgres_changes')` a uno ya
 * suscripto tira error (el bug de Home + Mensajes con el canal `inbox`).
 */
function realtimeLikeClient() {
  const channels = new Map<string, ReturnType<typeof stubChannel>>();
  function stubChannel(topic: string) {
    const handlers: (() => void)[] = [];
    let subscribed = false;
    let onStatus: ((status: string) => void) | undefined;
    const channel = {
      topic,
      handlers,
      on: vi.fn((_type: string, _filter: unknown, cb: () => void) => {
        if (subscribed) {
          throw new Error(
            `cannot add postgres_changes callbacks for realtime:${topic} after subscribe()`,
          );
        }
        handlers.push(cb);
        return channel;
      }),
      subscribe: vi.fn((cb?: (status: string) => void) => {
        subscribed = true;
        onStatus = cb;
        cb?.('SUBSCRIBED');
        return channel;
      }),
      emit: (status: string) => onStatus?.(status),
    };
    return channel;
  }
  return {
    channels,
    channel: vi.fn((topic: string) => {
      if (!channels.has(topic)) channels.set(topic, stubChannel(topic));
      return channels.get(topic)!;
    }),
    removeChannel: vi.fn((channel: { topic: string }) => channels.delete(channel.topic)),
    removeAllChannels: vi.fn(),
    realtime: { disconnect: vi.fn(), setAuth: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('la bandeja compartida (Home y Mensajes)', () => {
  const env = { url: 'https://x.supabase.co', key: 'k' };

  it('dos suscriptores comparten un solo canal y los dos reciben el INSERT', async () => {
    const fake = realtimeLikeClient();
    supabase.createClient.mockImplementation(() => fake);
    const { subscribeToInbox } = await load(env);
    const home = vi.fn();
    const mensajes = vi.fn();

    subscribeToInbox(home);
    subscribeToInbox(mensajes);
    await settled();

    expect(fake.channel).toHaveBeenCalledTimes(1);
    const canal = fake.channels.get('inbox')!;
    expect(canal.on).toHaveBeenCalledTimes(1);
    canal.handlers[0]!();
    expect(home).toHaveBeenCalledTimes(1);
    expect(mensajes).toHaveBeenCalledTimes(1);
  });

  it('el suscriptor que llega con el canal ya unido no rompe ni se queda sin estado', async () => {
    const fake = realtimeLikeClient();
    supabase.createClient.mockImplementation(() => fake);
    const { subscribeToInbox, isInboxLive } = await load(env);
    subscribeToInbox(vi.fn());
    await settled();

    const onStatus = vi.fn();
    expect(() => subscribeToInbox(vi.fn(), onStatus)).not.toThrow();
    expect(onStatus).toHaveBeenCalledWith('en-vivo');
    expect(isInboxLive()).toBe(true);
  });

  it('al irse uno el canal sigue; al irse el último se baja una sola vez', async () => {
    const fake = realtimeLikeClient();
    supabase.createClient.mockImplementation(() => fake);
    const { subscribeToInbox, isInboxLive } = await load(env);
    const home = vi.fn();
    const mensajes = vi.fn();
    const bajarHome = subscribeToInbox(home);
    const bajarMensajes = subscribeToInbox(mensajes);
    await settled();

    bajarMensajes();
    expect(fake.removeChannel).not.toHaveBeenCalled();
    fake.channels.get('inbox')!.handlers[0]!();
    expect(home).toHaveBeenCalledTimes(1);
    expect(mensajes).not.toHaveBeenCalled();

    bajarHome();
    bajarHome();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
    expect(isInboxLive()).toBe(false);

    // Una suscripción nueva después arma un canal nuevo.
    subscribeToInbox(vi.fn());
    await settled();
    expect(fake.channel).toHaveBeenCalledTimes(2);
  });

  it('si se va el único suscriptor antes de que cargue supabase-js, no queda canal', async () => {
    const fake = realtimeLikeClient();
    supabase.createClient.mockImplementation(() => fake);
    const { subscribeToInbox } = await load(env);

    subscribeToInbox(vi.fn())();
    await settled();

    expect(fake.channel).not.toHaveBeenCalled();
  });

  it('el estado del canal llega a los suscriptores', async () => {
    const fake = realtimeLikeClient();
    supabase.createClient.mockImplementation(() => fake);
    const { subscribeToInbox, isInboxLive } = await load(env);
    const onStatus = vi.fn();
    subscribeToInbox(vi.fn(), onStatus);
    await settled();

    expect(onStatus).toHaveBeenNthCalledWith(1, 'conectando');
    expect(onStatus).toHaveBeenLastCalledWith('en-vivo');
    fake.channels.get('inbox')!.emit('CLOSED');
    expect(onStatus).toHaveBeenLastCalledWith('sin-conexion');
    expect(isInboxLive()).toBe(false);
  });
});

describe('un evento de mensaje ilegible', () => {
  it('no se pierde con una excepción: avisa para pedirlo al backend', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let handler: ((payload: { new: unknown }) => void) | undefined;
    supabase.createClient.mockImplementation(() => {
      const channel = {
        on: vi.fn((_t: string, _f: unknown, cb: typeof handler) => {
          handler = cb;
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return {
        channel: vi.fn(() => channel),
        removeChannel: vi.fn(),
        realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      };
    });
    const { subscribeToConversation } = await load({ url: 'https://x.supabase.co', key: 'k' });
    const onMessage = vi.fn();
    const onUnreadable = vi.fn();

    subscribeToConversation('c-1', onMessage, vi.fn(), onUnreadable);
    await settled();

    const row = {
      id: 'm1',
      conversation_id: 'c-1',
      sender_id: 'u',
      content: 'hola',
      read_at: null,
    };
    expect(() => handler!({ new: { ...row, created_at: 'no es una fecha' } })).not.toThrow();
    expect(onMessage).not.toHaveBeenCalled();
    expect(onUnreadable).toHaveBeenCalledTimes(1);

    // Con microsegundos, que Postgres manda, sí se lee.
    handler!({ new: { ...row, created_at: '2026-10-26 18:17:07.568123+00' } });
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'm1', enviadoEl: '2026-10-26T18:17:07.568Z' }),
    );
  });
});
