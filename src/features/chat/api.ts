import { apiRequest } from '../../shared/lib/api-client';
import type { ChatMessage, ConversationInbox, ConversationSummary, MessagesPage } from './types';

/** Las mismas rutas que usa la web (ENG-70). El backend sirve a los dos clientes. */

function conversationPath(id: string, rest = ''): string {
  return `/conversations/${encodeURIComponent(id)}${rest}`;
}

/** `GET /conversations/me`: mis conversaciones y con quién puedo abrir una. */
export function getMyConversations(): Promise<ConversationInbox> {
  return apiRequest<ConversationInbox>('/conversations/me', {
    fallbackMessage: 'No pudimos cargar tus mensajes.',
  });
}

/** `POST /conversations`: abre la conversación, o devuelve la que ya existe. */
export function openConversation(contraparteId: string): Promise<ConversationSummary> {
  return apiRequest<ConversationSummary>('/conversations', {
    method: 'POST',
    body: { contraparteId },
    fallbackMessage: 'No pudimos abrir la conversación.',
  });
}

/** `GET /conversations/:id/messages`: los últimos mensajes, o los anteriores a `antesDe`. */
export function getMessages(id: string, antesDe?: string): Promise<MessagesPage> {
  const query = antesDe ? `?antesDe=${encodeURIComponent(antesDe)}` : '';
  return apiRequest<MessagesPage>(conversationPath(id, `/messages${query}`), {
    fallbackMessage: 'No pudimos cargar los mensajes.',
  });
}

/** `POST /conversations/:id/messages`. */
export function sendMessage(id: string, contenido: string): Promise<ChatMessage> {
  return apiRequest<ChatMessage>(conversationPath(id, '/messages'), {
    method: 'POST',
    body: { contenido },
    fallbackMessage: 'No pudimos enviar el mensaje.',
  });
}

/** `PATCH /conversations/:id/read`: marca leído lo que mandó la otra persona. */
export function markConversationRead(id: string): Promise<void> {
  return apiRequest<void>(conversationPath(id, '/read'), {
    method: 'PATCH',
    fallbackMessage: 'No pudimos marcar los mensajes como leídos.',
  });
}
