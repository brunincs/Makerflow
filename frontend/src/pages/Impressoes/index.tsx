import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui';
import { Impressao, ProdutoConcorrente, VariacaoProduto, Filamento, ImpressoraModelo } from '../../types';
import { getImpressoes, createImpressao, deleteImpressao } from '../../services/impressoesService';
import { getProdutos } from '../../services/produtosService';
import { getFilamentos } from '../../services/filamentosService';
import {
  Printer,
  Plus,
  Trash2,
  X,
  Check,
  Loader2,
  AlertCircle,
  Package,
  Search,
  ChevronDown,
  Layers,
  Cylinder,
  Scale,
  Clock,
  AlertTriangle,
  Calendar,
  Filter,
  PenLine
} from 'lucide-react';
import { DecimalInput } from '../../components/ui/DecimalInput';

const IMPRESSORAS: { value: ImpressoraModelo; label: string }[] = [
  { value: 'a1_mini', label: 'A1 Mini' },
  { value: 'a1', label: 'A1' },
  { value: 'p1p', label: 'P1P' },
  { value: 'p1s', label: 'P1S' },
  { value: 'x1_carbon', label: 'X1 Carbon' },
  { value: 'h2d', label: 'H2D' },
  { value: 'outra', label: 'Outra' },
];

type FiltroHistorico = 'hoje' | '7dias' | '30dias' | 'todos';
type ModoImpressao = 'radar' | 'manual';

interface ImpressaoForm {
  modo: ModoImpressao;
  produto_id: string;
  variacao_id: string;
  filamento_id: string;
  quantidade: number;
  peso_peca_g: number;
  tempo_peca_min: number;
  impressora: ImpressoraModelo | '';
  // Campos para modo manual
  nome_peca_manual: string;
  tempo_horas: number;
  tempo_minutos: number;
}

const initialForm: ImpressaoForm = {
  modo: 'radar',
  produto_id: '',
  variacao_id: '',
  filamento_id: '',
  quantidade: 1,
  peso_peca_g: 0,
  tempo_peca_min: 0,
  impressora: '',
  nome_peca_manual: '',
  tempo_horas: 0,
  tempo_minutos: 0,
};

// Utilitários de tempo
const formatarTempo = (minutos: number): string => {
  if (!minutos || minutos <= 0) return '-';
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  if (horas === 0) return `${mins}min`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
};

const tempoDecimalParaMinutos = (decimal: number): number => {
  return Math.round(decimal * 60);
};

