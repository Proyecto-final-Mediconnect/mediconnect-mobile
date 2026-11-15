import { useNavigation } from '@react-navigation/native';

import { EmergencyCardSection } from '../features/medipass/components/EmergencyCardSection';
import { useVitalBlock } from '../features/medipass/hooks/use-medipass';
import { Screen, ScreenHeader } from '../shared/ui/Screen';

/** La tarjeta de emergencia del MediPass (ENG-176). Se abre desde el MediPass. */
export function EmergencyCardScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const vital = useVitalBlock();

  return (
    <Screen
      tone="dark"
      header={
        <ScreenHeader
          tone="dark"
          title="Tarjeta de emergencia"
          onBack={() => navigation.goBack()}
        />
      }
    >
      <EmergencyCardSection nombre={vital.data?.nombre ?? ''} />
    </Screen>
  );
}
