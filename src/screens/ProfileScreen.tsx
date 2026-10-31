import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState, type ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useSession, useSessionUser } from '../features/auth/session';
import { displayNameOf, initialsOf } from '../features/auth/types';
import { useMyProfile } from '../features/patient-profile/hooks/use-my-profile';
import { isEmpty, toForm } from '../features/patient-profile/vital-info';
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
  const navigation = useNavigation();
  const ficha = useMyProfile();
  const { signOut } = useSession();
  const [confirmando, setConfirmando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);

  async function cerrarSesion(): Promise<void> {
    setCerrando(true);
    setErrorCierre(null);
    try {
      // Si sale bien, el navegador desmonta esta pantalla: no hace falta volver
      // `cerrando` a false.
      await signOut();
    } catch {
      // El borrado de los tokens falló, así que la sesión NO se cerró. Hay que
      // decirlo y dejar reintentar: callarlo dejaría al paciente creyendo que
      // salió, con los tokens todavía en el dispositivo.
      setCerrando(false);
      setErrorCierre('No pudimos cerrar tu sesión. Probá de nuevo.');
    }
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

      {ficha.data ? (
        <>
          <Text style={styles.seccion}>PARA UNA EMERGENCIA</Text>
          {/* Lo que ve un médico al escanear el MediPass (ENG-136). Vacío, el
              MediPass no le sirve de nada: se avisa y se lleva a cargarlo. */}
          {isEmpty(toForm(ficha.data)) ? (
            <Notice
              icon="medkit-outline"
              message="Tu MediPass está vacío: un médico de guardia solo vería tu nombre y tu edad."
            />
          ) : (
            <View style={styles.grupo}>
              <Fila
                icono="water-outline"
                rotulo="Grupo sanguíneo"
                valor={ficha.data.bloodType ?? SIN_CARGAR}
              />
              <Fila
                icono="alert-circle-outline"
                rotulo="Alergias"
                valor={lista(ficha.data.allergies?.map((a) => a.que))}
              />
              <Fila
                icono="medical-outline"
                rotulo="Medicación"
                valor={lista(ficha.data.medications?.map((m) => m.droga))}
              />
              <Fila
                icono="call-outline"
                rotulo="Contacto de emergencia"
                valor={
                  ficha.data.emergencyContact
                    ? `${ficha.data.emergencyContact.nombre} · ${ficha.data.emergencyContact.telefono}`
                    : SIN_CARGAR
                }
                ultima
              />
            </View>
          )}
          <Button
            label={
              isEmpty(toForm(ficha.data))
                ? 'Cargar mis datos de emergencia'
                : 'Editar mis datos de emergencia'
            }
            variant={isEmpty(toForm(ficha.data)) ? 'accent' : 'secondary'}
            onPress={() => navigation.navigate('DatosEmergencia')}
            fullWidth
          />
        </>
      ) : null}

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
        error={errorCierre ?? undefined}
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

/** "Penicilina, Ibuprofeno" o "Sin cargar". */
function lista(items: string[] | undefined): string {
  return items?.length ? items.join(', ') : SIN_CARGAR;
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
