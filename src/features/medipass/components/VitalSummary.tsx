import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import type { VitalBlock } from '../types';

/**
 * Lo que ve quien escanea el código (ENG-117): grupo sanguíneo, alergias,
 * medicación activa y diagnósticos. Es el bloque vital, el mínimo que no se
 * puede apagar. Va en el mismo orden en que lo lee un médico de guardia: lo
 * que puede matar primero.
 *
 * Lo que el paciente no cargó todavía se dice ("Sin cargar"): acá lo lee él
 * mismo, y tiene que saber qué le falta antes de necesitarlo.
 */
export function VitalSummary({ vital }: { vital: VitalBlock }): React.JSX.Element {
  const alergias = vital.alergias ?? [];
  const medicacion = vital.medicacion ?? [];
  const condiciones = vital.condiciones ?? [];

  return (
    <View style={styles.bloque}>
      <View style={styles.fila}>
        <Dato rotulo="GRUPO SANGUÍNEO" valor={vital.grupoSanguineo || SIN_CARGAR} />
        <Dato rotulo="EDAD" valor={vital.edad != null ? `${vital.edad} años` : SIN_CARGAR} />
      </View>

      <Seccion titulo="ALERGIAS">
        {alergias.length ? (
          alergias.map((a) => (
            <Linea key={a.que} principal={a.que} secundaria={a.gravedad} alerta />
          ))
        ) : (
          <Linea principal={SIN_CARGAR} />
        )}
      </Seccion>

      <Seccion titulo="MEDICACIÓN ACTIVA">
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

      <Seccion titulo="DIAGNÓSTICOS">
        {condiciones.length ? (
          condiciones.map((c) => (
            <Linea key={c.nombre} principal={c.nombre} secundaria={c.codigo} />
          ))
        ) : (
          <Linea principal={SIN_CARGAR} />
        )}
      </Seccion>

      <Seccion titulo="CONTACTO DE EMERGENCIA">
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

function Dato({ rotulo, valor }: { rotulo: string; valor: string }): React.JSX.Element {
  return (
    <View style={styles.dato}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.seccion}>
      <Text style={styles.rotulo}>{titulo}</Text>
      {children}
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
