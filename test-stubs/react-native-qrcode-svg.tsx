import { Text } from 'react-native';

/*
 * Stub de `react-native-qrcode-svg` para Vitest: dibuja con `react-native-svg`,
 * que es código nativo. En los tests importa qué valor lleva el QR, no sus
 * cuadraditos, así que se renderiza el valor como texto oculto.
 */
export default function QRCode({ value }: { value: string }): React.JSX.Element {
  return <Text testID="qr-value">{value}</Text>;
}
