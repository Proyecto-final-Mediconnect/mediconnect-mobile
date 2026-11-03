import { StyleSheet, Switch, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import type { MediPassScope, VitalBlock } from '../types';

/**
 * Lo que ve quien escanea el código (ENG-117): grupo sanguíneo, alergias,
 * medicación activa y diagnósticos. Es el bloque vital, el mínimo que no se
 * puede apagar. Va en el mismo orden en que lo lee un médico de guardia: lo
 * que puede matar primero.
 *
 * Lo que el paciente no cargó todavía se dice ("Sin cargar"): acá lo lee él
 * mismo, y tiene que saber qué le falta antes de necesitarlo.
 */
export function VitalSummary({
  vital,
  scope,
  onToggle,
  saving = false,
}: {
  vital: VitalBlock;
  /** Qué ve un consultante externo (ENG-149). Sin esto no hay interruptores. */
  scope?: MediPassScope;
  onToggle?: (bloque: keyof MediPassScope) => void;
  saving?: boolean;
}): React.JSX.Element {
  const alergias = vital.alergias ?? [];
  const medicacion = vital.medicacion ?? [];
  const condiciones = vital.condiciones ?? [];
  /** El interruptor de un bloque: solo si hay algo cargado para mostrar u ocultar. */
  const control = (bloque: keyof MediPassScope, titulo: string, hayDatos: boolean) =>
    scope && onToggle && hayDatos
      ? { visible: scope[bloque], onToggle: () => onToggle(bloque), titulo, saving }
      : undefined;

  return (
    <View style={styles.bloque}>
      <View style={styles.fila}>
        <Dato
          rotulo="GRUPO SANGUÍNEO"
          valor={vital.grupoSanguineo || SIN_CARGAR}
          control={control('grupoSanguineo', 'Grupo sanguíneo', !!vital.grupoSanguineo)}
        />
        <Dato rotulo="EDAD" valor={vital.edad != null ? `${vital.edad} años` : SIN_CARGAR} />
      </View>

      <Seccion titulo="ALERGIAS" control={control('alergias', 'Alergias', alergias.length > 0)}>
        {alergias.length ? (
          alergias.map((a) => (
            <Linea key={a.que} principal={a.que} secundaria={a.gravedad} alerta />
          ))
        ) : (
          <Linea principal={SIN_CARGAR} />
        )}
      </Seccion>

      <Seccion
        titulo="MEDICACIÓN ACTIVA"
        control={control('medicacion', 'Medicación', medicacion.length > 0)}
      >
        {medicacion.length ? (
          medicacion.map((m) => (
            <Linea
              key={m.droga}
              principal={m.droga}
              secundaria={[m.dosis, m.nota].filter(Boolean).join(' · ')}
            />
          ))
        ) : (
          <Linea principal={SIN_CARGAR} />
        )}
      </Seccion>

      <Seccion
        titulo="DIAGNÓSTICOS"
        control={control('condiciones', 'Diagnósticos', condiciones.length > 0)}
      >
        {condiciones.length ? (
          condiciones.map((c) => (
            <Linea key={c.nombre} principal={c.nombre} secundaria={c.codigo} />
          ))
        ) : (
          <Linea principal={SIN_CARGAR} />
        )}
      </Seccion>

      <Seccion
        titulo="CONTACTO DE EMERGENCIA"
        control={control('contacto', 'Contacto de emergencia', !!vital.contacto)}
      >
        {vital.contacto ? (
          <Linea
            principal={`${vital.contacto.nombre} · ${vital.contacto.vinculo}`}
            secundaria={vital.contacto.telefono}
          />
        ) : (
          <Linea principal={SIN_CARGAR} />
        )}
      </Seccion>
    </View>
  );
}

const SIN_CARGAR = 'Sin cargar';

interface Control {
  visible: boolean;
  onToggle: () => void;
  titulo: string;
  saving: boolean;
}

/**
 * El interruptor de un bloque (ENG-149). Apagado, el bloque se ve tenue y dice
 * que el médico no lo ve: el paciente sigue viendo su información, pero sabe
 * qué queda afuera.
 */
function Interruptor({ control }: { control: Control }): React.JSX.Element {
  return (
    <Switch
      accessibilityLabel={`Mostrar ${control.titulo.toLowerCase()} a quien escanea`}
      value={control.visible}
      onValueChange={control.onToggle}
      disabled={control.saving}
      trackColor={{ false: 'rgba(255, 255, 255, 0.18)', true: colors.brand }}
      thumbColor={colors.white}
    />
  );
}

function Oculto(): React.JSX.Element {
  return <Text style={styles.oculto}>No lo ve quien escanea tu código</Text>;
}

function Dato({
  rotulo,
  valor,
  control,
}: {
  rotulo: string;
  valor: string;
  control?: Control;
}): React.JSX.Element {
  const apagado = control && !control.visible;
  return (
    <View style={[styles.dato, apagado && styles.apagado]}>
      <View style={styles.cabecera}>
        <Text style={styles.rotulo}>{rotulo}</Text>
        {control ? <Interruptor control={control} /> : null}
      </View>
      <Text style={styles.datoValor}>{valor}</Text>
      {apagado ? <Oculto /> : null}
    </View>
  );
}

function Seccion({
  titulo,
  control,
  children,
}: {
  titulo: string;
  control?: Control;
  children: React.ReactNode;
}): React.JSX.Element {
  const apagado = control && !control.visible;
  return (
    <View style={[styles.seccion, apagado && styles.apagado]}>
      <View style={styles.cabecera}>
        <Text style={styles.rotulo}>{titulo}</Text>
        {control ? <Interruptor control={control} /> : null}
      </View>
      {children}
      {apagado ? <Oculto /> : null}
    </View>
  );
}

function Linea({
  principal,
  secundaria,
  alerta = false,
}: {
  principal: string;
  secundaria?: string;
  alerta?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.linea}>
      {alerta ? <View style={styles.puntoAlerta} /> : null}
      <View style={styles.lineaTextos}>
        <Text style={styles.principal}>{principal}</Text>
        {secundaria ? <Text style={styles.secundaria}>{secundaria}</Text> : null}
      </View>
    </View>
  );
}

const TARJETA_OSCURA = 'rgba(255, 255, 255, 0.06)';

const styles = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  apagado: { opacity: 0.55 },
  oculto: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    fontStyle: 'italic',
    color: colors.onNightSoft,
  },
  bloque: { gap: spacing.sm },
  fila: { flexDirection: 'row', gap: spacing.sm },
  dato: {
    flex: 1,
    backgroundColor: TARJETA_OSCURA,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: 4,
  },
  datoValor: { fontFamily: fonts.display, fontSize: fontSize.xl, color: colors.white },
  seccion: {
    backgroundColor: TARJETA_OSCURA,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rotulo: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2, color: colors.onNightSoft },
  linea: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  puntoAlerta: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger },
  lineaTextos: { flex: 1, gap: 1 },
  principal: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.white },
  secundaria: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.onNight },
});
