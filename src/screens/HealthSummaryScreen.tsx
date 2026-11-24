import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  useIpsSummary,
  useOpenDocument,
} from '../features/patient-documents/hooks/use-patient-documents';
import { IpsImportSheet } from '../features/patient-profile/components/IpsImportSheet';
import { useMyProfile, useSaveVitalInfo } from '../features/patient-profile/hooks/use-my-profile';
import { fechaDelDocumento, mergeIps, type IpsSeleccion } from '../features/patient-profile/ips';
import { toForm, toInput } from '../features/patient-profile/vital-info';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../shared/ui/Button';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * El resumen de salud IPS que aportó el paciente, ordenado (ENG-246, ADR-022):
 * problemas, alergias, medicación y vacunas. Es un documento más de los que
 * trae de otro lugar, aparte de la historia firmada, y lo ven sus profesionales.
 *
 * Desde acá, si quiere, suma las alergias, la medicación y las condiciones a su
 * MediPass: se agregan a lo que ya tenía, sin borrar ni repetir.
 */
export function HealthSummaryScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { documentId } = useRoute<RouteProp<RootStackParamList, 'ResumenSalud'>>().params;
  const resumen = useIpsSummary(documentId);
  const abrir = useOpenDocument();
  const perfil = useMyProfile();
  const guardar = useSaveVitalInfo();
  const [sumando, setSumando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sumado, setSumado] = useState(false);
  const header = <ScreenHeader title="Resumen de salud" onBack={() => navigation.goBack()} />;

  if (resumen.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Cargando el resumen…" />
      </Screen>
    );
  }
  if (resumen.isError) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState message={resumen.error.message} onRetry={() => void resumen.refetch()} />
      </Screen>
    );
  }

  const datos = resumen.data;
  const { allergies, medications, conditions } = datos.propuesta;
  const fecha = fechaDelDocumento(datos.documento.fecha);
  const hayParaMediPass = allergies.length + medications.length + conditions.length > 0;

  async function sumar(seleccion: IpsSeleccion): Promise<void> {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    // El PUT reemplaza el bloque entero: se parte del perfil recién pedido para
    // no pisar lo que se haya cambiado desde otro dispositivo.
    const fresco = await perfil.refetch();
    if (fresco.isError || !fresco.data) {
      setError('No pudimos cargar tus datos actuales. Probá de nuevo.');
      setGuardando(false);
      return;
    }
    const { input, errors } = toInput(mergeIps(toForm(fresco.data), seleccion));
    if (Object.keys(errors).length > 0) {
      setError('Hay datos de tu MediPass que no se pueden guardar. Revisalos y probá de nuevo.');
      setGuardando(false);
      return;
    }
    guardar.mutate(input, {
      onSuccess: () => {
        setGuardando(false);
        setSumando(false);
        setSumado(true);
      },
      onError: (e) => {
        setError(e.message);
        setGuardando(false);
      },
    });
  }

  return (
    <Screen header={header}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>{datos.documento.titulo ?? 'Resumen de salud'}</Text>
        {fecha ? <Text style={styles.ayuda}>Del {fecha}</Text> : null}
        <View style={styles.aviso}>
          <Text style={styles.etiqueta}>NO VALIDADO</Text>
          <Text style={styles.avisoTexto}>
            Lo aportaste vos desde otro centro de salud. Lo ven los profesionales que te atienden,
            aparte de tu historia firmada.
          </Text>
        </View>
      </View>

      {sumado ? (
        <View accessibilityLiveRegion="polite" style={styles.listo}>
          <Ionicons name="checkmark-circle" size={18} color={colors.brandHover} />
          <Text style={styles.listoTexto}>Listo: ya se ve en tu MediPass.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Seccion titulo="PROBLEMAS Y CONDICIONES">
          {conditions.map((c) => (
            <Item key={c.nombre} texto={c.nombre} detalle={c.codigo} />
          ))}
        </Seccion>
        <Seccion titulo="ALERGIAS">
          {allergies.map((a) => (
            <Item key={a.que} texto={a.que} detalle={a.gravedad} alerta />
          ))}
        </Seccion>
        <Seccion titulo="MEDICACIÓN">
          {medications.map((m) => (
            <Item key={m.droga} texto={m.droga} detalle={m.dosis} />
          ))}
        </Seccion>
        <Seccion titulo="VACUNAS">
          {datos.vacunas.map((v) => (
            <Item
              key={`${v.vacuna}-${v.fecha ?? ''}`}
              texto={v.vacuna}
              detalle={fechaDelDocumento(v.fecha) ?? v.fecha ?? undefined}
            />
          ))}
        </Seccion>
      </View>

      {datos.ignorados.length > 0 ? (
        <Text style={styles.ayuda}>
          Hay partes del resumen que MediConnect todavía no muestra. Están en el archivo original.
        </Text>
      ) : null}

      {hayParaMediPass ? (
        <Button
          label="Sumar a mi MediPass"
          onPress={() => {
            setError(null);
            setSumado(false);
            setSumando(true);
          }}
          fullWidth
        />
      ) : null}
      <Button
        label="Abrir el archivo original"
        variant="secondary"
        onPress={() => abrir.mutate(documentId)}
        loading={abrir.isPending}
        fullWidth
      />
      {abrir.isError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {abrir.error.message}
        </Text>
      ) : null}

      <IpsImportSheet
        resumen={datos}
        visible={sumando}
        guardando={guardando}
        error={error}
        onDismiss={() => setSumando(false)}
        onSumar={(seleccion) => void sumar(seleccion)}
      />
    </Screen>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode[];
}): React.JSX.Element {
  return (
    <View style={styles.seccion}>
      <Text style={styles.seccionTitulo}>{titulo}</Text>
      {children.length > 0 ? children : <Text style={styles.vacio}>No trae.</Text>}
    </View>
  );
}

function Item({
  texto,
  detalle,
  alerta = false,
}: {
  texto: string;
  detalle?: string;
  alerta?: boolean;
}): React.JSX.Element {
  return (
    <Text style={[styles.item, alerta && styles.itemAlerta]}>
      {texto}
      {detalle ? <Text style={styles.itemDetalle}> · {detalle}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  cabecera: { gap: spacing.xs },
  titulo: { fontFamily: fonts.bold, fontSize: fontSize.lg, color: colors.brandDeep },
  ayuda: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
  aviso: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.warm,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  etiqueta: {
    fontFamily: fonts.bold,
    fontSize: fontSize.micro,
    letterSpacing: 1,
    color: colors.warmInk,
  },
  avisoTexto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.warmInk,
  },
  listo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceTeal,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  listoTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandHover },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card + 2,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  seccion: { gap: spacing.xs },
  seccionTitulo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.muted,
  },
  item: { fontFamily: fonts.medium, fontSize: fontSize.md, lineHeight: 21, color: colors.ink },
  itemAlerta: { fontFamily: fonts.semibold, color: colors.danger },
  itemDetalle: { fontFamily: fonts.regular, color: colors.muted },
  vacio: { fontFamily: fonts.regular, fontSize: fontSize.sm, color: colors.mutedSoft },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
});
