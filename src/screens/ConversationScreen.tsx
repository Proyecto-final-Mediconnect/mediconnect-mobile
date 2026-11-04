import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSessionUser } from '../features/auth/session';
import { Avatar } from '../features/chat/components/Avatar';
import {
  useConversations,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
  useStartConversation,
} from '../features/chat/hooks/use-chat';
import { formatHour, layoutMessages, type MessageRow } from '../features/chat/lib/chat';
import type { RootStackParamList } from '../navigation/types';
import { useKeyboardHeight } from '../shared/hooks/use-keyboard-height';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';

/** El mismo tope que el backend (`MESSAGE_MAX_LENGTH`): el contador avisa antes de que rechace. */
export const MESSAGE_MAX_LENGTH = 2000;
/** Desde cuántos caracteres se muestra cuánto queda. */
const MOSTRAR_CONTADOR_DESDE = 1800;

/**
 * Una conversación con un profesional (ENG-152).
 *
 * Se abre de dos formas: con una conversación que ya existe (`conversationId`)
 * o con alguien a quien todavía no se le escribió. En el segundo caso la
 * conversación se crea recién con el primer mensaje, como en la web.
 */
export function ConversationScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Conversacion'>>();
  const { id: myId } = useSessionUser();
  const bandeja = useConversations();

  // Si se entró sin id —desde un turno, por ejemplo— pero ya hay conversación
  // con esa persona, se usa esa: si no, el primer mensaje intentaría abrir una
  // nueva y el backend devolvería la misma, pero la pantalla mostraría vacío un
  // chat que tiene historia.
  const conversationId =
    params.conversationId ??
    bandeja.data?.conversaciones.find((c) => c.contraparte.id === params.contraparteId)?.id;
  const esperandoBandeja = !params.conversationId && bandeja.isPending;

  const header = (
    <ScreenHeader title={params.nombre} subtitle="Profesional" onBack={() => navigation.goBack()} />
  );

  return (
    <Screen header={header} scroll={false} padded={false}>
      {esperandoBandeja ? (
        <LoadingState label="Abriendo la conversación…" />
      ) : conversationId ? (
        <Conversation key={conversationId} conversationId={conversationId} myId={myId} />
      ) : (
        <Draft
          contraparteId={params.contraparteId}
          nombre={params.nombre}
          onStarted={(id) => navigation.setParams({ conversationId: id })}
        />
      )}
    </Screen>
  );
}

function Conversation({
  conversationId,
  myId,
}: {
  conversationId: string;
  myId: string;
}): React.JSX.Element {
  const mensajes = useMessages(conversationId);
  const enviar = useSendMessage(conversationId);
  const marcarLeido = useMarkConversationRead(conversationId, myId);

  // Cuando hay algo de la otra persona sin leer —al abrir, o porque llegó con la
  // consulta periódica—, se marca. Una sola vez por mensaje: el `ref` guarda el
  // último que ya se pidió marcar, para no repetir el PATCH en cada render.
  const ultimoMarcado = useRef<string | null>(null);
  const sinLeer = mensajes.messages.filter((m) => m.autorId !== myId && m.leidoEl === null);
  const ultimoSinLeer = sinLeer.at(-1)?.id ?? null;
  const { mutate: marcar } = marcarLeido;
  useEffect(() => {
    if (!ultimoSinLeer || ultimoMarcado.current === ultimoSinLeer) return;
    ultimoMarcado.current = ultimoSinLeer;
    marcar();
  }, [ultimoSinLeer, marcar]);

  // La lista va invertida —el último mensaje abajo y pegado al teclado—, así que
  // las filas van de la más nueva a la más vieja.
  const filas = useMemo(
    () => layoutMessages(mensajes.messages, myId).reverse(),
    [mensajes.messages, myId],
  );

  if (mensajes.isPending) return <LoadingState label="Cargando los mensajes…" />;
  if (mensajes.isError) {
    return <ErrorState message={mensajes.error.message} onRetry={() => void mensajes.refetch()} />;
  }

  return (
    <Chat
      filas={filas}
      vacio={null}
      cargandoAnteriores={mensajes.isFetchingNextPage}
      onLlegarAlPrincipio={() => {
        if (mensajes.hasNextPage && !mensajes.isFetchingNextPage) void mensajes.fetchNextPage();
      }}
      enviando={enviar.isPending}
      error={enviar.isError ? enviar.error.message : null}
      onEnviar={(texto, limpiar) => enviar.mutate(texto, { onSuccess: limpiar })}
      onEscribir={() => {
        if (enviar.isError) enviar.reset();
      }}
    />
  );
}

