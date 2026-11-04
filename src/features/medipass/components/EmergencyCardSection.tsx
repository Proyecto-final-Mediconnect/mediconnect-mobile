import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { WEB_URL } from '../../../shared/lib/web-url';
import { Button } from '../../../shared/ui/Button';
import { ConfirmSheet } from '../../../shared/ui/ConfirmSheet';
import { LoadingState } from '../../../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import {
  useCreateEmergencyCard,
  useDisableEmergencyCard,
  useEmergencyCard,
} from '../hooks/use-medipass';
import { emergencyCardUrl } from '../lib/medipass';
import type { EmergencyCardCreated } from '../types';

const QR_SIZE = 168;

const FECHA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/**
 * Tarjeta de emergencia del MediPass (ENG-176), la misma que en la web.
 *
 * El código rotativo solo sirve si el paciente puede mostrarlo. La tarjeta es un
 * QR **fijo** que se guarda (una captura) o se imprime desde la web, y abre lo
 * mismo que el código: 30 minutos de información vital, con registro y aviso.
 *
 * El token sale del backend una sola vez. Vive en el estado de este componente
 * —no en la caché, ver `useCreateEmergencyCard`— y se descarta si la app pasa a
 * segundo plano, igual que el código (ENG-117): nadie la ve sin que el paciente
 * esté mirando. Para volver a verla hay que generar otra, que invalida la
 * anterior.
 */
export function EmergencyCardSection({ nombre }: { nombre: string }): React.JSX.Element {
  const estado = useEmergencyCard();
  const crear = useCreateEmergencyCard();
  const desactivar = useDisableEmergencyCard();
  const [recien, setRecien] = useState<EmergencyCardCreated | null>(null);
  const [confirmar, setConfirmar] = useState<'regenerar' | 'desactivar' | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (siguiente) => {
      if (siguiente !== 'active') setRecien(null);
    });
    return () => sub.remove();
  }, []);

  const generar = (): void => {
    crear.mutate(undefined, {
      onSuccess: (tarjeta) => {
        setConfirmar(null);
        setRecien(tarjeta);
      },
    });
  };

  const cerrarConfirmacion = (): void => {
    setConfirmar(null);
    crear.reset();
    desactivar.reset();
  };

  return (
    <View style={styles.seccion}>
      <Text style={styles.ayuda}>
        Para que te atiendan aunque no puedas mostrar el código: si estás inconsciente o sin el
        celular, un médico escanea la tarjeta y ve tu información vital durante 30 minutos.
      </Text>

      {recien ? (
        <View style={styles.card}>
          <Text style={styles.etiqueta}>EMERGENCIA MÉDICA</Text>
          {nombre ? <Text style={styles.nombre}>{nombre}</Text> : null}
          <QRCode
            value={emergencyCardUrl(WEB_URL, recien.tarjeta)}
            size={QR_SIZE}
            color={colors.night}
            backgroundColor={colors.white}
            quietZone={8}
          />
          <Text style={styles.instruccion}>
            Escaneá este código con la cámara para ver mis alergias, medicación y contacto de
            emergencia.
          </Text>
          <View style={styles.aviso}>
            <Text style={styles.avisoTexto}>
              <Text style={styles.avisoFuerte}>Guardala ahora.</Text> Sacale una captura y llevala
              en el celular o impresa (también la podés imprimir desde la web). No la vamos a volver
              a mostrar.
            </Text>
          </View>
          <Button label="Listo, ya la guardé" onPress={() => setRecien(null)} fullWidth />
        </View>
      ) : estado.isPending ? (
        <View style={styles.cargando}>
          <LoadingState />
        </View>
      ) : estado.isError ? (
        <View style={styles.fila}>
          <Text accessibilityRole="alert" style={styles.error}>
            {estado.error.message}
          </Text>
          <Button label="Reintentar" variant="secondary" onPress={() => void estado.refetch()} />
        </View>
      ) : estado.data.activa ? (
        <View style={styles.fila}>
          <Text style={styles.activa}>
            Tenés una tarjeta activa
            {estado.data.creadaEl
              ? ` desde el ${FECHA.format(new Date(estado.data.creadaEl))}`
              : ''}
            . Si la perdiste o la querés volver a ver, generá una nueva: la anterior deja de
            funcionar.
          </Text>
          <Button
            label="Generar una nueva"
            variant="secondary"
            onPress={() => setConfirmar('regenerar')}
            fullWidth
          />
          <Button
            label="Desactivar"
            variant="ghost"
            onPress={() => setConfirmar('desactivar')}
            fullWidth
          />
        </View>
      ) : (
        <View style={styles.fila}>
          <Button
            label={crear.isPending ? 'Generando…' : 'Generar mi tarjeta'}
            variant="accent"
            onPress={generar}
            disabled={crear.isPending}
            fullWidth
          />
          {crear.isError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {crear.error.message}
            </Text>
          ) : null}
        </View>
      )}

      <ConfirmSheet
        visible={confirmar === 'regenerar'}
        title="¿Generar una tarjeta nueva?"
        message="La que tenés deja de funcionar en este momento, y si alguien entró con ella se le corta el acceso."
        confirmLabel="Generar una nueva"
        dismissLabel="Dejar la que tengo"
        confirmVariant="primary"
        pending={crear.isPending}
        error={crear.isError ? crear.error.message : null}
        onDismiss={cerrarConfirmacion}
        onConfirm={generar}
      />

      <ConfirmSheet
        visible={confirmar === 'desactivar'}
        title="¿Desactivar la tarjeta?"
        message="Nadie va a poder abrir tu MediPass con ella, y si alguien entró con ella se le corta el acceso. El código de la app sigue funcionando."
        confirmLabel="Desactivar"
        dismissLabel="Dejarla activa"
        pending={desactivar.isPending}
        error={desactivar.isError ? desactivar.error.message : null}
        onDismiss={cerrarConfirmacion}
        onConfirm={() => desactivar.mutate(undefined, { onSuccess: cerrarConfirmacion })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: spacing.md },
  ayuda: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.onNightSoft,
  },
  cargando: { minHeight: 80 },
  fila: { gap: spacing.sm },
  activa: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.onNight,
  },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.xs, color: colors.danger },
  card: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.card + 6,
    borderWidth: 2,
    borderColor: colors.danger,
    padding: spacing.xl,
    gap: spacing.md,
  },
  etiqueta: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
    color: colors.danger,
  },
  nombre: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.brandDeep },
  instruccion: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.brandDeep,
    textAlign: 'center',
  },
  aviso: {
    alignSelf: 'stretch',
    backgroundColor: colors.warm,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avisoTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.ink,
  },
  avisoFuerte: { fontFamily: fonts.bold },
});
