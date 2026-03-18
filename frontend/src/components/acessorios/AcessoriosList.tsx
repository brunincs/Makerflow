import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, History, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Card } from '../ui/Card';
import { AcessorioForm } from './AcessorioForm';
import { MovimentacaoModal } from './MovimentacaoModal';
import { Acessorio } from '../../types/acessorio';
import {
  getAcessorios,
  createAcessorio,
  updateAcessorio,
  deleteAcessorio,
  registrarEntrada,
  registrarSaida,
} from '../../services/acessoriosService';

export function AcessoriosList() {
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAcessorio, setEditingAcessorio] = useState<Acessorio | null>(null);
  const [movModalType, setMovModalType] = useState<'entrada' | 'saida' | 'historico' | null>(null);
  const [selectedAcessorio, setSelectedAcessorio] = useState<Acessorio | null>(null);

  useEffect(() => {
    loadAcessorios();
  }, []);

  const loadAcessorios = async () => {
    setIsLoading(true);
    const data = await getAcessorios(false); // Incluir inativos para admin
    setAcessorios(data);
    setIsLoading(false);
  };

  const handleCreate = () => {
    setEditingAcessorio(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (acessorio: Acessorio) => {
    setEditingAcessorio(acessorio);
    setIsFormModalOpen(true);
  };

  const handleSave = async (data: Omit<Acessorio, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    setIsSaving(true);
    try {
      if (editingAcessorio) {
        await updateAcessorio(editingAcessorio.id, data);
      } else {
        await createAcessorio(data);
      }
      await loadAcessorios();
      setIsFormModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (acessorio: Acessorio) => {
    if (!confirm(`Deseja realmente excluir "${acessorio.nome}"?`)) return;
    await deleteAcessorio(acessorio.id);
    await loadAcessorios();
  };

  const handleEntrada = (acessorio: Acessorio) => {
    setSelectedAcessorio(acessorio);
    setMovModalType('entrada');
  };

  const handleSaida = (acessorio: Acessorio) => {
    setSelectedAcessorio(acessorio);
    setMovModalType('saida');
  };

  const handleHistorico = (acessorio: Acessorio) => {
    setSelectedAcessorio(acessorio);
    setMovModalType('historico');
  };

  const handleConfirmMovimentacao = async (quantidade: number, motivo: string) => {
    if (!selectedAcessorio || !movModalType) return;

    if (movModalType === 'entrada') {
      await registrarEntrada(selectedAcessorio.id, quantidade, motivo);
    } else if (movModalType === 'saida') {
      await registrarSaida(selectedAcessorio.id, quantidade, motivo);
    }

    await loadAcessorios();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isEstoqueBaixo = (acessorio: Acessorio) => {
    return acessorio.estoque_atual <= acessorio.estoque_minimo;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Carregando acessorios...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Acessorios</h2>
          <p className="text-sm text-gray-500">
            Gerencie LEDs, parafusos, plantas e outros acessorios
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Acessorio
        </Button>
      </div>

      {/* Alerta de estoque baixo */}
      {acessorios.some(a => a.ativo && isEstoqueBaixo(a)) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Acessorios com estoque baixo:</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {acessorios
              .filter(a => a.ativo && isEstoqueBaixo(a))
              .map(a => (
                <span
                  key={a.id}
                  className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm"
                >
                  {a.nome} ({a.estoque_atual}/{a.estoque_minimo})
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {acessorios.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Nenhum acessorio cadastrado</p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar Primeiro Acessorio
            </Button>
          </div>
        </Card>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acessorio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo Unit.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {acessorios
                .filter(a => a.ativo)
                .map(acessorio => (
                  <tr key={acessorio.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{acessorio.nome}</div>
                        {acessorio.descricao && (
                          <div className="text-sm text-gray-500">{acessorio.descricao}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">
                      {acessorio.unidade}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatCurrency(acessorio.custo_unitario)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-medium ${
                          isEstoqueBaixo(acessorio) ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {acessorio.estoque_atual}
                      </span>
                      <span className="text-gray-400 text-sm ml-1">
                        / min: {acessorio.estoque_minimo}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isEstoqueBaixo(acessorio) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <AlertTriangle className="w-3 h-3" />
                          Baixo
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEntrada(acessorio)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Entrada de estoque"
                        >
                          <ArrowUpCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleSaida(acessorio)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Saida de estoque"
                        >
                          <ArrowDownCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleHistorico(acessorio)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Historico"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(acessorio)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(acessorio)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Formulario */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingAcessorio ? 'Editar Acessorio' : 'Novo Acessorio'}
      >
        <AcessorioForm
          acessorio={editingAcessorio}
          onSave={handleSave}
          onCancel={() => setIsFormModalOpen(false)}
          isLoading={isSaving}
        />
      </Modal>

      {/* Modal de Movimentacao */}
      {selectedAcessorio && movModalType && (
        <MovimentacaoModal
          isOpen={true}
          onClose={() => {
            setSelectedAcessorio(null);
            setMovModalType(null);
          }}
          acessorio={selectedAcessorio}
          tipo={movModalType}
          onConfirm={movModalType !== 'historico' ? handleConfirmMovimentacao : undefined}
        />
      )}
    </div>
  );
}
