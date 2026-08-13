import { History } from 'lucide-react'; import AcademicFlowPage from './AcademicFlowPage';
export default function Historico() { return <AcademicFlowPage title="Histórico Acadêmico" icon={History} description="Consulte versões publicadas e arquivadas da grade acadêmica." dependsOn="Snapshots de publicação" next={{ label: 'Voltar às grades', to: '/academico/aulas' }} />; }
