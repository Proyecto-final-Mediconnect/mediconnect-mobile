import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text } from 'react-native';

import { AccessHistory } from '../features/medipass/components/AccessHistory';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { colors, fonts, fontSize } from '../shared/ui/theme';

/** Quién abrió el MediPass, completo (ENG-76). Se abre desde el MediPass. */
export function MediPassHistoryScreen(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <Screen
      tone="dark"
      header={
        <ScreenHeader
          tone="dark"
          title="Quién abrió tu MediPass"
          onBack={() => navigation.goBack()}
        />
      }
    >
      <Text style={styles.ayuda}>
        Cada vez que alguien usa tu código o tu tarjeta queda registrado acá, con su nombre, su
        matrícula si la dio y qué información vio.
      </Text>
      <AccessHistory />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ayuda: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.onNightSoft,
  },
});
