import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MODO_DEMO } from '../mocks/demo';
import { PACIENTE_DEMO } from '../mocks/patient';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Mi perfil: quién es, sus datos y qué pasa con su información.
 *
 * El canvas nombra esta tab pero no la dibuja. "Cerrar sesión" llega con
 * ENG-114: sin sesión no hay nada que cerrar, y un botón que no hace nada es
 * peor que no tenerlo.
 */
export function ProfileScreen(): React.JSX.Element {
  const p = PACIENTE_DEMO;
  const iniciales = `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`;

  return (
    <Screen header={<ScreenHeader title="Mi perfil" />}>
      <View style={styles.identidad}>
        <View style={styles.avatar}>
          <Text style={styles.iniciales}>{iniciales}</Text>
        </View>
        <View style={styles.identidadTextos}>
          <Text style={styles.nombre}>
            {p.firstName} {p.lastName}
          </Text>
          <Text style={styles.email}>{p.email}</Text>
        </View>
      </View>

      <Text style={styles.seccion}>MIS DATOS</Text>
      <View style={styles.grupo}>
        <Fila icono="card-outline" rotulo="DNI" valor={p.dni} />
        <Fila
          icono="calendar-clear-outline"
          rotulo="Fecha de nacimiento"
          valor={fechaLarga(p.birthDate)}
        />
        <Fila icono="call-outline" rotulo="Teléfono" valor={p.phone} ultima />
      </View>

      <Text style={styles.seccion}>PRIVACIDAD</Text>
      <View style={styles.grupo}>
        <Fila
          icono="shield-checkmark-outline"
          rotulo="Tu historia clínica"
          valor="La ven solo los profesionales con los que tenés un turno."
        />
        <Fila
          icono="lock-closed-outline"
          rotulo="Tus registros"
          valor="Quedan sellados: nadie puede editarlos ni borrarlos."
          ultima
        />
      </View>

      {MODO_DEMO ? (
        <View style={styles.demo}>
          <Ionicons name="flask-outline" size={18} color={colors.brandHover} />
          <Text style={styles.demoTexto}>
            Estás viendo datos de ejemplo. Cuando inicies sesión, vas a ver los tuyos.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

function Fila({
  icono,
  rotulo,
  valor,
  ultima = false,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  rotulo: string;
  valor: string;
  ultima?: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.fila, !ultima && styles.filaBorde]}>
      <Ionicons name={icono} size={20} color={colors.brandHover} />
      <View style={styles.filaTextos}>
        <Text style={styles.rotulo}>{rotulo}</Text>
        <Text style={styles.valor}>{valor}</Text>
      </View>
    </View>
  );
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `1985-04-12` → `12 de abril de 1985`. Es una fecha de calendario, sin hora ni zona. */
function fechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  return `${d} de ${MESES[(m ?? 1) - 1]} de ${y}`;
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
  seccion: {
    marginTop: spacing.md,
    marginLeft: spacing.xs,
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  grupo: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  filaBorde: { borderBottomWidth: 1, borderBottomColor: colors.lineSoft },
  filaTextos: { flex: 1, gap: 2 },
  rotulo: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted },
  valor: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.ink },
  demo: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceTeal,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  demoTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.brandDeep,
  },
});
