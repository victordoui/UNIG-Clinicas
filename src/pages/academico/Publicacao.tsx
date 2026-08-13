import { Send } from 'lucide-react'; import AcademicFlowPage from './AcademicFlowPage';
export default function Publicacao() { return <AcademicFlowPage title="Publicação" icon={Send} description="Publique uma versão validada da grade para alunos e professores." dependsOn="Validação e permissões acadêmicas" next={{ label: 'Ver análise', to: '/academico/analise-ensalamento' }} />; }