function Draft({
  contraparteId,
  nombre,
  onStarted,
}: {
  contraparteId: string;
  nombre: string;
  onStarted: (conversationId: string) => void;
}): React.JSX.Element {
  const empezar = useStartConversation();

  return (
    <Chat
      filas={[]}
      vacio={
        <View style={styles.vacio}>
          <Avatar nombre={nombre} size={56} />
          <Text style={styles.vacioTitulo}>Escribile a {nombre}</Text>
          <Text style={styles.vacioTexto}>
            La conversación empieza con tu primer mensaje. Para una urgencia, no esperes la
            respuesta: llamá al 107.
          </Text>
        </View>
      }
      cargandoAnteriores={false}
      onLlegarAlPrincipio={() => {}}
      enviando={empezar.isPending}
      error={empezar.isError ? empezar.error.message : null}
      onEnviar={(texto, limpiar) =>
        empezar.mutate(
          { contraparteId, contenido: texto },
          {
            onSuccess: ({ conversation }) => {
              limpiar();
              onStarted(conversation.id);
            },
          },
        )
      }
      onEscribir={() => {
        if (empezar.isError) empezar.reset();
      }}
    />
  );
}

interface ChatProps {
  filas: MessageRow[];
  /** Lo que se ve sin mensajes: la presentación de un chat nuevo. */
  vacio: React.ReactNode;
  cargandoAnteriores: boolean;
  onLlegarAlPrincipio: () => void;
  enviando: boolean;
  error: string | null;
  /** Manda el texto. `limpiar` vacía el campo: solo se llama si el envío salió. */
  onEnviar: (texto: string, limpiar: () => void) => void;
  onEscribir: () => void;
}

