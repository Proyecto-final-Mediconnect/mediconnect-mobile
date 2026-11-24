import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../../../shared/ui/Button';
import { Sheet } from '../../../shared/ui/Sheet';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import type { IpsPreview, IpsSeleccion } from '../ips';

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

function itemsDe(preview: IpsPreview): Item[] {
  return [
    ...preview.propuesta.allergies.map((a, i) => ({
      id: `allergies.${i}`,
      grupo: 'allergies' as const,
      texto: a.que,
      detalle: a.gravedad,
    })),
    ...preview.propuesta.medications.map((m, i) => ({
      id: `medications.${i}`,
      grupo: 'medications' as const,
      texto: m.droga,
      detalle: m.dosis,
    })),
    ...preview.propuesta.conditions.map((c, i) => ({
      id: `conditions.${i}`,
      grupo: 'conditions' as const,
      texto: c.nombre,
      detalle: c.codigo,
    })),
  ];
}

/** "26 de enero de 2018", o `null`. Solo el día: sin correrse por la zona. */
function fechaDe(fecha: string | null): string | null {
  const dia = fecha?.slice(0, 10);
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dia}T00:00:00Z`));
}

/**
 * Lo que trae el resumen de salud IPS (ENG-246), para elegir qué sumar a los
 * datos de emergencia. Arranca todo tildado: es lo que el paciente vino a
 * cargar. Lo elegido va al formulario, y se guarda con "Guardar" como siempre.
 */
export function IpsImportSheet({
  preview,
  onDismiss,
  onAgregar,
}: {
  preview: IpsPreview | null;
  onDismiss: () => void;
  onAgregar: (seleccion: IpsSeleccion) => void;
}): React.JSX.Element {
  const items = preview ? itemsDe(preview) : [];
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (preview) setElegidos(new Set(itemsDe(preview).map((i) => i.id)));
  }, [preview]);

  function alternar(id: string): void {
    setElegidos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function agregar(): void {
    if (!preview) return;
    onAgregar({
      allergies: preview.propuesta.allergies.filter((_, i) => elegidos.has(`allergies.${i}`)),
      medications: preview.propuesta.medications.filter((_, i) => elegidos.has(`medications.${i}`)),
      conditions: preview.propuesta.conditions.filter((_, i) => elegidos.has(`conditions.${i}`)),
    });
  }

  const fecha = fechaDe(preview?.documento.fecha ?? null);

  return (
    <Sheet visible={preview !== null} title="Tu resumen de salud" onDismiss={onDismiss}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.cuerpo}>
        {preview?.documento.titulo ? (
          <Text style={styles.titulo}>{preview.documento.titulo}</Text>
        ) : null}
        {fecha ? <Text style={styles.ayuda}>Del {fecha}</Text> : null}

        {preview?.documento.dniCoincide === false ? (
          <View accessibilityRole="alert" style={styles.aviso}>
            <Ionicons name="warning-outline" size={18} color={colors.warmInk} />
            <Text style={styles.avisoTexto}>
              El DNI de este resumen no es el tuyo. Revisá que sea tuyo antes de cargarlo: lo ve un
              médico en una emergencia.
            </Text>
          </View>
        ) : null}

        {items.length === 0 ? (
          <Text style={styles.ayuda}>
            Este resumen no trae alergias, medicación ni condiciones para cargar.
          </Text>
        ) : (
          GRUPOS.map(({ clave, titulo }) => {
            const delGrupo = items.filter((i) => i.grupo === clave);
            if (delGrupo.length === 0) return null;
            return (
              <View key={clave} style={styles.grupo}>
                <Text style={styles.grupoTitulo}>{titulo}</Text>
                {delGrupo.map((item) => {
                  const tildado = elegidos.has(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: tildado }}
                      aria-checked={tildado}
                      accessibilityLabel={
                        item.detalle ? `${item.texto}, ${item.detalle}` : item.texto
                      }
                      onPress={() => alternar(item.id)}
                      style={styles.fila}
                    >
                      <View style={[styles.caja, tildado && styles.cajaTildada]}>
                        {tildado ? (
                          <Ionicons name="checkmark" size={15} color={colors.white} />
                        ) : null}
                      </View>
                      <Text style={styles.filaTexto}>
                        {item.texto}
                        {item.detalle ? (
                          <Text style={styles.filaDetalle}> · {item.detalle}</Text>
                        ) : null}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })
        )}

        {preview && preview.vacunas.length > 0 ? (
          <Text style={styles.ayuda}>
            También trae{' '}
            {preview.vacunas.length === 1 ? 'una vacuna' : `${preview.vacunas.length} vacunas`}:{' '}
            {preview.vacunas.map((v) => v.vacuna).join(', ')}. El MediPass no guarda vacunas.
          </Text>
        ) : null}

        <Button
          label={elegidos.size === 1 ? 'Agregar 1 dato' : `Agregar ${elegidos.size} datos`}
          onPress={agregar}
          disabled={elegidos.size === 0}
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
  titulo: { fontFamily: fonts.semibold, fontSize: fontSize.md, color: colors.brandDeep },
  ayuda: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warm,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  avisoTexto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.warmInk,
  },
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
  filaTexto: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: fontSize.md,
    lineHeight: 21,
    color: colors.ink,
  },
  filaDetalle: { fontFamily: fonts.regular, color: colors.muted },
});
