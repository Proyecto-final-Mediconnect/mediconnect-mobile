import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useSessionUser } from '../features/auth/session';
import { Avatar } from '../features/chat/components/Avatar';
import { useConversations } from '../features/chat/hooks/use-chat';
import { formatInboxTime, previewOf } from '../features/chat/lib/chat';
import type { ChatCounterpart, ConversationSummary } from '../features/chat/types';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Mensajes (ENG-152): la bandeja del chat con los profesionales, la misma que
 * la web (ENG-70).
 *
 * Arriba, las conversaciones, de la más reciente a la más vieja. Abajo, con
 * quién se puede empezar una: el backend solo deja escribirle a un profesional
 * con el que hubo turno.
 */
export function MessagesScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { id: myId } = useSessionUser();
  const bandeja = useConversations();
  const { refetch } = bandeja;

  // Al volver de una conversación, la bandeja tiene que mostrar lo último y
  // dejar de contar como no leído lo que se acaba de leer.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const abrir = (contraparte: ChatCounterpart, conversationId?: string): void =>
    navigation.navigate('Conversacion', {
      contraparteId: contraparte.id,
      nombre: contraparte.nombre,
      conversationId,
    });

  const header = <ScreenHeader title="Mensajes" onBack={() => navigation.goBack()} />;

  if (bandeja.isPending) {
    return (
      <Screen header={header} scroll={false}>
        <LoadingState label="Buscando tus mensajes…" />
      </Screen>
    );
  }

  if (bandeja.isError) {
    return (
      <Screen header={header} scroll={false}>
        <ErrorState message={bandeja.error.message} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  const { conversaciones, disponibles } = bandeja.data;

  if (conversaciones.length === 0 && disponibles.length === 0) {
    return (
      <Screen header={header} scroll={false}>
        <EmptyState
          icon="chatbubbles-outline"
          title="Todavía no tenés mensajes"
          description="Después de tu primer turno con un profesional vas a poder escribirle desde acá."
          action={{
            label: 'Sacar un turno',
            onPress: () => navigation.navigate('Paciente', { screen: 'Reservar' }),
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen header={header}>
      {conversaciones.length > 0 ? (
        <View style={styles.grupo}>
          {conversaciones.map((c, i) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              myId={myId}
              last={i === conversaciones.length - 1}
              onPress={() => abrir(c.contraparte, c.id)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.nota}>
          Todavía no le escribiste a nadie. Elegí un profesional para empezar.
        </Text>
      )}

      {disponibles.length > 0 ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>EMPEZAR UNA CONVERSACIÓN</Text>
          <View style={styles.grupo}>
            {disponibles.map((p, i) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`Escribirle a ${p.nombre}`}
                onPress={() => abrir(p)}
                style={({ pressed }) => [
                  styles.fila,
                  i < disponibles.length - 1 && styles.filaBorde,
                  pressed && styles.presionada,
                ]}
              >
                <Avatar nombre={p.nombre} />
                <Text style={[styles.nombre, styles.flex]} numberOfLines={1}>
                  {p.nombre}
                </Text>
                <Ionicons name="create-outline" size={20} color={colors.brandHover} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function ConversationRow({
  conversation,
  myId,
  last,
  onPress,
}: {
  conversation: ConversationSummary;
  myId: string;
  last: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { contraparte, ultimoMensaje, noLeidos } = conversation;
  const sinLeer = noLeidos > 0;
  const etiqueta = sinLeer
    ? `Conversación con ${contraparte.nombre}, ${noLeidos} ${noLeidos === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`
    : `Conversación con ${contraparte.nombre}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fila,
        !last && styles.filaBorde,
        pressed && styles.presionada,
      ]}
    >
      <Avatar nombre={contraparte.nombre} />
      <View style={styles.flex}>
        <View style={styles.filaArriba}>
          <Text style={[styles.nombre, styles.flex]} numberOfLines={1}>
            {contraparte.nombre}
          </Text>
          {ultimoMensaje ? (
            <Text style={[styles.hora, sinLeer && styles.horaSinLeer]}>
              {formatInboxTime(ultimoMensaje.enviadoEl)}
            </Text>
          ) : null}
        </View>
        <View style={styles.filaArriba}>
          <Text
            style={[styles.preview, sinLeer && styles.previewSinLeer, styles.flex]}
            numberOfLines={1}
          >
            {previewOf(ultimoMensaje, myId)}
          </Text>
          {sinLeer ? (
            <View style={styles.badge}>
              <Text style={styles.badgeTexto}>{noLeidos > 99 ? '99+' : noLeidos}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  seccion: { gap: spacing.sm, marginTop: spacing.sm },
  seccionTitulo: {
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  nota: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  grupo: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  filaBorde: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  presionada: { backgroundColor: colors.surfaceTeal },
  filaArriba: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  hora: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.mutedSoft },
  horaSinLeer: { fontFamily: fonts.bold, color: colors.brandHover },
  preview: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  previewSinLeer: { fontFamily: fonts.semibold, color: colors.ink },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  badgeTexto: { fontFamily: fonts.bold, fontSize: fontSize.xs, color: colors.inkDeep },
});
