import { useState, useEffect } from 'react';
import { Card, CardBody } from '../../components/ui';
import { Embalagem, TipoEmbalagem } from '../../types';
import {
  getEmbalagens,
  createEmbalagem,
  updateEmbalagem,
  deleteEmbalagem,
  registrarMovimentacaoEmbalagem,
  getMovimentacoesEmbalagem,
  EmbalagemMovimentacao
} from '../../services/embalagensService';
import { DecimalInput } from '../../components/ui/DecimalInput';
import { AcessoriosList } from '../../components/acessorios/AcessoriosList';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Lightbulb,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock
} from 'lucide-react';

type TabType = 'embalagens' | 'acessorios';

interface EmbalagemForm {
  tipo: TipoEmbalagem;
  nome_embalagem: string;
  quantidade: number;
  preco_unitario: number;
}

const initialForm: EmbalagemForm = {
  tipo: 'Caixa',
  nome_embalagem: '',
  quantidade: 0,
  preco_unitario: 0,
};

export function Embalagens() {
  const [activeTab, setActiveTab] = useState<TabType>('embalagens');
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmbalagemForm>(initialForm);

  // Modal de estoque
  const [showEstoqueModal, setShowEstoqueModal] = useState<'entrada' | 'saida' | 'historico' | null>(null);
  const [estoqueEmbalagemId, setEstoqueEmbalagemId] = useState<string | null>(null);
  const [estoqueQuantidade, setEstoqueQuantidade] = useState<number>(1);
  const [estoqueMotivo, setEstoqueMotivo] = useState<string>('');
  const [savingEstoque, setSavingEstoque] = useState(false);
  const [movimentacoes, setMovimentacoes] = useState<EmbalagemMovimentacao[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    loadEmbalagens();
  }, []);

  const loadEmbalagens = async () => {
    setLoading(true);
    const data = await getEmbalagens();
    setEmbalagens(data);
    setLoading(false);
  };

  // Estoque baixo = menos de 10 unidades
  const isEstoqueBaixo = (quantidade: number) => quantidade < 10;

  // Embalagens com baixo estoque
  const embalagensBaixoEstoque = embalagens.filter(e => isEstoqueBaixo(e.quantidade || 0));

  // Ordenar: baixo estoque primeiro, depois por tipo e nome
  const embalagensOrdenadas = [...embalagens].sort((a, b) => {
    const aBaixo = isEstoqueBaixo(a.quantidade || 0);
    const bBaixo = isEstoqueBaixo(b.quantidade || 0);
    if (aBaixo && !bBaixo) return -1;
    if (!aBaixo && bBaixo) return 1;
    if (a.tipo !== b.tipo) return a.tipo.localeCompare(b.tipo);
    return a.nome_embalagem.localeCompare(b.nome_embalagem);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome_embalagem.trim() || form.preco_unitario <= 0) {
      alert('Preencha todos os campos obrigatorios.');
      return;
    }

    setSaving(true);

    if (editingId) {
      const resultado = await updateEmbalagem(editingId, form);
      if (resultado) {
        setEmbalagens(prev => prev.map(e => e.id === editingId ? resultado : e));
        setEditingId(null);
      }
    } else {
      const resultado = await createEmbalagem(form);
      if (resultado) {
        setEmbalagens(prev => [resultado, ...prev]);
      }
    }

    setForm(initialForm);
    setShowForm(false);
    setSaving(false);
  };

  const handleEdit = (embalagem: Embalagem) => {
    setForm({
      tipo: embalagem.tipo || 'Caixa',
      nome_embalagem: embalagem.nome_embalagem,
      quantidade: embalagem.quantidade || 0,
      preco_unitario: embalagem.preco_unitario,
    });
    setEditingId(embalagem.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta embalagem?')) return;

    setDeletingId(id);
    const success = await deleteEmbalagem(id);
    if (success) {
      setEmbalagens(prev => prev.filter(e => e.id !== id));
    }
    setDeletingId(null);
  };

  const handleCancel = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleOpenEstoqueModal = async (tipo: 'entrada' | 'saida' | 'historico', id: string) => {
    setShowEstoqueModal(tipo);
    setEstoqueEmbalagemId(id);
    setEstoqueQuantidade(1);
    setEstoqueMotivo('');

    if (tipo === 'historico') {
      setLoadingHistorico(true);
      const movs = await getMovimentacoesEmbalagem(id);
      setMovimentacoes(movs);
      setLoadingHistorico(false);
    }
  };

  const handleCloseEstoqueModal = () => {
    setShowEstoqueModal(null);
    setEstoqueEmbalagemId(null);
    setEstoqueQuantidade(1);
    setEstoqueMotivo('');
    setMovimentacoes([]);
  };

  const handleSubmitEstoque = async () => {
    if (!estoqueEmbalagemId || estoqueQuantidade <= 0) return;
    if (showEstoqueModal === 'historico') return;

    setSavingEstoque(true);

    const tipo = showEstoqueModal as 'entrada' | 'saida';
    const resultado = await registrarMovimentacaoEmbalagem(
      estoqueEmbalagemId,
      tipo,
      estoqueQuantidade,
      estoqueMotivo || undefined
    );

    if (resultado) {
      // Recarregar embalagens para pegar o estoque atualizado
      await loadEmbalagens();
      handleCloseEstoqueModal();
    }

    setSavingEstoque(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getEmbalagemAtual = () => embalagens.find(e => e.id === estoqueEmbalagemId);

  if (loading && activeTab === 'embalagens') {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            Embalagens e Acessorios
          </h1>
          <p className="text-gray-500 mt-2">
            Gerencie embalagens e acessorios para seus produtos
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Package className="w-6 h-6 text-amber-600" />
          </div>
          Embalagens e Acessorios
        </h1>
        <p className="text-gray-500 mt-2">
          Gerencie embalagens e acessorios para seus produtos
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('embalagens')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'embalagens'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Embalagens
          </button>
          <button
            onClick={() => setActiveTab('acessorios')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'acessorios'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Acessorios
          </button>
        </nav>
      </div>

      {/* Tab Acessorios */}
      {activeTab === 'acessorios' && <AcessoriosList />}

      {/* Tab Embalagens */}
      {activeTab === 'embalagens' && (
        <>
      {/* Header de Embalagens */}
      <div className="mb-8 flex items-start justify-between">
        <div />
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova embalagem
          </button>
        )}
      </div>

      {/* Alerta de Baixo Estoque */}
      {embalagensBaixoEstoque.length > 0 && (
        <Card className="mb-6 border-orange-200 bg-orange-50">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-orange-800 mb-2">
                  Embalagens com estoque baixo ({embalagensBaixoEstoque.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {embalagensBaixoEstoque.map(e => (
                    <span
                      key={e.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {e.nome_embalagem}
                      </span>
                      <span className="text-orange-600 font-bold">
                        {e.quantidade || 0} un
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Formulario */}
      {showForm && (
        <Card className="mb-6">
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar embalagem' : 'Nova embalagem'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome da Embalagem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da embalagem *
                  </label>
                  <input
                    type="text"
                    value={form.nome_embalagem}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_embalagem: e.target.value }))}
                    placeholder="Ex: Envelope kraft, Plastico bolha..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Preco Unitario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preco unitario *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                      R$
                    </span>
                    <DecimalInput
                      value={form.preco_unitario}
                      onChange={(value) => setForm(prev => ({ ...prev, preco_unitario: value }))}
                      placeholder="0.80"
                      className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Quantidade inicial - apenas na criação */}
              {!editingId && (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade inicial em estoque
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.quantidade}
                    onChange={(e) => setForm(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              )}

              {/* Botoes */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingId ? 'Salvar alteracoes' : 'Cadastrar embalagem'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Lista de Embalagens */}
      {embalagens.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma embalagem cadastrada
            </h3>
            <p className="text-gray-500 mb-4">
              Cadastre suas embalagens para selecionar na calculadora de precificacao.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Cadastrar embalagem
              </button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {embalagensOrdenadas.map((embalagem) => {
            const baixoEstoque = isEstoqueBaixo(embalagem.quantidade || 0);

            return (
              <Card key={embalagem.id} className={`overflow-hidden ${baixoEstoque ? 'border-orange-200' : ''}`}>
                <div className="flex items-center gap-4 p-4">
                  {/* Icone */}
                  <div className={`p-3 rounded-xl ${baixoEstoque ? 'bg-orange-100' : 'bg-amber-100'}`}>
                    <Package className={`w-6 h-6 ${baixoEstoque ? 'text-orange-600' : 'text-amber-600'}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {embalagem.nome_embalagem}
                      </h3>
                      {baixoEstoque && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                          Baixo estoque
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estoque */}
                  <div className="text-center px-4 border-l border-gray-200">
                    <div className={`flex items-center gap-1 ${baixoEstoque ? 'text-orange-600' : 'text-green-600'}`}>
                      {baixoEstoque && <AlertTriangle className="w-4 h-4" />}
                      <span className="text-lg font-bold">{embalagem.quantidade || 0}</span>
                    </div>
                    <p className="text-xs text-gray-500">unidades</p>
                  </div>

                  {/* Preco */}
                  <div className="text-right px-4 border-l border-gray-200">
                    <p className="text-lg font-bold text-amber-700">
                      R$ {formatCurrency(embalagem.preco_unitario)}
                    </p>
                    <p className="text-xs text-gray-500">/unidade</p>
                  </div>

                  {/* Acoes */}
                  <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
                    {/* Botões de estoque */}
                    <button
                      onClick={() => handleOpenEstoqueModal('entrada', embalagem.id)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      title="Adicionar estoque"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEstoqueModal('saida', embalagem.id)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      title="Remover estoque"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEstoqueModal('historico', embalagem.id)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      title="Historico de movimentacoes"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    {/* Separador */}
                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    <button
                      onClick={() => handleEdit(embalagem)}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(embalagem.id)}
                      disabled={deletingId === embalagem.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingId === embalagem.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {embalagens.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              <strong className="text-gray-900">{embalagens.length}</strong> {embalagens.length === 1 ? 'embalagem cadastrada' : 'embalagens cadastradas'}
            </span>
            <span className="text-gray-500">
              Estoque total: <strong className="text-gray-900">
                {embalagens.reduce((acc, e) => acc + (e.quantidade || 0), 0)} unidades
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Modal de Estoque */}
      {showEstoqueModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={handleCloseEstoqueModal} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className={`relative bg-white rounded-xl shadow-xl w-full ${showEstoqueModal === 'historico' ? 'max-w-lg' : 'max-w-sm'}`}>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {showEstoqueModal === 'entrada' ? (
                      <>
                        <ArrowUpCircle className="w-5 h-5 text-green-600" />
                        Entrada de Estoque
                      </>
                    ) : showEstoqueModal === 'saida' ? (
                      <>
                        <ArrowDownCircle className="w-5 h-5 text-red-600" />
                        Saida de Estoque
                      </>
                    ) : (
                      <>
                        <History className="w-5 h-5 text-blue-600" />
                        Historico de Movimentacoes
                      </>
                    )}
                  </h3>
                  <button onClick={handleCloseEstoqueModal} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {getEmbalagemAtual() && (
                  <p className="text-sm text-gray-500 mt-1">
                    {getEmbalagemAtual()?.nome_embalagem}
                  </p>
                )}
              </div>

              {/* Conteudo para Entrada/Saida */}
              {(showEstoqueModal === 'entrada' || showEstoqueModal === 'saida') && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={showEstoqueModal === 'saida' ? (getEmbalagemAtual()?.quantidade || 0) : undefined}
                      step="1"
                      value={estoqueQuantidade}
                      onChange={(e) => setEstoqueQuantidade(parseInt(e.target.value) || 1)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 ${
                          showEstoqueModal === 'entrada'
                            ? 'focus:ring-green-500 focus:border-green-500'
                            : 'focus:ring-red-500 focus:border-red-500'
                        }`}
                    />
                    {showEstoqueModal === 'saida' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Maximo: {getEmbalagemAtual()?.quantidade || 0} unidades
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motivo (opcional)
                    </label>
                    <input
                      type="text"
                      value={estoqueMotivo}
                      onChange={(e) => setEstoqueMotivo(e.target.value)}
                      placeholder={showEstoqueModal === 'entrada' ? 'Ex: Compra, Reposicao...' : 'Ex: Producao, Venda...'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    />
                  </div>

                  <div className={`p-4 rounded-lg border text-sm space-y-1 ${
                    showEstoqueModal === 'entrada'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex justify-between">
                      <span className={showEstoqueModal === 'entrada' ? 'text-green-700' : 'text-red-700'}>
                        Estoque atual:
                      </span>
                      <span className="font-medium">{getEmbalagemAtual()?.quantidade || 0} un</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={showEstoqueModal === 'entrada' ? 'text-green-700' : 'text-red-700'}>
                        {showEstoqueModal === 'entrada' ? 'Adicionando:' : 'Removendo:'}
                      </span>
                      <span className="font-medium">
                        {showEstoqueModal === 'entrada' ? '+' : '-'}{estoqueQuantidade} un
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-1 border-current border-opacity-20">
                      <span className={showEstoqueModal === 'entrada' ? 'text-green-700' : 'text-red-700'}>
                        Novo estoque:
                      </span>
                      <span className="font-bold">
                        {showEstoqueModal === 'entrada'
                          ? (getEmbalagemAtual()?.quantidade || 0) + estoqueQuantidade
                          : Math.max(0, (getEmbalagemAtual()?.quantidade || 0) - estoqueQuantidade)
                        } un
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSubmitEstoque}
                      disabled={savingEstoque}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                        showEstoqueModal === 'entrada'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {savingEstoque ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      {showEstoqueModal === 'entrada' ? 'Adicionar' : 'Remover'}
                    </button>
                    <button
                      onClick={handleCloseEstoqueModal}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Conteudo para Historico */}
              {showEstoqueModal === 'historico' && (
                <div className="p-6">
                  {loadingHistorico ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : movimentacoes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                      <p>Nenhuma movimentacao registrada</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {movimentacoes.map((mov) => (
                        <div
                          key={mov.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            mov.tipo === 'entrada'
                              ? 'bg-green-50 border-green-200'
                              : mov.tipo === 'saida'
                              ? 'bg-red-50 border-red-200'
                              : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          {mov.tipo === 'entrada' ? (
                            <ArrowUpCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          ) : mov.tipo === 'saida' ? (
                            <ArrowDownCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`font-medium ${
                                mov.tipo === 'entrada' ? 'text-green-700' : mov.tipo === 'saida' ? 'text-red-700' : 'text-blue-700'
                              }`}>
                                {mov.tipo === 'entrada' ? '+' : mov.tipo === 'saida' ? '-' : ''}{mov.quantidade} un
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(mov.created_at).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {mov.motivo && (
                              <p className="text-sm text-gray-600 truncate">{mov.motivo}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={handleCloseEstoqueModal}
                      className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
