import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import { useMyNotifications } from '../hooks/use-notifications';
import { badgeText } from '../lib/notifications';

/**
 * La campanita del inicio, la misma que la de la web (ENG-69): abre "Avisos" y
 * muestra cuántos hay sin leer. Va sobre la franja oscura.
 *
 * El contador es el del servidor, no el de la lista, que trae solo los últimos.
 */
export function NotificationsBell(): React.JSX.Element {
  const navigation = useNavigation();
  const bandeja = useMyNotifications();
  const { refetch } = bandeja;

  // Al volver al inicio (por ejemplo, desde "Avisos") el número tiene que estar al día.
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  // Una respuesta con otra forma no rompe el inicio: sin número.
  const sinLeer = typeof bandeja.data?.unreadCount === 'number' ? bandeja.data.unreadCount : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sinLeer > 0 ? `Avisos, ${sinLeer} sin leer` : 'Avisos'}
      hitSlop={spacing.xs}
      onPress={() => navigation.navigate('Avisos')}
      style={({ pressed }) => [styles.boton, pressed && styles.presionado]}
    >
      <Ionicons
        name={sinLeer > 0 ? 'notifications' : 'notifications-outline'}
        size={20}
        color={colors.white}
      />
      {sinLeer > 0 ? (
        <View style={styles.globo} accessibilityElementsHidden importantForAccessibility="no">
          <Text style={styles.globoTexto}>{badgeText(sinLeer)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  boton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.nightIcon,
  },
  presionado: { backgroundColor: colors.nightTrack },
  globo: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.night,
  },
  globoTexto: {
    fontFamily: fonts.bold,
    fontSize: fontSize.micro,
    lineHeight: 12,
    color: colors.white,
  },
});
