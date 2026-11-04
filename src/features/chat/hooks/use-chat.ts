import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
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
import type { PickedFile } from '../../patient-documents/types';
import type { ChatMessage, MessagesPage } from '../types';

/**
 * Datos del chat en la app (ENG-152).
 *
 * ## Por qué consulta cada pocos segundos y no usa Realtime
 *
 * La web recibe los mensajes por Supabase Realtime (ADR-011). La app, en cambio,
 * pregunta al backend cada `POLL_INTERVAL_MS` mientras la conversación está
 * abierta y la app en primer plano. Realtime en React Native suma
 * `supabase-js` con sus polyfills, y la URL y la clave de Supabase dentro del
 * build. Para un chat de consulta médica, donde nadie espera respuesta al
 * segundo, cuatro segundos no se notan, y el camino es el mismo HTTP con
 * Bearer que ya usa el resto de la app.
 *
 * Los mensajes que la app manda le llegan a la web en vivo igual: Realtime
 * escucha los INSERT de la tabla, no importa quién los hizo.
 */

export const CHAT_INBOX_KEY = ['chat', 'inbox'] as const;
const messagesKey = (conversationId: string) => ['chat', 'messages', conversationId] as const;

/** Cada cuánto se buscan mensajes nuevos de la conversación abierta. */
export const POLL_INTERVAL_MS = 4_000;
/** Cada cuánto se refresca la bandeja, para que el contador de no leídos no quede viejo. */
export const INBOX_REFRESH_MS = 30_000;

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
export function useMessages(conversationId: string | undefined) {
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
    const timer = setInterval(() => {
      if (appActive()) reconcileLatest(queryClient, conversationId);
    }, POLL_INTERVAL_MS);
    // Al volver a primer plano no se espera al próximo ciclo: lo que llegó
    // mientras el teléfono estaba bloqueado aparece apenas se lo desbloquea.
    const alVolver = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') reconcileLatest(queryClient, conversationId);
    });
    return () => {
      clearInterval(timer);
      alVolver.remove();
    };
  }, [conversationId, queryClient]);

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

function reconcileLatest(queryClient: QueryClient, conversationId: string): void {
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
    .catch(() => {})
    .finally(() => {
      inFlight.delete(conversationId);
      if (state.again) reconcileLatest(queryClient, conversationId);
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
      return {
        ...data,
        pages: [{ ...latest!, mensajes: mergeMessages(latest!.mensajes, incoming) }, ...older],
      };
    },
  );
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
