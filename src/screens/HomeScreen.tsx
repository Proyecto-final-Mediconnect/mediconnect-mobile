import { StyleSheet, Text, View } from 'react-native';

// Pantalla de ejemplo. Convención: una pantalla por ruta y archivos delgados
// (Sprint 0 §3.4.6). Los strings de UI van en español (§3.4.3).
export function HomeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>MediConnect</Text>
      <Text style={styles.subtitle}>App mobile inicializada</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginTop: 8,
  },
});
