import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/ui/Button';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { openRoom, useJoinConsultation } from '../hooks/use-join-consultation';
import type { VideoConsultationAccess } from '../types';

interface JoinConsultationButtonProps {
  appointmentId: string;
}

/**
 * "Ingresar a la sala" (ENG-131): pide la sala al backend y la abre en el
 * navegador dentro de la app.
 *
 * Va solo donde la sala está abierta —quien lo usa ya lo decidió con
 * `joinStateOf`—, pero el backend tiene la última palabra: si responde que la
 * sala todavía no abrió o ya terminó, se muestra su mensaje acá mismo.
 *
 * Si la consulta se graba, se avisa antes de entrar y se entra solo si el
 * paciente lo confirma: no puede enterarse adentro de la sala.
 */
export function JoinConsultationButton({
  appointmentId,
}: JoinConsultationButtonProps): React.JSX.Element {
  const unirse = useJoinConsultation();
  // La sala que espera que el paciente acepte la grabación. Vive solo en
  // memoria, mientras se muestra el aviso.
  const [conGrabacion, setConGrabacion] = useState<VideoConsultationAccess | null>(null);
  const [errorApertura, setErrorApertura] = useState<string | null>(null);

  async function abrir(acceso: VideoConsultationAccess): Promise<void> {
    try {
      await openRoom(acceso);
    } catch {
      setErrorApertura('No pudimos abrir el navegador. Probá de nuevo.');
    }
  }

  function entrar(): void {
    setConGrabacion(null);
    setErrorApertura(null);
    unirse.mutate(appointmentId, {
      onSuccess: (acceso) => {
        if (acceso.recording.enabled) setConGrabacion(acceso);
        else void abrir(acceso);
      },
    });
  }

  if (conGrabacion) {
    return (
      <View style={styles.grabacion} accessibilityRole="alert">
        <View style={styles.grabacionFila}>
          <Ionicons name="mic-outline" size={18} color={colors.warmInk} />
          <Text style={styles.grabacionTexto}>
            El audio de esta consulta se graba para tu historia clínica.
          </Text>
        </View>
        <Button
          label="Entrar a la sala"
          variant="accent"
          fullWidth
          onPress={() => {
            const acceso = conGrabacion;
            setConGrabacion(null);
            void abrir(acceso);
          }}
        />
        <Button label="Ahora no" variant="ghost" fullWidth onPress={() => setConGrabacion(null)} />
      </View>
    );
  }

  return (
    <View style={styles.contenedor}>
      <Button
        label="Ingresar a la sala"
        variant="accent"
        onPress={entrar}
        loading={unirse.isPending}
        fullWidth
      />
      {unirse.isError || errorApertura ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorTexto}>{errorApertura ?? unirse.error?.message}</Text>
        </View>
      ) : (
        <Text style={styles.ayuda}>
          Se abre en el navegador y te va a pedir la cámara y el micrófono.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.sm },
  ayuda: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
  },
  error: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  errorTexto: { flex: 1, fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
  grabacion: {
    gap: spacing.sm,
    backgroundColor: colors.warm,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  grabacionFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grabacionTexto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.warmInk,
  },
});
