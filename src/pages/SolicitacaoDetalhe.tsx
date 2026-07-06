import { useParams } from 'react-router-dom';
import EsteiraDetalhe from './esteira/EsteiraDetalhe';

export default function SolicitacaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  return <EsteiraDetalhe requestId={id} />;
}
