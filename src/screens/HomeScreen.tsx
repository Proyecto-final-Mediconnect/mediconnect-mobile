import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { QuickTile } from '../shared/ui/QuickTile';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Inicio: responde "¿qué tengo que hacer ahora?" antes que "¿adónde voy?".
 *
 * Arriba la franja oscura del canvas con el saludo, montada encima la próxima
 * consulta —con el botón para entrar a la sala cuando está abierta— y debajo
 * los accesos rápidos.
 *
 * Lo que falta necesita la sesión (ENG-114):
 * - El nombre en el saludo.
 * - La próxima consulta: ENG-115 cambia la tarjeta de abajo por
 *   `<NextAppointmentCard appointment={nextAppointment(turnos)} …/>`, que ya
 *   tiene sus estados y sus tests.
 *
 * La historia clínica queda como acceso y no muestra su última entrada ni
 * cuántas tiene: cada lectura de la HC deja un registro de acceso en la
 * auditoría (Ley 26.529), y abrir la app no es consultar la historia.
 */
export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <Screen
      hero={
        <ScreenHeader
          hero
          tone="dark"
          title="Hola"
          subtitle="Tus turnos, tu historia clínica y tu MediPass, en un solo lugar."
        />
      }
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>PRÓXIMA CONSULTA</Text>
        <Text style={styles.texto}>Acá vas a ver tu próximo turno y entrar a la sala.</Text>
      </View>

      <View style={styles.accesos}>
        <QuickTile
          icon="calendar-outline"
          title="Turnos"
          caption="Próximos y pasados"
          onPress={() => navigation.navigate('Paciente', { screen: 'Turnos' })}
        />
        <QuickTile
          icon="document-text-outline"
          title="Historia"
          caption="Tu historia clínica"
          onPress={() => navigation.navigate('HistoriaClinica')}
        />
        <QuickTile
          icon="qr-code-outline"
          title="MediPass"
          caption="Tu código de emergencia"
          onPress={() => navigation.navigate('Paciente', { screen: 'MediPass' })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card + 2,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.brandHover,
  },
  texto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  accesos: { flexDirection: 'row', gap: spacing.sm },
});