/** La lista de mensajes y el campo para escribir, sin saber si la conversación ya existe. */
function Chat({
  filas,
  vacio,
  cargandoAnteriores,
  onLlegarAlPrincipio,
  enviando,
  error,
  onEnviar,
  onEscribir,
}: ChatProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { abierto: tecladoAbierto, margen } = useKeyboardHeight();
  const [texto, setTexto] = useState('');
  const limpio = texto.trim();
  const puedeEnviar = limpio.length > 0 && limpio.length <= MESSAGE_MAX_LENGTH && !enviando;

  const mandar = (): void => {
    if (!puedeEnviar) return;
    onEnviar(limpio, () => setTexto(''));
  };

  return (
    // En iOS el teclado tapa la pantalla y el campo sube con él; en Android lo
    // resuelve el modo `resize` de la ventana, igual que en el ingreso.
    <Animated.View style={[styles.fill, Platform.OS === 'ios' && { paddingBottom: margen }]}>
      {filas.length === 0 ? (
        <View style={styles.fill}>{vacio}</View>
      ) : (
        <FlatList
          inverted
          data={filas}
          keyExtractor={(fila) => fila.message.id}
          renderItem={({ item }) => <Burbuja fila={item} />}
          contentContainerStyle={styles.lista}
          onEndReached={onLlegarAlPrincipio}
          onEndReachedThreshold={0.3}
          keyboardShouldPersistTaps="handled"
          // Con la lista invertida, el "final" es arriba: el historial más viejo.
          ListFooterComponent={
            cargandoAnteriores ? (
              <ActivityIndicator style={styles.anteriores} color={colors.brandHover} />
            ) : undefined
          }
        />
      )}

      <View
        style={[
          styles.compositor,
          { paddingBottom: (tecladoAbierto ? 0 : insets.bottom) + spacing.sm },
        ]}
      >
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {limpio.length >= MOSTRAR_CONTADOR_DESDE ? (
          <Text
            style={[styles.contador, limpio.length > MESSAGE_MAX_LENGTH && styles.contadorExcedido]}
          >
            {limpio.length} / {MESSAGE_MAX_LENGTH}
          </Text>
        ) : null}
        <View style={styles.compositorFila}>
          <TextInput
            accessibilityLabel="Mensaje"
            placeholder="Escribí un mensaje"
            placeholderTextColor={colors.mutedSoft}
            value={texto}
            onChangeText={(valor) => {
              setTexto(valor);
              onEscribir();
            }}
            multiline
            style={styles.campo}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            accessibilityState={{ disabled: !puedeEnviar, busy: enviando }}
            disabled={!puedeEnviar}
            onPress={mandar}
            style={({ pressed }) => [
              styles.enviar,
              !puedeEnviar && styles.enviarDeshabilitado,
              pressed && styles.enviarPresionado,
            ]}
          >
            {enviando ? (
              <ActivityIndicator color={colors.inkDeep} />
            ) : (
              <Ionicons name="send" size={18} color={colors.inkDeep} />
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

function Burbuja({ fila }: { fila: MessageRow }): React.JSX.Element {
  const { message, mine, dayLabel, groupStart, groupEnd } = fila;

  return (
    // La lista invertida da vuelta el orden de las filas, no lo que hay dentro de
    // cada una: el separador de día queda arriba de su burbuja.
    <View style={groupStart && styles.inicioGrupo}>
      {dayLabel ? (
        <Text style={styles.dia} accessibilityRole="header">
          {dayLabel}
        </Text>
      ) : null}
      <View style={[styles.burbujaFila, mine ? styles.derecha : styles.izquierda]}>
        <View style={[styles.burbuja, mine ? styles.mia : styles.suya]}>
          <Text style={[styles.contenido, mine && styles.contenidoMio]} selectable>
            {message.contenido}
          </Text>
        </View>
        {groupEnd ? (
          <Text style={[styles.meta, mine && styles.metaMia]}>
            {formatHour(message.enviadoEl)}
            {mine ? (message.leidoEl ? ' · Leído' : ' · Enviado') : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  lista: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  anteriores: { marginVertical: spacing.md },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  vacioTitulo: {
    marginTop: spacing.sm,
    fontFamily: fonts.display,
    fontSize: fontSize.lg,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  vacioTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  inicioGrupo: { marginTop: spacing.md },
  dia: {
    alignSelf: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.lineSoft,
    overflow: 'hidden',
    fontFamily: fonts.semibold,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  burbujaFila: { marginTop: 3, maxWidth: '82%' },
  derecha: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  izquierda: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  burbuja: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 16 },
  mia: { backgroundColor: colors.brandDeep, borderBottomRightRadius: 4 },
  suya: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 4,
  },
  contenido: {
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.ink,
    lineHeight: 21,
  },
  contenidoMio: { color: colors.white },
  meta: {
    marginTop: 3,
    marginHorizontal: spacing.xs,
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.mutedSoft,
  },
  metaMia: { textAlign: 'right' },
  compositor: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  compositorFila: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  campo: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingTop: 11,
    paddingBottom: 11,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 21,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  enviar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  enviarDeshabilitado: { opacity: 0.4 },
  enviarPresionado: { backgroundColor: colors.brandBright },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  contador: {
    alignSelf: 'flex-end',
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  contadorExcedido: { color: colors.danger },
});
