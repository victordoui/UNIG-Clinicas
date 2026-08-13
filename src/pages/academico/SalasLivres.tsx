import { DoorOpen } from 'lucide-react'; import AcademicFlowPage from './AcademicFlowPage';
export default function SalasLivres() { return <AcademicFlowPage title="Salas Livres" icon={DoorOpen} description="Consulte salas disponíveis pela grade e pelas reservas registradas." dependsOn="Aulas alocadas, reservas e bloqueios" next={{ label: 'Ver salas', to: '/espacos/salas' }} />; }
