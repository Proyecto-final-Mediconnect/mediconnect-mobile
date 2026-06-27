import { Text } from 'react-native';

interface GreetingProps {
  /** Nombre a saludar. */
  name: string;
}

// Componente de ejemplo en shared/ui. Componentes en PascalCase.tsx (§3.4.3).
export function Greeting({ name }: GreetingProps): React.JSX.Element {
  return <Text>Hola, {name}</Text>;
}
