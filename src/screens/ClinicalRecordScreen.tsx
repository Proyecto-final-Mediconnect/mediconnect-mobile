import { useNavigation } from '@react-navigation/native';

import { EmptyState } from '../shared/ui/StatusViews';
import { Screen, ScreenHeader } from '../shared/ui/Screen';

// Historia clínica. No es una tab: se abre desde su tarjeta en el inicio y tapa
// la barra, como una pantalla de detalle. El contenido real lo trae ENG-116.
export function ClinicalRecordScreen(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <Screen
      scroll={false}
      header={<ScreenHeader title="Mi historia clínica" onBack={() => navigation.goBack()} />}
    >
      <EmptyState
        icon="document-text-outline"
        title="Tu historia clínica va a aparecer acá"
        description="Vas a poder leer cada entrada que firmen tus profesionales, de la más reciente a la más vieja."
      />
    </Screen>
  );
}
