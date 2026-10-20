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
  const vigentes = accesses.filter(
    (a) => !a.revocadoEl && estadoDeAcceso(a, now).estado === 'VIGENTE',
  );

  if (vigentes.length === 0) {
    return (
      <View style={styles.vacio}>
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
            <View style={styles.vivo} />
            <View style={styles.textos}>
              <Text style={styles.quien}>{acceso.quien}</Text>
              <Text style={styles.contexto}>
                {acceso.contexto}
                {acceso.matricula ? ` · ${acceso.matricula}` : ''}
              </Text>
              <Text style={styles.vence}>Se corta sola en {cuentaRegresiva(resta)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Revocar el acceso de ${acceso.quien}`}
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
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  vivo: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandBright },
  textos: { flex: 1, gap: 2 },
  quien: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.white },
  contexto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.onNight },
  vence: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.onNightSoft },
  revocar: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  revocarTexto: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.white },
  vacio: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  vacioTexto: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.onNight },
});
