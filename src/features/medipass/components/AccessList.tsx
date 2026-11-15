import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View, Pressable } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { cuentaRegresiva, estadoDeAcceso } from '../lib/medipass';
import type { MediPassAccess } from '../types';

interface AccessListProps {
  accesses: MediPassAccess[];
  now: Date;
  onRevoke: (access: MediPassAccess) => void;
}

/**
 * Quién está mirando el MediPass ahora (ENG-74), con cuánto le queda y la
 * opción de cortarlo (ENG-75). Los vencidos y revocados no se listan: mostrarlos
 * como vigentes haría creer que alguien está mirando cuando no.
 */
export function AccessList({ accesses, now, onRevoke }: AccessListProps): React.JSX.Element {
  // El backend ya los filtra; esto cubre el que vence entre dos consultas.
  const vigentes = accesses.filter((a) => estadoDeAcceso(a, now).estado === 'VIGENTE');

  if (vigentes.length === 0) {
    return (
      <View style={styles.vacio}>
        <View style={styles.vacioIcono}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.brandBright} />
        </View>
        <Text style={styles.vacioTexto}>Nadie está mirando tu MediPass en este momento.</Text>
      </View>
    );
  }

  return (
    <View style={styles.lista}>
      {vigentes.map((acceso) => {
        const estado = estadoDeAcceso(acceso, now);
        const resta = estado.estado === 'VIGENTE' ? estado.msRestantes : 0;
        return (
          <View key={acceso.id} style={styles.fila}>
            <View style={styles.inicial}>
              <Text style={styles.inicialTexto}>
                {acceso.consultante.trim().charAt(0).toUpperCase() || '?'}
              </Text>
              <View style={styles.vivo} />
            </View>
            <View style={styles.textos}>
              <Text style={styles.quien}>{acceso.consultante}</Text>
              <Text style={styles.contexto}>
                {acceso.origen === 'TARJETA' ? 'Entró con tu tarjeta' : 'Entró con tu código'}
                {acceso.matricula ? ` · Matrícula ${acceso.matricula}` : ''}
              </Text>
              <Text style={styles.vence}>Se corta sola en {cuentaRegresiva(resta)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Revocar el acceso de ${acceso.consultante}`}
              hitSlop={spacing.sm}
              onPress={() => onRevoke(acceso)}
              style={styles.revocar}
            >
              <Text style={styles.revocarTexto}>Revocar</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { gap: spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.nightCard,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  inicial: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.nightIcon,
  },
  inicialTexto: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.white },
  // Está mirando ahora: el punto encendido sobre la inicial.
  vivo: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.night,
    backgroundColor: colors.brandBright,
  },
  textos: { flex: 1, gap: 2 },
  quien: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.white },
  contexto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.onNight },
  vence: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.onNightSoft },
  // Cortar un acceso es lo urgente de esta pantalla: botón lleno, no un contorno.
  revocar: {
    backgroundColor: colors.danger,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  revocarTexto: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.white },
  vacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.nightCard,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  vacioIcono: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandBrightSoft,
  },
  vacioTexto: { flex: 1, fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.onNight },
});
