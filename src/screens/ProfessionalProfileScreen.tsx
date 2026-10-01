import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '../features/appointments/lib/appointments';
import { ProfessionalAvatar } from '../features/catalog/components/ProfessionalAvatar';
import { usePublicProfile } from '../features/catalog/hooks/use-catalog';
import { fullName } from '../features/catalog/lib/catalog';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Perfil público del profesional (ENG-132), equivalente mobile de ENG-50: quién
 * es, qué atiende, cuánto sale y su formación. Desde acá se pasa a elegir
 * horario (ENG-133).
 */
export function ProfessionalProfileScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'Profesional'>>();
  const perfil = usePublicProfile(params.id);
  const volver = (): void => navigation.goBack();

  if (perfil.isPending || perfil.isError) {
    return (
      <Screen scroll={false} header={<ScreenHeader title="Profesional" onBack={volver} />}>
        {perfil.isPending ? (
          <LoadingState label="Cargando el perfil…" />
        ) : (
          <ErrorState message={perfil.error.message} onRetry={() => void perfil.refetch()} />
        )}
      </Screen>
    );
  }

  const p = perfil.data;
  const especialidades = p.specialties.map((e) => e.name).join(' · ');

  return (
    <Screen
      hero={
        <ScreenHeader
          hero
          tone="dark"
          title={fullName(p)}
          subtitle={especialidades || 'Profesional de MediConnect'}
          onBack={volver}
        />
      }
    >
      <View style={styles.card}>
        <View style={styles.fila}>
          <ProfessionalAvatar professional={p} size={64} />
          <View style={styles.precioBloque}>
            <Text style={styles.rotulo}>CONSULTA POR VIDEO</Text>
            <Text style={styles.precio}>
              {p.price === null ? 'Precio a confirmar' : formatPrice(p.price)}
            </Text>
          </View>
        </View>
        <Button
          label="Ver turnos disponibles"
          onPress={() => navigation.navigate('Reservar', { professionalId: p.id })}
          fullWidth
        />
      </View>

      {p.bio ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Sobre mí</Text>
          <Text style={styles.bio}>{p.bio}</Text>
        </View>
      ) : null}

      {p.education.length > 0 ? (
        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Formación</Text>
          {p.education.map((e) => (
            <View key={e.id} style={styles.formacion}>
              <Text style={styles.titulo}>{e.degree}</Text>
              <Text style={styles.institucion}>
                {e.institution}
                {e.year ? ` · ${e.year}` : ''}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card + 2,
    padding: spacing.lg,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  precioBloque: { flex: 1, gap: 2 },
  rotulo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.brandHover,
  },
  precio: { fontFamily: fonts.display, fontSize: fontSize.xxl, color: colors.brandDeep },
  seccion: {
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  seccionTitulo: { fontFamily: fonts.display, fontSize: fontSize.lg, color: colors.brandDeep },
  bio: { fontFamily: fonts.regular, fontSize: fontSize.md, lineHeight: 22, color: colors.ink },
  formacion: { gap: 2, paddingVertical: spacing.xs },
  titulo: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.ink },
  institucion: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
});
