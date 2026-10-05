import { EmptyState } from '../shared/ui/StatusViews';
import { Screen, ScreenHeader } from '../shared/ui/Screen';

// Tab de perfil. El canvas la nombra en la barra pero no la dibuja. Es donde
// ENG-114 pone "Cerrar sesión".
export function ProfileScreen(): React.JSX.Element {
  return (
    <Screen scroll={false} header={<ScreenHeader title="Mi perfil" />}>
      <EmptyState
        icon="person-outline"
        title="Tus datos van a aparecer acá"
        description="Vas a poder ver tu información y cerrar sesión desde esta pantalla."
      />
    </Screen>
  );
}
