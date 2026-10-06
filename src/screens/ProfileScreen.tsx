import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession, useSessionUser } from '../features/auth/session';
import { displayNameOf, initialsOf } from '../features/auth/types';
import { useMyProfile } from '../features/patient-profile/hooks/use-my-profile';
import { Button } from '../shared/ui/Button';
import { ConfirmSheet } from '../shared/ui/ConfirmSheet';
import { Notice } from '../shared/ui/Notice';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Mi perfil: quién es, sus datos y qué pasa con su información.
 *
 * El canvas nombra esta tab pero no la dibuja. Quién es sale de la sesión; sus
 * datos, de la ficha (`GET /patients/me`), que se carga y se edita en la web.
 * Cerrar sesión, después de confirmarlo, borra los tokens del dispositivo y la
 * app vuelve al ingreso (ENG-114).
 */
export function ProfileScreen(): React.JSX.Element {
  const user = useSessionUser();
  const ficha = useMyProfile();
  const { signOut } = useSession();
  const [confirmando, setConfirmando] = useState(false);
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

      <Text style={styles.seccion}>MIS DATOS</Text>
      {ficha.isPending ? (
        <View style={styles.cargando}>
          <LoadingState label="Cargando tus datos…" />
        </View>
      ) : ficha.isError ? (
        <ErrorState message={ficha.error.message} onRetry={() => void ficha.refetch()} />
      ) : (
        <>
          {ficha.data.completed ? null : (
            <Notice
              icon="create-outline"
              message="Todavía no completaste tus datos. Podés cargarlos desde MediConnect en la web."
            />
          )}
          <View style={styles.grupo}>
            <Fila icono="card-outline" rotulo="DNI" valor={ficha.data.dni ?? SIN_CARGAR} />
            <Fila
              icono="calendar-clear-outline"
              rotulo="Fecha de nacimiento"
              valor={ficha.data.birthDate ? fechaLarga(ficha.data.birthDate) : SIN_CARGAR}
            />
            <Fila
              icono="call-outline"
              rotulo="Teléfono"
              valor={ficha.data.phone ?? SIN_CARGAR}
              ultima
            />
          </View>
        </>
      )}

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

      {/* Con confirmación: un toque de más en el perfil no puede obligar a
          volver a escribir la contraseña. */}
      <Button
        label="Cerrar sesión"
        variant="secondary"
        onPress={() => setConfirmando(true)}
        fullWidth
      />

      <ConfirmSheet
        visible={confirmando}
        title="¿Cerrar sesión?"
        message="Para volver a ver tus turnos y tu historia clínica vas a tener que ingresar de nuevo con tu email y contraseña."
        confirmLabel="Sí, cerrar sesión"
        dismissLabel="Seguir en la app"
        pending={cerrando}
        onDismiss={() => setConfirmando(false)}
        onConfirm={() => void cerrarSesion()}
      />
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

const SIN_CARGAR = 'Sin cargar';

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
  cargando: { minHeight: 120 },
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
});
