import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMyProfile, useSaveVitalInfo } from '../features/patient-profile/hooks/use-my-profile';
import { BLOOD_TYPES, SEXES, type PatientProfile } from '../features/patient-profile/types';
import {
  EMPTY_ALLERGY,
  EMPTY_CONDITION,
  EMPTY_MEDICATION,
  MAX_ROWS,
  toForm,
  toInput,
  type VitalForm,
} from '../features/patient-profile/vital-info';
import { Button } from '../shared/ui/Button';
import { FilterChip } from '../shared/ui/FilterChip';
import { Notice } from '../shared/ui/Notice';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { TextField } from '../shared/ui/TextField';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/**
 * Datos de emergencia (ENG-136): lo que ve un médico que no te conoce cuando
 * escanea tu MediPass. Mismo formulario y mismas reglas que en la web
 * (`vital-info.ts`), con `PUT /patients/me/vital`, que reemplaza el bloque
 * entero: quitar una fila y guardar es como se saca una alergia.
 */
export function EmergencyDataScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const perfil = useMyProfile();
  const header = <ScreenHeader title="Datos de emergencia" onBack={() => navigation.goBack()} />;

  if (perfil.isPending) {
    return (
      <Screen scroll={false} header={header}>
        <LoadingState label="Cargando tus datos…" />
      </Screen>
    );
  }
  if (perfil.isError) {
    return (
      <Screen scroll={false} header={header}>
        <ErrorState message={perfil.error.message} onRetry={() => void perfil.refetch()} />
      </Screen>
    );
  }

  // Con el perfil ya cargado: el formulario arranca precargado.
  return (
    <Screen header={header}>
      <Formulario perfil={perfil.data} onGuardado={() => navigation.goBack()} />
    </Screen>
  );
}

function Formulario({
  perfil,
  onGuardado,
}: {
  perfil: PatientProfile;
  onGuardado: () => void;
}): React.JSX.Element {
  const guardar = useSaveVitalInfo();
  const [form, setForm] = useState<VitalForm>(() => toForm(perfil));
  const [original] = useState(() => JSON.stringify(toForm(perfil)));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const sucio = JSON.stringify(form) !== original;

  function enviar(): void {
    const { input, errors } = toInput(form);
    setErrores(errors);
    if (Object.keys(errors).length > 0) return;
    guardar.mutate(input, { onSuccess: onGuardado });
  }

  return (
    <View style={styles.cuerpo}>
      <Text style={styles.intro}>
        Es lo que ve un médico que no te conoce cuando escanea tu MediPass. Cargá lo que te puede
        salvar la vida.
      </Text>

      <Bloque titulo="Grupo sanguíneo">
        <View style={styles.chips}>
          {['', ...BLOOD_TYPES].map((grupo) => (
            <FilterChip
              key={grupo || 'no-se'}
              label={grupo || 'No sé'}
              selected={form.bloodType === grupo}
              onPress={() => setForm({ ...form, bloodType: grupo })}
            />
          ))}
        </View>
      </Bloque>

      <Bloque titulo="Sexo">
        <View style={styles.chips}>
          {['', ...SEXES].map((sexo) => (
            <FilterChip
              key={sexo || 'sin-indicar'}
              label={sexo || 'Sin indicar'}
              selected={form.sex === sexo}
              onPress={() => setForm({ ...form, sex: sexo })}
            />
          ))}
        </View>
      </Bloque>

      <Lista
        titulo="Alergias"
        detalle="A remedios, alimentos o lo que sea."
        agregar="Agregar alergia"
        cantidad={form.allergies.length}
        onAgregar={() => setForm({ ...form, allergies: [...form.allergies, { ...EMPTY_ALLERGY }] })}
      >
        {form.allergies.map((a, i) => (
          <Fila
            key={i}
            etiqueta={`la alergia ${i + 1}`}
            onQuitar={() =>
              setForm({ ...form, allergies: form.allergies.filter((_, j) => j !== i) })
            }
          >
            <TextField
              label="A qué"
              value={a.que}
              placeholder="Penicilina"
              maxLength={120}
              error={errores[`allergies.${i}.que`]}
              onChangeText={(que) =>
                setForm({
                  ...form,
                  allergies: form.allergies.map((x, j) => (j === i ? { ...x, que } : x)),
                })
              }
            />
            <TextField
              label="Qué te pasa"
              value={a.gravedad}
              placeholder="Anafilaxia"
              maxLength={60}
              onChangeText={(gravedad) =>
                setForm({
                  ...form,
                  allergies: form.allergies.map((x, j) => (j === i ? { ...x, gravedad } : x)),
                })
              }
            />
          </Fila>
        ))}
      </Lista>

      <Lista
        titulo="Medicación que tomás"
        detalle="Lo que tomás todos los días, con la dosis si la sabés."
        agregar="Agregar remedio"
        cantidad={form.medications.length}
        onAgregar={() =>
          setForm({ ...form, medications: [...form.medications, { ...EMPTY_MEDICATION }] })
        }
      >
        {form.medications.map((m, i) => (
          <Fila
            key={i}
            etiqueta={`el remedio ${i + 1}`}
            onQuitar={() =>
              setForm({ ...form, medications: form.medications.filter((_, j) => j !== i) })
            }
          >
            <TextField
              label="Remedio"
              value={m.droga}
              placeholder="Enalapril 10 mg"
              maxLength={120}
              error={errores[`medications.${i}.droga`]}
              onChangeText={(droga) =>
                setForm({
                  ...form,
                  medications: form.medications.map((x, j) => (j === i ? { ...x, droga } : x)),
                })
              }
            />
            <TextField
              label="Dosis"
              value={m.dosis}
              placeholder="Una vez por día"
              maxLength={60}
              onChangeText={(dosis) =>
                setForm({
                  ...form,
                  medications: form.medications.map((x, j) => (j === i ? { ...x, dosis } : x)),
                })
              }
            />
          </Fila>
        ))}
      </Lista>

      <Lista
        titulo="Condiciones"
        detalle="Hipertensión, diabetes, asma, marcapasos…"
        agregar="Agregar condición"
        cantidad={form.conditions.length}
        onAgregar={() =>
          setForm({ ...form, conditions: [...form.conditions, { ...EMPTY_CONDITION }] })
        }
      >
        {form.conditions.map((c, i) => (
          <Fila
            key={i}
            etiqueta={`la condición ${i + 1}`}
            onQuitar={() =>
              setForm({ ...form, conditions: form.conditions.filter((_, j) => j !== i) })
            }
          >
            <TextField
              label="Condición"
              value={c.nombre}
              placeholder="Hipertensión arterial"
              maxLength={120}
              error={errores[`conditions.${i}.nombre`]}
              onChangeText={(nombre) =>
                setForm({
                  ...form,
                  conditions: form.conditions.map((x, j) => (j === i ? { ...x, nombre } : x)),
                })
              }
            />
          </Fila>
        ))}
      </Lista>

      <Bloque titulo="Contacto de emergencia" detalle="A quién llamar si no podés hablar.">
        <View style={styles.caja}>
          <TextField
            label="Nombre"
            value={form.contact.nombre}
            placeholder="Marina Sosa"
            maxLength={120}
            error={errores['contact.nombre']}
            onChangeText={(nombre) => setForm({ ...form, contact: { ...form.contact, nombre } })}
          />
          <TextField
            label="Vínculo"
            value={form.contact.vinculo}
            placeholder="Hermana"
            maxLength={40}
            onChangeText={(vinculo) => setForm({ ...form, contact: { ...form.contact, vinculo } })}
          />
          <TextField
            label="Teléfono"
            value={form.contact.telefono}
            placeholder="+54 351 555 2210"
            keyboardType="phone-pad"
            maxLength={20}
            error={errores['contact.telefono']}
            onChangeText={(telefono) =>
              setForm({ ...form, contact: { ...form.contact, telefono } })
            }
          />
        </View>
      </Bloque>

      {guardar.isError ? (
        <Notice icon="alert-circle-outline" message={guardar.error.message} />
      ) : null}

      <Button
        label="Guardar datos de emergencia"
        onPress={enviar}
        loading={guardar.isPending}
        disabled={!sucio}
        fullWidth
      />
    </View>
  );
}

