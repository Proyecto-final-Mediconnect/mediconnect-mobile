import { EmptyState } from '../shared/ui/StatusViews';
import { Screen, ScreenHeader } from '../shared/ui/Screen';

// Tab de turnos. El contenido real —el selector Próximos / Pasados y las
// tarjetas con su estado, como en el canvas— lo trae ENG-115.
export function AppointmentsScreen(): React.JSX.Element {
  return (
    <Screen scroll={false} header={<ScreenHeader title="Mis turnos" />}>
      <EmptyState
        icon="calendar-outline"
        title="Tus turnos van a aparecer acá"
        description="Vas a ver los próximos y los que ya pasaron, con el profesional y el horario de cada uno."
      />
    </Screen>
  );
}
