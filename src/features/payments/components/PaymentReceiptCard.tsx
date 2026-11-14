import { StyleSheet, Text, View } from 'react-native';

import { formatPrice } from '../../appointments/lib/appointments';
import { cuando } from '../../appointments/lib/timeline';
import { Chip } from '../../../shared/ui/Chip';
import { colors, fonts, fontSize, radius, spacing } from '../../../shared/ui/theme';
import { paymentMethodLabel } from '../lib/receipt';
import type { PaymentReceipt } from '../types';

/**
 * El comprobante del pago (ENG-199): importe, medio, cuándo se acreditó y el
 * número de operación de MercadoPago, seleccionable para copiarlo en un
 * reclamo. Lo usan la confirmación del pago y el detalle del turno.
 */
export function PaymentReceiptCard({
  receipt,
  confirmedAt,
  titulo = 'COMPROBANTE',
}: {
  receipt: PaymentReceipt;
  confirmedAt: string | null | undefined;
  titulo?: string;
}): React.JSX.Element {
  const fecha = cuando(confirmedAt);

  return (
    <View accessibilityLabel="Comprobante del pago" style={styles.card}>
      <View style={styles.cabecera}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Chip label="Acreditado" tone="ok" />
      </View>
      <Fila rotulo="Importe">
        <Text style={styles.monto}>{formatPrice(receipt.amount)}</Text>
      </Fila>
      <Fila rotulo="Medio">
        <Text style={styles.valor}>{paymentMethodLabel(receipt.method)}</Text>
      </Fila>
      {fecha ? (
        <Fila rotulo="Fecha">
          <Text style={styles.valor}>{fecha}</Text>
        </Fila>
      ) : null}
      {receipt.operationId ? (
        <Fila rotulo="Operación">
          <Text selectable style={styles.valor}>
            N.º {receipt.operationId}
          </Text>
        </Fila>
      ) : null}
    </View>
  );
}

function Fila({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <View style={styles.fila}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View style={styles.valorCaja}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.lineSoft,
  },
  titulo: {
    fontFamily: fonts.bold,
    fontSize: fontSize.xs,
    letterSpacing: 1,
    color: colors.mutedSoft,
  },
  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rotulo: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.muted },
  valorCaja: { flexShrink: 1, alignItems: 'flex-end' },
  valor: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.sm,
    color: colors.ink,
    textAlign: 'right',
  },
  monto: { fontFamily: fonts.bold, fontSize: fontSize.md, color: colors.brandDeep },
});