function Bloque({
  titulo,
  detalle,
  children,
}: {
  titulo: string;
  detalle?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.bloque}>
      <Text style={styles.bloqueTitulo}>{titulo.toUpperCase()}</Text>
      {detalle ? <Text style={styles.bloqueDetalle}>{detalle}</Text> : null}
      {children}
    </View>
  );
}

function Lista({
  titulo,
  detalle,
  agregar,
  cantidad,
  onAgregar,
  children,
}: {
  titulo: string;
  detalle: string;
  agregar: string;
  cantidad: number;
  onAgregar: () => void;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Bloque titulo={titulo} detalle={detalle}>
      {cantidad > 0 ? <View style={styles.filas}>{children}</View> : null}
      {cantidad < MAX_ROWS ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={agregar}
          onPress={onAgregar}
          style={({ pressed }) => [styles.agregar, pressed && styles.agregarPresionado]}
        >
          <Ionicons name="add" size={18} color={colors.brandDeep} />
          <Text style={styles.agregarTexto}>{agregar}</Text>
        </Pressable>
      ) : null}
    </Bloque>
  );
}

function Fila({
  etiqueta,
  onQuitar,
  children,
}: {
  etiqueta: string;
  onQuitar: () => void;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.caja}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Quitar ${etiqueta}`}
        hitSlop={spacing.sm}
        onPress={onQuitar}
        style={styles.quitar}
      >
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cuerpo: { gap: spacing.xl, paddingBottom: spacing.xl },
  intro: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: colors.muted,
  },
  bloque: { gap: spacing.sm },
  bloqueTitulo: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.muted,
  },
  bloqueDetalle: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    color: colors.mutedSoft,
    marginTop: -2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  filas: { gap: spacing.sm },
  caja: {
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  quitar: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    padding: 4,
  },
  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  agregarPresionado: { backgroundColor: colors.surfaceTeal, borderColor: colors.brand },
  agregarTexto: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandDeep },
});
