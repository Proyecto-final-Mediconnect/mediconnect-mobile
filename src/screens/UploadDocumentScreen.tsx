import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useUploadDocument } from '../features/patient-documents/hooks/use-patient-documents';
import {
  formatSize,
  isPdf,
  MAX_TEXTO,
  validateUploadForm,
  type UploadFormErrors,
} from '../features/patient-documents/lib/document-file';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
  type PatientDocumentType,
} from '../features/patient-documents/types';
import type { RootStackParamList } from '../navigation/types';
import { useKeyboardHeight } from '../shared/hooks/use-keyboard-height';
import { Button } from '../shared/ui/Button';
import { FilterChip } from '../shared/ui/FilterChip';
import { Screen, ScreenHeader } from '../shared/ui/Screen';
import { TextField } from '../shared/ui/TextField';
import { colors, fonts, fontSize, radius, spacing } from '../shared/ui/theme';

/** El nombre del PDF suele decir qué es ("Hemograma marzo"): se propone como título. */
function tituloSugerido(nombre: string, pdf: boolean): string {
  if (!pdf) return '';
  return nombre
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, MAX_TEXTO);
}

/**
 * El segundo paso de "Subir documento" (ENG-164): qué es el archivo que eligió.
 *
 * El archivo ya pasó la validación de tipo y tamaño al elegirlo; acá se valida
 * el resto antes de mandar, y lo que diga el backend (un 409 si no completó la
 * ficha, la firma del archivo) se muestra tal cual, que ya viene en castellano.
 */
export function UploadDocumentScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const { file } = useRoute<RouteProp<RootStackParamList, 'SubirDocumento'>>().params;
  const subir = useUploadDocument();
  const pdf = isPdf(file.mimeType);
  const { margen: margenTeclado } = useKeyboardHeight();

  const [tipo, setTipo] = useState<PatientDocumentType>('ESTUDIO');
  const [titulo, setTitulo] = useState(() => tituloSugerido(file.name, pdf));
  const [fecha, setFecha] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [errores, setErrores] = useState<UploadFormErrors>({});

  function enviar(): void {
    if (subir.isPending) return;
    const form = { title: titulo, documentDate: fecha, sourceInstitution: institucion };
    const encontrados = validateUploadForm(form);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    subir.mutate(
      { file, type: tipo, ...form },
      // La lista ya se invalidó: al volver aparece el documento nuevo arriba.
      { onSuccess: () => navigation.goBack() },
    );
  }

  return (
    <Screen
      scroll={false}
      padded={false}
      header={<ScreenHeader title="Subir documento" onBack={() => navigation.goBack()} />}
    >
      {/* Como en el ingreso: en iOS el formulario sube a la par del teclado. */}
      <Animated.View
        style={[styles.fill, Platform.OS === 'ios' && { paddingBottom: margenTeclado }]}
      >
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.archivo}>
            {pdf ? (
              <View style={[styles.miniatura, styles.miniaturaPdf]}>
                <Ionicons name="document-text-outline" size={26} color={colors.tagEstudioInk} />
              </View>
            ) : (
              <Image
                source={{ uri: file.uri }}
                style={styles.miniatura}
                accessibilityLabel="Vista previa de la foto"
              />
            )}
            <View style={styles.archivoTextos}>
              <Text style={styles.archivoNombre} numberOfLines={1}>
                {file.name}
              </Text>
              <Text style={styles.archivoDetalle}>
                {pdf ? 'PDF' : 'Imagen'}
                {file.sizeBytes !== null ? ` · ${formatSize(file.sizeBytes)}` : ''}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cambiar archivo"
              hitSlop={spacing.sm}
              disabled={subir.isPending}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cambiar}>Cambiar</Text>
            </Pressable>
          </View>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Tipo de documento</Text>
            <View style={styles.tipos}>
              {DOCUMENT_TYPES.map((t) => (
                <FilterChip
                  key={t}
                  label={DOCUMENT_TYPE_LABELS[t]}
                  selected={tipo === t}
                  onPress={() => setTipo(t)}
                />
              ))}
            </View>
          </View>

          <TextField
            label="Nombre"
            placeholder="Ej.: Análisis de sangre"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={MAX_TEXTO}
            error={errores.title}
            returnKeyType="next"
          />
          <TextField
            label="Fecha del documento (opcional)"
            placeholder="AAAA-MM-DD"
            value={fecha}
            onChangeText={setFecha}
            maxLength={10}
            keyboardType="numbers-and-punctuation"
            error={errores.documentDate}
          />
          <TextField
            label="Institución (opcional)"
            placeholder="Ej.: Hospital Italiano"
            value={institucion}
            onChangeText={setInstitucion}
            maxLength={MAX_TEXTO}
            error={errores.sourceInstitution}
          />

          <Text style={styles.aclaracion}>
            Lo van a ver los profesionales que te atiendan, marcado como aportado por vos.
          </Text>

          {subir.isError ? (
            <View accessibilityRole="alert" style={styles.error}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <Text style={styles.errorTexto}>{subir.error.message}</Text>
            </View>
          ) : null}

          <Button
            label={subir.isPending ? 'Subiendo…' : 'Subir'}
            disabled={subir.isPending}
            onPress={enviar}
            fullWidth
          />
        </ScrollView>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  contenido: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  archivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  miniatura: {
    width: 56,
    height: 56,
    borderRadius: radius.field,
    backgroundColor: colors.lineSoft,
  },
  miniaturaPdf: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tagEstudio,
  },
  archivoTextos: { flex: 1, gap: 2 },
  archivoNombre: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  archivoDetalle: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  cambiar: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandHover },
  campo: { gap: spacing.sm },
  rotulo: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandDeep },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  aclaracion: {
    fontFamily: fonts.medium,
    fontSize: fontSize.xs,
    lineHeight: 17,
    color: colors.muted,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorTexto: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    lineHeight: 18,
    color: colors.danger,
  },
});
