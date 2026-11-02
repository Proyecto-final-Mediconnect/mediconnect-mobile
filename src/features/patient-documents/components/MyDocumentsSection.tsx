import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '../../../shared/ui/Chip';
import { ConfirmSheet } from '../../../shared/ui/ConfirmSheet';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { useMyDocuments, useOpenDocument, useRetireDocument } from '../hooks/use-patient-documents';
import { documentSummary, formatSize, isPdf } from '../lib/document-file';
import type { PatientDocument } from '../types';

/** Cuántos se ven antes de "Ver todos": que no empujen la historia muy abajo. */
const VISIBLES = 3;

/**
 * Mis documentos (ENG-164), arriba de la historia clínica: la misma tarjeta que
 * la web. Una fila por documento, con "Ver" y "Retirar" como íconos, y el botón
 * de subir en la propia tarjeta para no cargar el encabezado de la pantalla,
 * que ya tiene la búsqueda y los filtros de la historia.
 *
 * Va aparte de las entradas y con la marca "no validado": los sube el paciente
 * y no los firmó nadie.
 */
export function MyDocumentsSection({ onUpload }: { onUpload: () => void }): React.JSX.Element {
  const documentos = useMyDocuments();
  const retirar = useRetireDocument();
  const abrir = useOpenDocument();
  const [aRetirar, setARetirar] = useState<PatientDocument | null>(null);
  const [todos, setTodos] = useState(false);

  const lista = documentos.data ?? [];
  const visibles = todos ? lista : lista.slice(0, VISIBLES);

  return (
    <View style={styles.card}>
      <View style={styles.cabecera}>
        <View style={styles.cabeceraTextos}>
          <Text accessibilityRole="header" style={styles.titulo}>
            Mis documentos
          </Text>
          <Chip label="Aportado por vos · no validado" tone="warning" />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Subir documento"
          hitSlop={spacing.xs}
          onPress={onUpload}
          style={({ pressed }) => [styles.subir, pressed && styles.presionado]}
        >
          <Ionicons name="add" size={16} color={colors.white} />
          <Text style={styles.subirTexto}>Subir</Text>
        </Pressable>
      </View>

      {documentos.isPending ? (
        <Text style={[styles.nota, styles.cuerpo]}>Cargando tus documentos…</Text>
      ) : documentos.isError ? (
        <View style={[styles.filaError, styles.cuerpo]}>
          <Text style={styles.error}>{documentos.error.message}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Probá de nuevo"
            hitSlop={spacing.sm}
            onPress={() => void documentos.refetch()}
          >
            <Text style={styles.link}>Probá de nuevo</Text>
          </Pressable>
        </View>
      ) : lista.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Subir el primero"
          onPress={onUpload}
          style={({ pressed }) => [styles.vacio, pressed && styles.presionado]}
        >
          <Text style={styles.vacioTitulo}>+ Subir el primero</Text>
          <Text style={styles.nota}>
            Análisis, informes o recetas de otro lugar. Los ven tus profesionales, pero no forman
            parte de la historia firmada.
          </Text>
        </Pressable>
      ) : (
        <View>
          {visibles.map((doc) => {
            const pdf = isPdf(doc.mimeType);
            const abriendo = abrir.isPending && abrir.variables === doc.id;
            return (
              <View key={doc.id} style={styles.fila}>
                <View style={styles.filaCuerpo}>
                  <View style={[styles.icono, pdf ? styles.iconoPdf : styles.iconoImagen]}>
                    <Ionicons
                      name={pdf ? 'document-text-outline' : 'image-outline'}
                      size={18}
                      color={pdf ? colors.tagEstudioInk : colors.brandHover}
                    />
                  </View>
                  <View style={styles.textos}>
                    <Text style={styles.docTitulo} numberOfLines={1}>
                      {doc.title}
                    </Text>
                    <Text style={styles.docMeta} numberOfLines={1}>
                      {documentSummary(doc)}
                    </Text>
                    <Text style={styles.docArchivo}>
                      {pdf ? 'PDF' : 'Imagen'} · {formatSize(doc.sizeBytes)}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ${doc.title}`}
                    aria-busy={abriendo}
                    disabled={abriendo}
                    hitSlop={spacing.xs}
                    onPress={() => abrir.mutate(doc.id)}
                    style={({ pressed }) => [styles.accion, pressed && styles.presionado]}
                  >
                    {abriendo ? (
                      <ActivityIndicator size="small" color={colors.brandHover} />
                    ) : (
                      <Ionicons name="eye-outline" size={18} color={colors.brandHover} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Retirar ${doc.title}`}
                    hitSlop={spacing.xs}
                    onPress={() => {
                      retirar.reset();
                      setARetirar(doc);
                    }}
                    style={({ pressed }) => [styles.accion, pressed && styles.presionado]}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.mutedSoft} />
                  </Pressable>
                </View>
                {abrir.isError && abrir.variables === doc.id ? (
                  <Text accessibilityRole="alert" style={styles.error}>
                    {abrir.error.message}
                  </Text>
                ) : null}
              </View>
            );
          })}
          {lista.length > VISIBLES ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setTodos((v) => !v)}
              style={styles.verTodos}
            >
              <Text style={styles.link}>{todos ? 'Ver menos' : 'Ver todos'}</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      <ConfirmSheet
        visible={aRetirar !== null}
        title="¿Retirar este documento?"
        message={`Deja de verse, pero queda registrado. Los profesionales ya no van a ver "${aRetirar?.title ?? ''}".`}
        confirmLabel="Sí, retirarlo"
        dismissLabel="Dejarlo visible"
        pending={retirar.isPending}
        error={retirar.error?.message}
        onDismiss={() => setARetirar(null)}
        onConfirm={() =>
          aRetirar && retirar.mutate(aRetirar.id, { onSuccess: () => setARetirar(null) })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  cabeceraTextos: { flex: 1, gap: spacing.xs, alignItems: 'flex-start' },
  titulo: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
  subir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brandDeep,
    borderRadius: 999,
    paddingVertical: 7,
    paddingLeft: 10,
    paddingRight: 14,
  },
  subirTexto: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.white },
  cuerpo: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  nota: { fontFamily: fonts.medium, fontSize: fontSize.sm, lineHeight: 19, color: colors.muted },
  filaError: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  error: {
    fontFamily: fonts.medium,
    fontSize: fontSize.sm,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  link: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandHover },
  vacio: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  vacioTitulo: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandHover },
  fila: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  filaCuerpo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icono: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoPdf: { backgroundColor: colors.tagEstudio },
  iconoImagen: { backgroundColor: colors.surfaceTeal },
  textos: { flex: 1, gap: 1 },
  docTitulo: { fontFamily: fonts.bold, fontSize: fontSize.sm, color: colors.brandDeep },
  docMeta: { fontFamily: fonts.medium, fontSize: fontSize.xs, color: colors.muted },
  docArchivo: { fontFamily: fonts.medium, fontSize: 11, color: colors.mutedSoft },
  accion: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  verTodos: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  presionado: { opacity: 0.6 },
});
