import { useNavigation } from '@react-navigation/native';
import { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, type TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMyProfile, useSaveProfile } from '../features/patient-profile/hooks/use-my-profile';
import {
  maskBirthDate,
  toPersonalForm,
  toProfileInput,
  type PersonalDataErrors,
  type PersonalDataForm,
} from '../features/patient-profile/personal-data';
import type { PatientProfile } from '../features/patient-profile/types';
import { useKeyboardHeight } from '../shared/hooks/use-keyboard-height';
import { ApiError } from '../shared/lib/api-client';
import { Button } from '../shared/ui/Button';
import { Notice } from '../shared/ui/Notice';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { ErrorState, LoadingState } from '../shared/ui/StatusViews';
import { TextField } from '../shared/ui/TextField';
import { colors, fonts, fontSize, spacing } from '../shared/ui/theme';

/**
 * Mis datos personales (ENG-236): nombre, apellido, fecha de nacimiento, DNI y
 * teléfono, los mismos que el perfil de la web y con las mismas reglas, contra
 * `PUT /patients/me`. La primera vez completa la ficha, que es lo que pide el
 * backend para reservar un turno o usar el MediPass.
 */
export function PersonalDataScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const perfil = useMyProfile();
  const titulo = perfil.data?.completed === false ? 'Completar mis datos' : 'Mis datos personales';
  const header = <ScreenHeader title={titulo} onBack={() => navigation.goBack()} />;

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

  return (
    <Screen scroll={false} padded={false} header={header}>
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
  const guardar = useSaveProfile();
  const insets = useSafeAreaInsets();
  const { margen: margenTeclado, onLayout } = useKeyboardHeight();
  const [form, setForm] = useState<PersonalDataForm>(() => toPersonalForm(perfil));
  const [original] = useState(() => JSON.stringify(toPersonalForm(perfil)));
  const [errores, setErrores] = useState<PersonalDataErrors>({});
  const apellidoRef = useRef<TextInputInstance>(null);
  const fechaRef = useRef<TextInputInstance>(null);
  const dniRef = useRef<TextInputInstance>(null);
  const telefonoRef = useRef<TextInputInstance>(null);
  const sucio = JSON.stringify(form) !== original;

  // "Ese DNI ya está registrado." va debajo del DNI, que es lo que hay que cambiar.
  const dniRepetido = guardar.error instanceof ApiError && guardar.error.status === 409;

  function cambiar(campo: keyof PersonalDataForm, valor: string): void {
    setForm((f) => ({ ...f, [campo]: valor }));
    // Al corregir el DNI repetido, el aviso ya no corresponde.
    if (campo === 'dni' && dniRepetido) guardar.reset();
  }

  function enviar(): void {
    if (guardar.isPending) return;
    const { input, errors } = toProfileInput(form);
    setErrores(errors);
    if (!input) return;
    guardar.mutate(input, { onSuccess: onGuardado });
  }

  return (
    // Como en el ingreso: el formulario sube a la par del teclado (iOS y Android).
    <Animated.View onLayout={onLayout} style={[styles.fill, { paddingBottom: margenTeclado }]}>
      <ScrollView
        style={styles.fill}
        contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          {perfil.completed
            ? 'Son los datos con los que te atienden los profesionales.'
            : 'Los necesitamos para que puedas sacar turnos y usar tu MediPass. Los ven solo los profesionales que te atienden.'}
        </Text>

        <TextField
          label="Nombre"
          value={form.firstName}
          onChangeText={(v) => cambiar('firstName', v)}
          error={errores.firstName}
          placeholder="Ana"
          maxLength={80}
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => apellidoRef.current?.focus()}
        />
        <TextField
          ref={apellidoRef}
          label="Apellido"
          value={form.lastName}
          onChangeText={(v) => cambiar('lastName', v)}
          error={errores.lastName}
          placeholder="García"
          maxLength={80}
          autoComplete="family-name"
          textContentType="familyName"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => fechaRef.current?.focus()}
        />
        <TextField
          ref={fechaRef}
          label="Fecha de nacimiento"
          value={form.birthDate}
          onChangeText={(v) => cambiar('birthDate', maskBirthDate(v))}
          error={errores.birthDate}
          placeholder="DD/MM/AAAA"
          keyboardType="number-pad"
          maxLength={10}
          autoComplete="birthdate-full"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => dniRef.current?.focus()}
        />
        <TextField
          ref={dniRef}
          label="DNI"
          value={form.dni}
          onChangeText={(v) => cambiar('dni', v)}
          error={errores.dni ?? (dniRepetido ? guardar.error?.message : undefined)}
          placeholder="12345678"
          keyboardType="number-pad"
          maxLength={10}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => telefonoRef.current?.focus()}
        />
        <TextField
          ref={telefonoRef}
          label="Teléfono"
          value={form.phone}
          onChangeText={(v) => cambiar('phone', v)}
          error={errores.phone}
          placeholder="+54 11 5555-5555"
          keyboardType="phone-pad"
          maxLength={20}
          autoComplete="tel"
          textContentType="telephoneNumber"
          returnKeyType="done"
        />

        {guardar.isError && !dniRepetido ? (
          <Notice icon="alert-circle-outline" message={guardar.error.message} />
        ) : null}

        {/* Sin cambios no hay nada que guardar: un botón activo diría lo contrario. */}
        <Button
          label={guardar.isPending ? 'Guardando…' : 'Guardar mis datos'}
          onPress={enviar}
          loading={guardar.isPending}
          disabled={!sucio}
          fullWidth
        />
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  contenido: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  intro: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
});
