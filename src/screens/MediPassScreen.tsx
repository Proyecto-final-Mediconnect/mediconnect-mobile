import { EmptyState } from '../shared/ui/StatusViews';
import { Screen, ScreenHeader } from '../shared/ui/Screen';

// Tab del MediPass, sobre el azul noche del canvas. El código QR y el acceso
// temporal los trae ENG-117.
export function MediPassScreen(): React.JSX.Element {
  return (
    <Screen tone="dark" scroll={false} header={<ScreenHeader tone="dark" title="Mi MediPass" />}>
      <EmptyState
        tone="dark"
        icon="qr-code-outline"
        title="Tu MediPass va a aparecer acá"
        description="Un código QR para que un profesional pueda ver tu información esencial en una emergencia."
      />
    </Screen>
  );
}
