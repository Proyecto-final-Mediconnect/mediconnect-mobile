import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ApiError } from '../../../shared/lib/api-client';
import {
  getMessages,
  getMyConversations,
  markConversationRead,
  openConversation,
  sendAttachment,
  sendMessage,
} from '../api';
import { mergeMessages } from '../lib/chat';
import {
  subscribeToChatSignals,
  subscribeToConversation,
  subscribeToInbox,
  type ChatSignals,
  type RealtimeStatus,
} from '../lib/realtime';
import type { PickedFile } from '../../patient-documents/types';
import type { ChatMessage, MessagesPage } from '../types';

/**
 * Datos del chat en la app (ENG-152).
 *
 * ## Tiempo real y consulta de respaldo
 *
 * Con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` cargadas, la
 * conversación abierta se conecta a Supabase Realtime (ADR-011): mensajes en
 * vivo, "escribiendo…" y "Leído" al momento, igual que la web. El socket se abre
 * recién al entrar a un chat (`supabase-js` se importa en diferido).
 *
 * La consulta cada `POLL_INTERVAL_MS` **sigue siendo el respaldo**: sin esas
 * variables es el único camino, y con el socket en vivo baja a
 * `LIVE_RECONCILE_MS`, porque un stream puede perder un evento. Es el mismo HTTP
 * con Bearer que usa el resto de la app.
 *
 * Los mensajes que la app manda le llegan a la web en vivo igual: Realtime
 * escucha los INSERT de la tabla, no importa quién los hizo.
 */

export const CHAT_INBOX_KEY = ['chat', 'inbox'] as const;
const messagesKey = (conversationId: string) => ['chat', 'messages', conversationId] as const;

/** Cada cuánto se buscan mensajes nuevos de la conversación abierta. */
export const POLL_INTERVAL_MS = 4_000;
/** Cada cuánto se refresca la bandeja, para que el contador de no leídos no quede viejo. */
export const INBOX_REFRESH_MS = 15_000;
/** Con el socket en vivo, la consulta es solo una reconciliación de fondo. */
export const LIVE_RECONCILE_MS = 15_000;
/** Cuánto sigue la burbuja de "escribiendo" sin un aviso nuevo. */
export const TYPING_VISIBLE_MS = 4_000;

/** Un 4xx no se arregla reintentando: ni una conversación ajena ni un id que no existe. */
const retryUnlessClientError = (failureCount: number, error: Error): boolean =>
  !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 1;

/** La app en primer plano: con la pantalla apagada no se consulta nada. */
const appActive = (): boolean => AppState.currentState === 'active';

/** Mis conversaciones y con quién puedo abrir una nueva. */
export function useConversations() {
  return useQuery({
    queryKey: CHAT_INBOX_KEY,
    queryFn: getMyConversations,
    refetchInterval: () => (appActive() ? INBOX_REFRESH_MS : false),
    retry: retryUnlessClientError,
  });
}

/**
 * Los mensajes de una conversación, de a páginas: la primera es la más reciente
 * y `fetchNextPage` trae las anteriores.
 *
 * La consulta periódica pide solo la página más reciente y la funde con lo que
 * hay: un `refetch` del `useInfiniteQuery` volvería a pedir, una por una, todas
 * las páginas que el paciente fue abriendo para atrás.
 */
