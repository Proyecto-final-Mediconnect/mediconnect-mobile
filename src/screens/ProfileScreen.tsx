import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession, useSessionUser } from '../features/auth/session';
import { displayNameOf, initialsOf } from '../features/auth/types';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Tab de perfil: quién tiene la sesión abierta y cómo cerrarla (ENG-114). El
 * canvas la nombra en la barra pero no la dibuja.
 *
 * Cerrar sesión borra los tokens del dispositivo y la app vuelve al ingreso.
 */
export function ProfileScreen(): React.JSX.Element {
  const user = useSessionUser();
  const { signOut } = useSession();
  const [cerrando, setCerrando] = useState(false);

  async function cerrarSesion(): Promise<void> {
    setCerrando(true);
    // Al terminar, el navegador desmonta esta pantalla: no hace falta volver
    // `cerrando` a false.
    await signOut();
  }

  return (
    <Screen header={<ScreenHeader title="Mi perfil" />}>
      <View style={styles.identidad}>
        <View style={styles.avatar}>
          <Text style={styles.iniciales}>{initialsOf(user)}</Text>
        </View>
        <View style={styles.identidadTextos}>
          <Text style={styles.nombre}>{displayNameOf(user)}</Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      </View>

      <Button
        label="Cerrar sesión"
        variant="secondary"
        onPress={() => void cerrarSesion()}
        loading={cerrando}
        fullWidth
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.night,
  },
  iniciales: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.white },
  identidadTextos: { flex: 1, gap: 2 },
  nombre: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.brandDeep },
  email: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
});
