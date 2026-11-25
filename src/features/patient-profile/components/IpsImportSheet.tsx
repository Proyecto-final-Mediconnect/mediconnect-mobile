import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/ui/Button';
import { Sheet } from '../../../shared/ui/Sheet';
import { colors, fonts, fontSize, spacing } from '../../../shared/ui/theme';
import type { IpsResumen, IpsSeleccion } from '../ips';

type Grupo = keyof IpsSeleccion;

interface Item {
  id: string;
  grupo: Grupo;
  texto: string;
  detalle?: string;
}

const GRUPOS: { clave: Grupo; titulo: string }[] = [
  { clave: 'allergies', titulo: 'ALERGIAS' },
  { clave: 'medications', titulo: 'MEDICACIÓN' },
  { clave: 'conditions', titulo: 'CONDICIONES' },
];

function itemsDe(resumen: IpsResumen): Item[] {
  return [
    ...resumen.propuesta.allergies.map((a, i) => ({
      id: `allergies.${i}`,
      grupo: 'allergies' as const,
      texto: a.que,
      detalle: a.gravedad,
    })),
    ...resumen.propuesta.medications.map((m, i) => ({
      id: `medications.${i}`,
      grupo: 'medications' as const,
      texto: m.droga,
      detalle: m.dosis,
    })),
    ...resumen.propuesta.conditions.map((c, i) => ({
      id: `conditions.${i}`,
      grupo: 'conditions' as const,
      texto: c.nombre,
      detalle: c.codigo,
    })),
  ];
}

/**
 * Elegir qué sumar al MediPass de lo que trae el resumen de salud IPS (ENG-246):
 * el paso opcional después de subirlo. Arranca todo tildado: es lo que el
 * paciente vino a cargar, y destilda lo que no.
 */
export function IpsImportSheet({
  resumen,
  yaEsta,
  visible,
  guardando,
  error,
  onDismiss,
  onSumar,
}: {
  resumen: IpsResumen;
  /** Lo que ya está en el MediPass: se muestra, pero no se vuelve a ofrecer. */
  yaEsta: Set<string>;
  visible: boolean;
  guardando: boolean;
  error: string | null;
  onDismiss: () => void;
  onSumar: (seleccion: IpsSeleccion) => void;
}): React.JSX.Element {
  const items = itemsDe(resumen);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());

  // Cada vez que se abre, tildado de nuevo todo lo que falta.
  useEffect(() => {
    if (visible) {
      setElegidos(
        new Set(
          itemsDe(resumen)
            .map((i) => i.id)
            .filter((id) => !yaEsta.has(id)),
        ),
      );
    }
    // `yaEsta` es un Set nuevo en cada render: se recalcula solo al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, resumen]);
  // Si el perfil llegó después de abrir, lo que ya estaba no cuenta.
  const aSumar = new Set([...elegidos].filter((id) => !yaEsta.has(id)));

  function alternar(id: string): void {
    setElegidos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function sumar(): void {
    onSumar({
      allergies: resumen.propuesta.allergies.filter((_, i) => aSumar.has(`allergies.${i}`)),
      medications: resumen.propuesta.medications.filter((_, i) => aSumar.has(`medications.${i}`)),
      conditions: resumen.propuesta.conditions.filter((_, i) => aSumar.has(`conditions.${i}`)),
    });
  }

  return (
    <Sheet visible={visible} title="Sumar a mi MediPass" onDismiss={onDismiss}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.cuerpo}>
        <Text style={styles.ayuda}>
          Elegí qué sumar a tus datos de emergencia: es lo que ve un médico de guardia al escanear
          tu MediPass. Lo que ya tenías no se borra.
        </Text>

        {GRUPOS.map(({ clave, titulo }) => {
          const delGrupo = items.filter((i) => i.grupo === clave);
          if (delGrupo.length === 0) return null;
          return (
            <View key={clave} style={styles.grupo}>
              <Text style={styles.grupoTitulo}>{titulo}</Text>
              {delGrupo.map((item) => {
                const ya = yaEsta.has(item.id);
                const tildado = ya || elegidos.has(item.id);
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: tildado, disabled: ya }}
                    disabled={ya}
                    aria-checked={tildado}
                    accessibilityLabel={
                      item.detalle ? `${item.texto}, ${item.detalle}` : item.texto
                    }
                    onPress={() => alternar(item.id)}
                    style={styles.fila}
                  >
                    <View style={[styles.caja, tildado && styles.cajaTildada, ya && styles.cajaYa]}>
                      {tildado ? (
                        <Ionicons name="checkmark" size={15} color={colors.white} />
                      ) : null}
                    </View>
                    <Text style={[styles.filaTexto, ya && styles.filaYa]}>
                      {item.texto}
                      {item.detalle ? (
                        <Text style={styles.filaDetalle}> · {item.detalle}</Text>
                      ) : null}
                      {ya ? <Text style={styles.yaEsta}> · Ya está en tu MediPass</Text> : null}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          );
        })}

        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Button
          label={
            aSumar.size === 1
              ? 'Sumar 1 dato a mi MediPass'
              : `Sumar ${aSumar.size} datos a mi MediPass`
          }
          onPress={sumar}
          loading={guardando}
          disabled={aSumar.size === 0}
          fullWidth
        />
        <Button label="Cancelar" variant="ghost" onPress={onDismiss} fullWidth />
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 520 },
  cuerpo: { gap: spacing.md, paddingBottom: spacing.sm },
  ayuda: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
  grupo: { gap: spacing.sm },
  grupoTitulo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.muted,
  },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 2 },
  caja: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaTildada: { backgroundColor: colors.brandDeep, borderColor: colors.brandDeep },
  cajaYa: { opacity: 0.45 },
  filaYa: { color: colors.muted },
  yaEsta: { fontFamily: fonts.semibold, color: colors.brandHover },
  filaTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.ink,
  },
  filaDetalle: { fontFamily: fonts.regular, color: colors.muted },
  error: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.danger },
});