export function useMessages(conversationId: string | undefined, live = false) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: messagesKey(conversationId ?? ''),
    queryFn: ({ pageParam }) => getMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hayMas ? last.mensajes[0]?.id : undefined),
    enabled: Boolean(conversationId),
    retry: retryUnlessClientError,
  });

  useEffect(() => {
    if (!conversationId) return;
    let detenido = false;
    // Un 403/404 persistente (conversación ajena o borrada) no se arregla
    // esperando: se corta la consulta periódica en vez de repetirla cada 4 s.
    const alFallar = () => {
      detenido = true;
      clearInterval(timer);
    };
    const timer = setInterval(
      () => {
        if (appActive()) reconcileLatest(queryClient, conversationId, alFallar);
      },
      live ? LIVE_RECONCILE_MS : POLL_INTERVAL_MS,
    );
    // Al volver a primer plano no se espera al próximo ciclo: lo que llegó
    // mientras el teléfono estaba bloqueado aparece apenas se lo desbloquea.
    const alVolver = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && !detenido) reconcileLatest(queryClient, conversationId, alFallar);
    });
    return () => {
      clearInterval(timer);
      alVolver.remove();
    };
  }, [conversationId, live, queryClient]);

  const messages = useMemo(
    () => mergeMessages([], query.data?.pages.flatMap((page) => page.mensajes) ?? []),
    [query.data],
  );

  return { ...query, messages };
}

/**
 * Con un pedido en vuelo no se manda otro: se anota y se repite una sola vez al
 * terminar. Con el backend de Render despertando, un pedido puede tardar más que
 * el intervalo, y sin esto se apilarían.
 */
const inFlight = new Map<string, { again: boolean }>();

function reconcileLatest(
  queryClient: QueryClient,
  conversationId: string,
  onFatal: () => void,
): void {
  const running = inFlight.get(conversationId);
  if (running) {
    running.again = true;
    return;
  }
  const state = { again: false };
  inFlight.set(conversationId, state);
  getMessages(conversationId)
    .then((page) => {
      const conocidos = new Set(
        queryClient
          .getQueryData<InfiniteData<MessagesPage, string | undefined>>(messagesKey(conversationId))
          ?.pages[0]?.mensajes.map((m) => m.id),
      );
      addToCache(queryClient, conversationId, page.mensajes);
      // Un mensaje nuevo cambia el último mensaje y los no leídos de la bandeja.
      if (page.mensajes.some((m) => !conocidos.has(m.id))) {
        void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
      }
    })
    // Un fallo de red no pisa lo que ya se ve: se reintenta en el próximo ciclo.
    // Un 403/404 no es de red: la conversación ya no es accesible y se corta.
    .catch((error: unknown) => {
      if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
        state.again = false;
        onFatal();
      }
    })
    .finally(() => {
      inFlight.delete(conversationId);
      if (state.again) reconcileLatest(queryClient, conversationId, onFatal);
    });
}

/** Suma mensajes a la página más reciente de la caché, sin duplicarlos. */
function addToCache(
  queryClient: QueryClient,
  conversationId: string,
  incoming: ChatMessage[],
): void {
  queryClient.setQueryData<InfiniteData<MessagesPage, string | undefined>>(
    messagesKey(conversationId),
    (data) => {
      if (!data || data.pages.length === 0) return data;
      const [latest, ...older] = data.pages;
      // Sin mensajes nuevos ni cambios de lectura se devuelve la misma
      // referencia: React Query no notifica y no hay re-render ni reorden.
      const actuales = new Map(latest!.mensajes.map((m) => [m.id, m]));
      const hayCambios = incoming.some((m) => {
        const actual = actuales.get(m.id);
        return !actual || actual.leidoEl !== m.leidoEl;
      });
      if (!hayCambios) return data;
      return {
        ...data,
        pages: [{ ...latest!, mensajes: mergeMessages(latest!.mensajes, incoming) }, ...older],
      };
    },
  );
}

/**
 * Escucha la conversación abierta por Realtime y devuelve el estado del socket.
 * Al quedar suscripto vuelve a pedir el historial: lo que llegó entre la carga
 * inicial y la suscripción no viene por el socket.
 */
export function useConversationRealtime(conversationId: string | undefined): RealtimeStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('conectando');

  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversation(
      conversationId,
      (message) => {
        addToCache(queryClient, conversationId, [message]);
        void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
      },
      (next) => {
        setStatus(next);
        if (next === 'en-vivo') {
          void queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
        }
      },
    );
  }, [conversationId, queryClient]);

  return status;
}

/**
 * La bandeja en vivo: un mensaje nuevo mío, de cualquier conversación (incluida
 * una que todavía no existía para mí), actualiza la lista y el contador sin
 * esperar la consulta periódica.
 */
