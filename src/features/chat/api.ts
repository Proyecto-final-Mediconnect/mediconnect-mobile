import { ApiError, apiRequest } from '../../shared/lib/api-client';
import { MENSAJE_TAMANO } from '../patient-documents/lib/document-file';
import type { PickedFile } from '../patient-documents/types';
import type {
  AttachmentUrl,
  ChatMessage,
  ConversationInbox,
  ConversationSummary,
  MessagesPage,
} from './types';

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

/**
 * `POST /conversations/:id/attachments` (ENG-102): una foto o un PDF de hasta
 * 10 MB, con un texto opcional.
 *
 * Como en los documentos (ENG-164), en React Native el archivo va como
 * `{ uri, name, type }`: el `FormData` nativo lo lee del disco al mandar, sin
 * pasar los bytes por JavaScript.
 */
export async function sendAttachment(
  id: string,
  file: PickedFile,
  contenido?: string,
): Promise<ChatMessage> {
  const form = new FormData();
  form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  if (contenido) form.append('contenido', contenido);
  try {
    return await apiRequest<ChatMessage>(conversationPath(id, '/attachments'), {
      method: 'POST',
      body: form,
      fallbackMessage: 'No pudimos mandar el archivo.',
    });
  } catch (err) {
    // El 413 lo corta Multer antes del controller, sin un mensaje para el paciente.
    if (err instanceof ApiError && err.status === 413) throw new ApiError(413, MENSAJE_TAMANO);
    throw err;
  }
}

/** Una URL firmada de cinco minutos para abrir el archivo de un mensaje. */
export function getAttachmentUrl(id: string, messageId: string): Promise<AttachmentUrl> {
  return apiRequest<AttachmentUrl>(
    conversationPath(id, `/messages/${encodeURIComponent(messageId)}/attachment`),
    { fallbackMessage: 'No pudimos abrir el archivo.' },
  );
}
