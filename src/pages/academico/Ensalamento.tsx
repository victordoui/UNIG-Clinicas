import { MapPin } from 'lucide-react'; import AcademicFlowPage from './AcademicFlowPage';
export default function Ensalamento() { return <AcademicFlowPage title="Ensalamento" icon={MapPin} description="Associe cada aula a uma sala compatível, sem colisões de horário." dependsOn="Grade, aulas, salas e bloqueios" next={{ label: 'Ver mapa de salas', to: '/espacos/mapa' }} />; }