export function useInboxRealtime(): void {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeToInbox(() => {
        void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
      }),
    [queryClient],
  );
}

/**
 * Los avisos en vivo entre los dos dispositivos: "escribiendo…" (se apaga solo
 * si dejan de llegar), "leí" (mis "Leído" aparecen al momento) y "mandé un
 * mensaje" (el otro lo pide al backend sin esperar a Postgres Changes).
 */
export function useChatSignals(conversationId: string | undefined) {
  const queryClient = useQueryClient();
  const [othersTyping, setOthersTyping] = useState(false);
  const signals = useRef<ChatSignals | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pedir = () => {
      reconcileLatest(queryClient, conversationId, () => {});
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    };
    signals.current = subscribeToChatSignals(conversationId, {
      onTyping: () => {
        setOthersTyping(true);
        clearTimeout(timer);
        timer = setTimeout(() => setOthersTyping(false), TYPING_VISIBLE_MS);
      },
      onRead: pedir,
      onMessage: pedir,
    });
    return () => {
      clearTimeout(timer);
      signals.current?.stop();
      signals.current = null;
    };
  }, [conversationId, queryClient]);

  const notifyTyping = useCallback(() => signals.current?.notifyTyping(), []);
  const notifyRead = useCallback(() => signals.current?.notifyRead(), []);
  const notifyMessage = useCallback(() => signals.current?.notifyMessage(), []);
  const clearTyping = useCallback(() => setOthersTyping(false), []);

  return { othersTyping, notifyTyping, notifyRead, notifyMessage, clearTyping };
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contenido: string) => sendMessage(conversationId, contenido),
    onSuccess: (message) => {
      addToCache(queryClient, conversationId, [message]);
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    },
  });
}

/** Manda una foto o un PDF con un texto opcional (ENG-102). */
export function useSendAttachment(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, contenido }: { file: PickedFile; contenido?: string }) =>
      sendAttachment(conversationId, file, contenido),
    onSuccess: (message) => {
      addToCache(queryClient, conversationId, [message]);
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    },
  });
}

/**
 * Marca leído lo que mandó la otra persona y actualiza la caché en el lugar: si
 * esperara a la próxima consulta, la pantalla seguiría viendo mensajes sin leer
 * y volvería a pedir la marca.
 */
export function useMarkConversationRead(conversationId: string, myId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<InfiniteData<MessagesPage, string | undefined>>(
        messagesKey(conversationId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              mensajes: page.mensajes.map((m) =>
                m.autorId !== myId && m.leidoEl === null ? { ...m, leidoEl: now } : m,
              ),
            })),
          },
      );
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    },
  });
}

/**
 * Arranca una conversación con el primer mensaje: recién ahí se crea en el
 * backend, así abrir el chat con alguien y arrepentirse no deja una conversación
 * vacía en ninguna de las dos bandejas. Es el mismo criterio que la web.
 *
 * Limitación conocida: son dos pedidos (abrir y enviar). Si el segundo falla,
 * la conversación ya existe en el backend y queda vacía en la bandeja; al
 * reintentar, `openConversation` devuelve la misma, así que no se duplica.
 */
export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contraparteId,
      contenido,
    }: {
      contraparteId: string;
      contenido: string;
    }) => {
      const conversation = await openConversation(contraparteId);
      const message = await sendMessage(conversation.id, contenido);
      return { conversation, message };
    },
    onSuccess: ({ conversation, message }) => {
      // La conversación recién creada arranca con el mensaje que se acaba de
      // mandar, sin pasar por "Cargando los mensajes…": el paciente lo escribió
      // hace un instante y no tiene por qué dejar de verlo.
      queryClient.setQueryData<InfiniteData<MessagesPage, string | undefined>>(
        messagesKey(conversation.id),
        (data) =>
          data ?? { pages: [{ mensajes: [message], hayMas: false }], pageParams: [undefined] },
      );
      return queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    },
  });
}
