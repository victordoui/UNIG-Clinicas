import { useParams } from 'react-router-dom';
import EsteiraDetalhe from './esteira/EsteiraDetalhe';

export default function PedidoDetalhe() {
  const { id } = useParams<{ id: string }>();
  return <EsteiraDetalhe orderId={id} />;
}
