import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Acessorio, AcessorioMovimentacao } from '../../types/acessorio';
import { getMovimentacoes } from '../../services/acessoriosService';
import { ArrowUpCircle, ArrowDownCircle, Settings, Clock } from 'lucide-react';

interface MovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  acessorio: Acessorio;
  tipo: 'entrada' | 'saida' | 'historico';
  onConfirm?: (quantidade: number, motivo: string) => Promise<void>;
}

export function MovimentacaoModal({
  isOpen,
  onClose,
  acessorio,
  tipo,
  onConfirm,
}: MovimentacaoModalProps) {
  const [quantidade, setQuantidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<AcessorioMovimentacao[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    if (isOpen && tipo === 'historico') {
      loadMovimentacoes();
    }
  }, [isOpen, tipo, acessorio.id]);

  const loadMovimentacoes = async () => {
    setLoadingHistorico(true);
    const data = await getMovimentacoes(acessorio.id);
    setMovimentacoes(data);
    setLoadingHistorico(false);
  };

  const handleConfirm = async () => {
    if (!quantidade || !onConfirm) return;

    setIsLoading(true);
    try {
      await onConfirm(parseInt(quantidade), motivo);
      setQuantidade('');
      setMotivo('');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const getTitulo = () => {
    if (tipo === 'entrada') return `Entrada de Estoque - ${acessorio.nome}`;
    if (tipo === 'saida') return `Saida de Estoque - ${acessorio.nome}`;
    return `Historico - ${acessorio.nome}`;
  };

  const getIcon = (tipoMov: string) => {
    if (tipoMov === 'entrada') return <ArrowUpCircle className="w-4 h-4 text-green-500" />;
    if (tipoMov === 'saida') return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
    return <Settings className="w-4 h-4 text-blue-500" />;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (tipo === 'historico') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title={getTitulo()}>
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Estoque Atual:</span>
              <span className="font-semibold text-lg">
                {acessorio.estoque_atual} {acessorio.unidade}(s)
              </span>
            </div>
          </div>

          {loadingHistorico ? (
            <div className="text-center py-8 text-gray-500">
              Carregando historico...
            </div>
          ) : movimentacoes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma movimentacao registrada
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {movimentacoes.map(mov => (
                <div
                  key={mov.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {getIcon(mov.tipo)}
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="font-medium capitalize">{mov.tipo}</span>
                      <span
                        className={`font-semibold ${
                          mov.tipo === 'entrada'
                            ? 'text-green-600'
                            : mov.tipo === 'saida'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}
                      >
                        {mov.tipo === 'entrada' ? '+' : '-'}
                        {mov.quantidade} {acessorio.unidade}(s)
                      </span>
                    </div>
                    {mov.motivo && (
                      <p className="text-sm text-gray-500">{mov.motivo}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(mov.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitulo()}>
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Estoque Atual:</span>
            <span className="font-semibold">
              {acessorio.estoque_atual} {acessorio.unidade}(s)
            </span>
          </div>
        </div>

        <Input
          label={`Quantidade (${acessorio.unidade}s)`}
          type="number"
          min="1"
          value={quantidade}
          onChange={e => setQuantidade(e.target.value)}
          placeholder="Digite a quantidade"
          required
        />

        <Input
          label="Motivo (opcional)"
          value={motivo}
          onChange={e => setMotivo(e.target.value)}
          placeholder={
            tipo === 'entrada'
              ? 'Ex: Compra de fornecedor'
              : 'Ex: Producao de luminaria'
          }
        />

        {tipo === 'saida' && quantidade && parseInt(quantidade) > acessorio.estoque_atual && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
            Quantidade maior que o estoque disponivel!
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              !quantidade ||
              parseInt(quantidade) <= 0 ||
              (tipo === 'saida' && parseInt(quantidade) > acessorio.estoque_atual)
            }
            variant={tipo === 'entrada' ? 'primary' : 'danger'}
          >
            {isLoading
              ? 'Processando...'
              : tipo === 'entrada'
              ? 'Registrar Entrada'
              : 'Registrar Saida'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