export function Impressoes() {
  const [searchParams] = useSearchParams();
  const [impressoes, setImpressoes] = useState<Impressao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ImpressaoForm>(initialForm);
  const [filtroHistorico, setFiltroHistorico] = useState<FiltroHistorico>('hoje');

  // Para o seletor de produto
  const [showProdutoSearch, setShowProdutoSearch] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<ProdutoConcorrente | null>(null);
  const [selectedVariacao, setSelectedVariacao] = useState<VariacaoProduto | null>(null);
  const [showVariacoes, setShowVariacoes] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Verificar se veio produto do Radar via URL
  useEffect(() => {
    const produtoId = searchParams.get('produto');
    if (produtoId && produtos.length > 0) {
      const produto = produtos.find(p => p.id === produtoId);
      if (produto) {
        handleSelectProduto(produto);
        setShowForm(true);
      }
    }
  }, [searchParams, produtos]);

  const loadData = async () => {
    setLoading(true);
    const [impressoesData, produtosData, filamentosData] = await Promise.all([
      getImpressoes(),
      getProdutos(),
      getFilamentos(),
    ]);
    setImpressoes(impressoesData);
    setProdutos(produtosData);
    setFilamentos(filamentosData);
    setLoading(false);
  };

  const filteredProdutos = produtos.filter(p =>
    p.nome.toLowerCase().includes(produtoSearch.toLowerCase())
  );

  // Filtrar impressões por período
  const getImpressoesFiltradas = () => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    return impressoes.filter(imp => {
      if (!imp.created_at) return filtroHistorico === 'todos';
      const dataImp = new Date(imp.created_at);

      switch (filtroHistorico) {
        case 'hoje':
          return dataImp >= hoje;
        case '7dias':
          const seteDiasAtras = new Date(hoje);
          seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
          return dataImp >= seteDiasAtras;
        case '30dias':
          const trintaDiasAtras = new Date(hoje);
          trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
          return dataImp >= trintaDiasAtras;
        default:
          return true;
      }
    });
  };

  // Calcular resumo de hoje
  const getResumoHoje = () => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    const impressoesHoje = impressoes.filter(imp => {
      if (!imp.created_at) return false;
      return new Date(imp.created_at) >= hoje;
    });

    const pecas = impressoesHoje.reduce((acc, imp) => acc + imp.quantidade, 0);
    const filamento = impressoesHoje.reduce((acc, imp) => acc + imp.peso_total_g, 0);
    const tempo = impressoesHoje.reduce((acc, imp) => acc + (imp.tempo_total_min || 0), 0);

    return { pecas, filamento, tempo };
  };

  const handleSelectProduto = (produto: ProdutoConcorrente) => {
    setSelectedProduto(produto);
    setSelectedVariacao(null);

    const tempoPeca = produto.tempo_impressao
      ? tempoDecimalParaMinutos(produto.tempo_impressao)
      : 0;

    setForm(prev => ({
      ...prev,
      produto_id: produto.id || '',
      variacao_id: '',
      peso_peca_g: produto.peso_filamento || 0,
      tempo_peca_min: tempoPeca,
    }));
    setShowProdutoSearch(false);
    setProdutoSearch('');

    if (produto.variacoes && produto.variacoes.length > 0) {
      setShowVariacoes(true);
    }
  };

  const handleSelectVariacao = (variacao: VariacaoProduto | null) => {
    setSelectedVariacao(variacao);
    if (variacao) {
      const tempoPeca = variacao.tempo_impressao
        ? tempoDecimalParaMinutos(variacao.tempo_impressao)
        : (selectedProduto?.tempo_impressao ? tempoDecimalParaMinutos(selectedProduto.tempo_impressao) : 0);

      setForm(prev => ({
        ...prev,
        variacao_id: variacao.id || '',
        peso_peca_g: variacao.peso_filamento || selectedProduto?.peso_filamento || 0,
        tempo_peca_min: tempoPeca,
      }));
    } else {
      const tempoPeca = selectedProduto?.tempo_impressao
        ? tempoDecimalParaMinutos(selectedProduto.tempo_impressao)
        : 0;

      setForm(prev => ({
        ...prev,
        variacao_id: '',
        peso_peca_g: selectedProduto?.peso_filamento || 0,
        tempo_peca_min: tempoPeca,
      }));
    }
    setShowVariacoes(false);
  };

  const handleClearProduto = () => {
    setSelectedProduto(null);
    setSelectedVariacao(null);
    setForm(prev => ({
      ...prev,
      produto_id: '',
      variacao_id: '',
      peso_peca_g: 0,
      tempo_peca_min: 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação depende do modo
    if (form.modo === 'radar') {
      if (!form.produto_id || !form.filamento_id || form.quantidade <= 0 || form.peso_peca_g <= 0) {
        alert('Preencha todos os campos obrigatorios.');
        return;
      }
    } else {
      // Modo manual
      if (!form.nome_peca_manual.trim() || !form.filamento_id || form.quantidade <= 0 || form.peso_peca_g <= 0) {
        alert('Preencha todos os campos obrigatorios (nome da peca, filamento, peso e quantidade).');
        return;
      }
    }

    // Verificar estoque
    const filamentoSelecionado = filamentos.find(f => f.id === form.filamento_id);
    if (filamentoSelecionado && pesoTotal > (filamentoSelecionado.estoque_gramas || 0)) {
      alert('Estoque de filamento insuficiente!');
      return;
    }

    setSaving(true);

    try {
      // Calcular tempo em minutos para modo manual
      const tempoEmMinutos = form.modo === 'manual'
        ? (form.tempo_horas * 60) + form.tempo_minutos
        : form.tempo_peca_min;

      const dadosImpressao = {
        produto_id: form.modo === 'radar' ? form.produto_id : '__MANUAL__',
        variacao_id: form.variacao_id || undefined,
        filamento_id: form.filamento_id,
        quantidade: form.quantidade,
        peso_peca_g: form.peso_peca_g,
        tempo_peca_min: tempoEmMinutos,
        impressora: form.impressora || undefined,
        nome_peca_manual: form.modo === 'manual' ? form.nome_peca_manual : undefined,
      };

      const resultado = await createImpressao(dadosImpressao);

      if (resultado) {
        await loadData();
        setForm(initialForm);
        setSelectedProduto(null);
        setSelectedVariacao(null);
        setShowForm(false);
      } else {
        alert('Erro ao registrar impressao. Verifique o console.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao registrar: ' + (error as Error).message);
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    setDeletingId(id);
    const success = await deleteImpressao(id);
    if (success) {
      setImpressoes(prev => prev.filter(i => i.id !== id));
    }
    setDeletingId(null);
  };

  const handleCancel = () => {
    setForm(initialForm);
    setSelectedProduto(null);
    setSelectedVariacao(null);
    setShowForm(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const pesoTotal = form.peso_peca_g * form.quantidade;
  const tempoPorPeca = form.modo === 'manual'
    ? (form.tempo_horas * 60) + form.tempo_minutos
    : form.tempo_peca_min;
  const tempoTotal = tempoPorPeca * form.quantidade;

  // Verificar se tem estoque suficiente
  const filamentoSelecionado = filamentos.find(f => f.id === form.filamento_id);
  const estoqueInsuficiente = filamentoSelecionado && pesoTotal > (filamentoSelecionado.estoque_gramas || 0);

  const resumoHoje = getResumoHoje();
  const impressoesFiltradas = getImpressoesFiltradas();

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
            Impressoes
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Printer className="w-6 h-6 text-blue-600" />
            </div>
            Impressoes
          </h1>
          <p className="text-gray-500 mt-2">
            Registre suas impressoes e acompanhe a producao
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Registrar impressao
          </button>
        )}
      </div>

      {/* Resumo de Produção de Hoje */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600">Pecas hoje</p>
                <p className="text-2xl font-bold text-blue-800">{resumoHoje.pecas}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Scale className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600">Filamento hoje</p>
                <p className="text-2xl font-bold text-green-800">
                  {(resumoHoje.filamento / 1000).toFixed(2)} kg
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600">Tempo hoje</p>
                <p className="text-2xl font-bold text-purple-800">
                  {formatarTempo(resumoHoje.tempo)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Formulario */}
      {showForm && (
        <Card>
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Nova impressao
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seletor de Modo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modo de impressao
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, modo: 'radar', nome_peca_manual: '', tempo_horas: 0, tempo_minutos: 0 }));
                      handleClearProduto();
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                      form.modo === 'radar'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    <span className="font-medium">Produto do Radar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(prev => ({ ...prev, modo: 'manual', produto_id: '', variacao_id: '', peso_peca_g: 0, tempo_peca_min: 0 }));
                      setSelectedProduto(null);
                      setSelectedVariacao(null);
                    }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-colors ${
                      form.modo === 'manual'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <PenLine className="w-5 h-5" />
                    <span className="font-medium">Impressao Manual</span>
                  </button>
                </div>
              </div>

              {/* Campos do Modo Manual */}
              {form.modo === 'manual' && (
                <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da peca *
                    </label>
                    <input
                      type="text"
                      value={form.nome_peca_manual}
                      onChange={(e) => setForm(prev => ({ ...prev, nome_peca_manual: e.target.value }))}
                      placeholder="Ex: Suporte de celular, Vaso decorativo..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Peso por peca (g) *
                      </label>
                      <DecimalInput
                        value={form.peso_peca_g}
                        onChange={(value) => setForm(prev => ({ ...prev, peso_peca_g: value }))}
                        placeholder="Ex: 25.5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tempo de impressao
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="0"
                            value={form.tempo_horas || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, tempo_horas: parseInt(e.target.value) || 0 }))}
                            placeholder="0"
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg bg-white
                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">h</span>
                        </div>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={form.tempo_minutos || ''}
                            onChange={(e) => setForm(prev => ({ ...prev, tempo_minutos: Math.min(59, parseInt(e.target.value) || 0) }))}
                            placeholder="0"
                            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-white
                              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Seletor de Produto (somente modo radar) */}
              {form.modo === 'radar' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto *
                </label>

                {selectedProduto ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      {selectedProduto.imagem_url ? (
                        <img
                          src={selectedProduto.imagem_url}
                          alt={selectedProduto.nome}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="font-semibold text-gray-900">{selectedProduto.nome}</h5>
                            {selectedVariacao && (
                              <p className="text-sm text-purple-600 mt-0.5">
                                Variacao: {selectedVariacao.nome_variacao}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleClearProduto}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-sm">
                          {form.peso_peca_g > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                              <Scale className="w-3 h-3" />
                              {form.peso_peca_g}g por peca
                            </span>
                          )}
                          {form.tempo_peca_min > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded">
                              <Clock className="w-3 h-3" />
                              {formatarTempo(form.tempo_peca_min)} por peca
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Seletor de variacao */}
                    {selectedProduto.variacoes && selectedProduto.variacoes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setShowVariacoes(!showVariacoes)}
                          className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                        >
                          <Layers className="w-4 h-4" />
                          <span>
                            {selectedVariacao
                              ? `Variacao: ${selectedVariacao.nome_variacao}`
                              : 'Selecionar variacao'}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showVariacoes ? 'rotate-180' : ''}`} />
                        </button>

                        {showVariacoes && (
                          <div className="mt-2 space-y-1">
                            <button
                              type="button"
                              onClick={() => handleSelectVariacao(null)}
                              className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                                !selectedVariacao
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                              }`}
                            >
                              <span className="font-medium">Padrao (sem variacao)</span>
                              <div className="flex gap-2 text-xs">
                                {selectedProduto.peso_filamento && (
                                  <span className="text-green-600">{selectedProduto.peso_filamento}g</span>
                                )}
                                {selectedProduto.tempo_impressao && (
                                  <span className="text-blue-600">{formatarTempo(tempoDecimalParaMinutos(selectedProduto.tempo_impressao))}</span>
                                )}
                              </div>
                            </button>

                            {[...selectedProduto.variacoes]
                              .sort((a, b) => (a.peso_filamento || 0) - (b.peso_filamento || 0))
                              .map((variacao) => (
                              <button
                                key={variacao.id}
                                type="button"
                                onClick={() => handleSelectVariacao(variacao)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                                  selectedVariacao?.id === variacao.id
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                                }`}
                              >
                                <span className="font-medium">{variacao.nome_variacao}</span>
                                <div className="flex gap-2 text-xs">
                                  {variacao.peso_filamento && (
                                    <span className="text-green-600">{variacao.peso_filamento}g</span>
                                  )}
                                  {variacao.tempo_impressao && (
                                    <span className="text-blue-600">{formatarTempo(tempoDecimalParaMinutos(variacao.tempo_impressao))}</span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      onClick={() => setShowProdutoSearch(true)}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors flex items-center gap-3"
                    >
                      <Search className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-500">Buscar produto do Radar...</span>
                    </div>

                    {showProdutoSearch && (
                      <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-3 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              type="text"
                              placeholder="Digite para buscar..."
                              value={produtoSearch}
                              onChange={(e) => setProdutoSearch(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-64 overflow-y-auto">
                          {filteredProdutos.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              {produtoSearch ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                            </div>
                          ) : (
                            filteredProdutos.map((produto) => (
                              <button
                                key={produto.id}
                                type="button"
                                onClick={() => handleSelectProduto(produto)}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                              >
                                {produto.imagem_url ? (
                                  <img
                                    src={produto.imagem_url}
                                    alt={produto.nome}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="w-6 h-6 text-gray-300" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">{produto.nome}</p>
                                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                    {produto.peso_filamento && (
                                      <span>{produto.peso_filamento}g</span>
                                    )}
                                    {produto.tempo_impressao && (
                                      <span>{formatarTempo(tempoDecimalParaMinutos(produto.tempo_impressao))}</span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>

                        <div className="p-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => setShowProdutoSearch(false)}
                            className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              <div className={`grid grid-cols-1 md:grid-cols-2 ${form.modo === 'radar' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
                {/* Filamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filamento *
                  </label>
                  <select
                    value={form.filamento_id}
                    onChange={(e) => setForm(prev => ({ ...prev, filamento_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {filamentos.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.marca} - {f.nome_filamento}
                      </option>
                    ))}
                  </select>
                  {filamentoSelecionado && (
                    <p className={`text-xs mt-1 ${(filamentoSelecionado.estoque_gramas || 0) < 1000 ? 'text-red-600' : 'text-gray-500'}`}>
                      Estoque: {((filamentoSelecionado.estoque_gramas || 0) / 1000).toFixed(2)} kg
                    </p>
                  )}
                </div>

                {/* Quantidade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantidade}
                    onChange={(e) => setForm(prev => ({ ...prev, quantidade: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Peso por peca (somente leitura) - apenas modo radar */}
                {form.modo === 'radar' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso por peca (g)
                    </label>
                    <input
                      type="number"
                      value={form.peso_peca_g}
                      readOnly
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Impressora */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impressora
                  </label>
                  <select
                    value={form.impressora}
                    onChange={(e) => setForm(prev => ({ ...prev, impressora: e.target.value as ImpressoraModelo | '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {IMPRESSORAS.map(imp => (
                      <option key={imp.value} value={imp.value}>{imp.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Resumo do consumo */}
              {pesoTotal > 0 && (
                <div className={`p-4 rounded-lg border ${estoqueInsuficiente ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  {estoqueInsuficiente && (
                    <div className="flex items-center gap-2 text-red-700 mb-3">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="font-medium">Filamento insuficiente!</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className={`text-sm ${estoqueInsuficiente ? 'text-red-600' : 'text-blue-600'}`}>
                        Filamento a consumir:
                      </p>
                      <p className={`text-xl font-bold ${estoqueInsuficiente ? 'text-red-800' : 'text-blue-800'}`}>
                        {pesoTotal.toLocaleString('pt-BR')}g ({(pesoTotal / 1000).toFixed(3)}kg)
                      </p>
                      <p className={`text-xs ${estoqueInsuficiente ? 'text-red-500' : 'text-blue-500'}`}>
                        {form.peso_peca_g}g x {form.quantidade} {form.quantidade === 1 ? 'peca' : 'pecas'}
                      </p>
                    </div>

                    {tempoTotal > 0 && (
                      <div>
                        <p className="text-sm text-purple-600">Tempo total de impressao:</p>
                        <p className="text-xl font-bold text-purple-800">
                          {formatarTempo(tempoTotal)}
                        </p>
                        <p className="text-xs text-purple-500">
                          {formatarTempo(tempoPorPeca)} x {form.quantidade} {form.quantidade === 1 ? 'peca' : 'pecas'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botoes */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving || estoqueInsuficiente}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Registrar impressao
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

      {/* Historico de Impressões */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            Historico de Producao
          </h2>

          {/* Filtros */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {(['hoje', '7dias', '30dias', 'todos'] as FiltroHistorico[]).map((filtro) => (
              <button
                key={filtro}
                onClick={() => setFiltroHistorico(filtro)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filtroHistorico === filtro
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filtro === 'hoje' && 'Hoje'}
                {filtro === '7dias' && '7 dias'}
                {filtro === '30dias' && '30 dias'}
                {filtro === 'todos' && 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {impressoesFiltradas.length === 0 ? (
          <Card>
            <CardBody className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma impressao registrada
              </h3>
              <p className="text-gray-500 mb-4">
                {filtroHistorico === 'hoje'
                  ? 'Nenhuma impressao registrada hoje.'
                  : filtroHistorico === '7dias'
                  ? 'Nenhuma impressao nos ultimos 7 dias.'
                  : filtroHistorico === '30dias'
                  ? 'Nenhuma impressao nos ultimos 30 dias.'
                  : 'Registre suas impressoes para acompanhar a producao.'}
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Registrar impressao
                </button>
              )}
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-3">
            {impressoesFiltradas.map((impressao) => (
              <Card key={impressao.id} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Icone */}
                    <div className="p-3 bg-blue-100 rounded-xl flex-shrink-0">
                      <Printer className="w-6 h-6 text-blue-600" />
                    </div>

                    {/* Info Principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            {impressao.nome_peca_manual || impressao.produto?.nome || 'Produto'}
                            {impressao.nome_peca_manual && (
                              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                                Manual
                              </span>
                            )}
                          </h3>
                          {impressao.variacao?.nome_variacao && (
                            <p className="text-sm text-purple-600">
                              Variacao: {impressao.variacao.nome_variacao}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">
                            {formatDate(impressao.created_at)}
                          </span>
                          <button
                            onClick={() => handleDelete(impressao.id!)}
                            disabled={deletingId === impressao.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Excluir"
                          >
                            {deletingId === impressao.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Detalhes */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Quantidade</p>
                            <p className="font-semibold text-gray-900">{impressao.quantidade} pecas</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-green-500" />
                          <div>
                            <p className="text-xs text-gray-500">Filamento usado</p>
                            <p className="font-semibold text-green-700">{impressao.peso_total_g}g</p>
                          </div>
                        </div>

                        {impressao.tempo_total_min && impressao.tempo_total_min > 0 && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-500" />
                            <div>
                              <p className="text-xs text-gray-500">Tempo total</p>
                              <p className="font-semibold text-purple-700">{formatarTempo(impressao.tempo_total_min)}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Cylinder className="w-4 h-4 text-blue-500" />
                          <div>
                            <p className="text-xs text-gray-500">Filamento</p>
                            <p className="font-semibold text-blue-700 truncate">
                              {impressao.filamento?.nome_filamento || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
