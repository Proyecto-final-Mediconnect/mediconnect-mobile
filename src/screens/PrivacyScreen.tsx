import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { useSession, useSessionUser } from '../features/auth/session';
import {
  deleteMyAccount,
  fetchPreferences,
  FRASE_DE_BAJA,
  savePreferences,
  type Preferences,
} from '../features/privacy/api';
import { WEB_URL } from '../shared/lib/web-url';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { TextField } from '../shared/ui/TextField';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

const PREFERENCIAS_KEY = ['me', 'preferences'] as const;

/**
 * Privacidad y datos (ENG-86): los derechos ARCO de la Ley 25.326 desde la app,
 * los mismos que en la web.
 *
 * La descarga del archivo se hace en la web: un JSON con la historia clínica
 * entera no tiene dónde guardarse con criterio dentro de la app, y en la web el
 * navegador lo baja como cualquier archivo.
 */
export function PrivacyScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const user = useSessionUser();
  const esPaciente = user.role === 'PACIENTE';

  return (
    <Screen header={<ScreenHeader title="Privacidad y datos" onBack={() => navigation.goBack()} />}>
      <Text style={styles.intro}>
        Tus derechos sobre tus datos personales, según la Ley 25.326.
      </Text>

      <Tarjeta titulo="Descargar tus datos">
        <Text style={styles.texto}>
          Un archivo con todo lo que guardamos de vos: tu cuenta, tus turnos, tu historia clínica
          completa, quién la leyó y tu MediPass. Se descarga desde la web.
        </Text>
        <Button
          label="Abrir en la web"
          variant="secondary"
          onPress={() => void WebBrowser.openBrowserAsync(`${WEB_URL}/privacidad`)}
          fullWidth
        />
      </Tarjeta>

      {esPaciente ? <Recordatorios /> : null}

      <DarDeBaja esPaciente={esPaciente} />
    </Screen>
  );
}

function Tarjeta({
  titulo,
  children,
  peligro = false,
}: {
  titulo: string;
  children: React.ReactNode;
  peligro?: boolean;
}): React.JSX.Element {
  return (
    <View style={[styles.tarjeta, peligro && styles.tarjetaPeligro]}>
      <Text accessibilityRole="header" style={[styles.titulo, peligro && styles.tituloPeligro]}>
        {titulo}
      </Text>
      {children}
    </View>
  );
}

/** Oposición (art. 27): los recordatorios por email, lo único no imprescindible. */
function Recordatorios(): React.JSX.Element {
  const queryClient = useQueryClient();
  const preferencias = useQuery({ queryKey: PREFERENCIAS_KEY, queryFn: fetchPreferences });
  const guardar = useMutation({
    mutationFn: savePreferences,
    onMutate: async (nuevas: Preferences) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCIAS_KEY });
      const anteriores = queryClient.getQueryData<Preferences>(PREFERENCIAS_KEY);
      queryClient.setQueryData(PREFERENCIAS_KEY, nuevas);
      return { anteriores };
    },
    onError: (_e, _n, contexto) => {
      if (contexto?.anteriores) queryClient.setQueryData(PREFERENCIAS_KEY, contexto.anteriores);
    },
  });

  return (
    <Tarjeta titulo="Recordatorios por email">
      <View style={styles.filaSwitch}>
        <Text style={[styles.texto, styles.flex]}>
          Te escribimos 24 horas y 1 hora antes de cada turno. La confirmación de cada reserva te va
          a seguir llegando.
        </Text>
        <Switch
          accessibilityLabel="Recibir recordatorios por email"
          value={preferencias.data?.recordatoriosPorEmail ?? false}
          disabled={!preferencias.data || guardar.isPending}
          onValueChange={(valor) => guardar.mutate({ recordatoriosPorEmail: valor })}
          trackColor={{ false: colors.lineStrong, true: colors.brand }}
          thumbColor={colors.white}
        />
      </View>
      {preferencias.isError || guardar.isError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {preferencias.isError ? preferencias.error.message : guardar.error?.message}
        </Text>
      ) : null}
    </Tarjeta>
  );
}

/** Supresión (art. 16). */
function DarDeBaja({ esPaciente }: { esPaciente: boolean }): React.JSX.Element {
  const { signOut } = useSession();
  const [frase, setFrase] = useState('');
  const coincide = frase.trim() === FRASE_DE_BAJA;
  const baja = useMutation({
    mutationFn: deleteMyAccount,
    // Los datos ya se borraron del otro lado: se borran los tokens del
    // dispositivo y la app vuelve al ingreso.
    onSuccess: () => signOut(),
  });

  return (
    <Tarjeta titulo="Dar de baja tu cuenta" peligro>
      <Text style={styles.texto}>
        No se puede deshacer. Antes, cancelá los turnos que tengas pendientes.
      </Text>
      <Text style={styles.subtitulo}>Lo que se borra</Text>
      <Text style={styles.texto}>
        {esPaciente
          ? 'Tu email, teléfono y domicilio, tus datos de emergencia y tu MediPass, tus reseñas, los documentos que subiste, tus avisos y tu acceso.'
          : 'Tu email, tu perfil público, tu agenda, tus avisos y tu acceso.'}
      </Text>
      <Text style={styles.subtitulo}>Lo que la ley nos obliga a guardar</Text>
      <Text style={styles.texto}>
        {esPaciente
          ? 'Tu historia clínica, 10 años desde la última atención (Ley 26.529), la constancia de tu consentimiento y los pagos.'
          : 'Las entradas de historia clínica que firmaste (Ley 26.529), la constancia de tu consentimiento y los pagos.'}
      </Text>
      <TextField
        label={`Para confirmar, escribí ${FRASE_DE_BAJA}`}
        value={frase}
        onChangeText={setFrase}
        autoCapitalize="characters"
        autoCorrect={false}
      />
      <Button
        label={baja.isPending ? 'Dando de baja…' : 'Dar de baja mi cuenta'}
        variant="danger"
        disabled={!coincide || baja.isPending}
        onPress={() => baja.mutate()}
        fullWidth
      />
      {baja.isError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {baja.error.message}
        </Text>
      ) : null}
    </Tarjeta>
  );
}

const styles = StyleSheet.create({
  intro: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
  tarjeta: {
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  tarjetaPeligro: { borderColor: colors.danger },
  titulo: { fontFamily: fonts.display, fontSize: fontSize.lg + 2, color: colors.brandDeep },
  tituloPeligro: { color: colors.danger },
  subtitulo: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandDeep },
  texto: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
  flex: { flex: 1 },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.danger },
});
