import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Button } from '../../components/ui';
import { EstoqueProduto, EstoqueMovimentacao, ProdutoConcorrente, VariacaoProduto } from '../../types';
import {
  getEstoqueProdutos,
  getMovimentacoes,
  adicionarEstoqueComMovimentacao,
  removerEstoqueComMovimentacao,
} from '../../services/estoqueProdutosService';
import { getProdutos } from '../../services/produtosService';
import {
  Package,
  Plus,
  Minus,
  History,
  Search,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Layers,
  AlertCircle,
  Check,
  Loader2,
  BoxIcon
} from 'lucide-react';

interface ProdutoAgrupado {
  produto_id: string;
  nome: string;
  imagem_url?: string;
  itens: EstoqueProduto[];
  total: number;
}

export function Estoque() {
  const [estoque, setEstoque] = useState<EstoqueProduto[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<EstoqueMovimentacao[]>([]);
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');

  // Modal de adicionar/remover
  const [modalAberto, setModalAberto] = useState(false);
  const [modalTipo, setModalTipo] = useState<'entrada' | 'saida'>('entrada');
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoConcorrente | null>(null);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<VariacaoProduto | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Aba atual
  const [abaAtiva, setAbaAtiva] = useState<'estoque' | 'historico'>('estoque');

  const carregarDados = useCallback(async () => {
    setLoading(true);
    const [estoqueData, movData, produtosData] = await Promise.all([
      getEstoqueProdutos(),
      getMovimentacoes(100),
      getProdutos(),
    ]);
    setEstoque(estoqueData);
    setMovimentacoes(movData);
    setProdutos(produtosData);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Agrupar estoque por produto
  const estoqueAgrupado: ProdutoAgrupado[] = (() => {
    const mapa = new Map<string, ProdutoAgrupado>();

    estoque.forEach(item => {
      if (!mapa.has(item.produto_id)) {
        mapa.set(item.produto_id, {
          produto_id: item.produto_id,
          nome: item.produto?.nome || 'Produto desconhecido',
          imagem_url: item.produto?.imagem_url,
          itens: [],
          total: 0,
        });
      }
      const grupo = mapa.get(item.produto_id)!;
      grupo.itens.push(item);
      grupo.total += item.quantidade;
    });

    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  })();

  // Filtrar por busca
  const estoqueFiltrado = estoqueAgrupado.filter(item =>
    item.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // Abrir modal
  const abrirModal = (tipo: 'entrada' | 'saida', produto?: ProdutoConcorrente, variacao?: VariacaoProduto) => {
    setModalTipo(tipo);
    setProdutoSelecionado(produto || null);
    setVariacaoSelecionada(variacao || null);
    setQuantidade(1);
    setObservacao('');
    setModalAberto(true);
  };

  // Salvar movimentacao
  const handleSalvar = async () => {
    if (!produtoSelecionado) return;

    setSalvando(true);

    try {
      if (modalTipo === 'entrada') {
        await adicionarEstoqueComMovimentacao(
          produtoSelecionado.id!,
          variacaoSelecionada?.id || null,
          quantidade,
          'manual',
          observacao || undefined
        );
      } else {
        await removerEstoqueComMovimentacao(
          produtoSelecionado.id!,
          variacaoSelecionada?.id || null,
          quantidade,
          'manual',
          observacao || undefined
        );
      }

      await carregarDados();
      setModalAberto(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar movimentacao');
    } finally {
      setSalvando(false);
    }
  };

  // Verificar estoque disponivel para saida
  const estoqueDisponivel = (() => {
    if (!produtoSelecionado) return 0;
    const item = estoque.find(e =>
      e.produto_id === produtoSelecionado.id &&
      (variacaoSelecionada ? e.variacao_id === variacaoSelecionada.id : !e.variacao_id)
    );
    return item?.quantidade || 0;
  })();

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <BoxIcon className="w-6 h-6 text-emerald-600" />
            </div>
            Estoque de Produtos
          </h1>
          <p className="text-gray-500 mt-2">
            Controle de produtos prontos em estoque
          </p>
        </div>

        <Button onClick={() => abrirModal('entrada')}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar ao Estoque
        </Button>
      </div>

      {/* Abas */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setAbaAtiva('estoque')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              abaAtiva === 'estoque'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Estoque Atual
          </button>
          <button
            onClick={() => setAbaAtiva('historico')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              abaAtiva === 'historico'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            Historico
          </button>
        </nav>
      </div>

      {/* Conteudo */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-500">Carregando estoque...</p>
        </div>
      ) : abaAtiva === 'estoque' ? (
        <>
          {/* Busca */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Lista de Estoque */}
          {estoqueFiltrado.length === 0 ? (
            <Card>
              <CardBody className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {busca ? 'Nenhum produto encontrado' : 'Estoque vazio'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {busca
                    ? 'Tente buscar por outro termo'
                    : 'Adicione produtos ao estoque para comecar'}
                </p>
                {!busca && (
                  <Button onClick={() => abrirModal('entrada')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Produto
                  </Button>
                )}
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-4">
              {estoqueFiltrado.map((grupo) => (
                <Card key={grupo.produto_id}>
                  <CardBody className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Imagem */}
                      {grupo.imagem_url ? (
                        <img
                          src={grupo.imagem_url}
                          alt={grupo.nome}
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">{grupo.nome}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-emerald-600">
                              {grupo.total}
                            </span>
                            <span className="text-sm text-gray-500">un</span>
                          </div>
                        </div>

                        {/* Variacoes */}
                        {grupo.itens.length > 1 || grupo.itens[0]?.variacao_id ? (
                          <div className="space-y-1 mb-3">
                            {grupo.itens.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-600 flex items-center gap-1">
                                  <Layers className="w-3 h-3" />
                                  {item.variacao?.nome_variacao || 'Padrao'}
                                </span>
                                <span className={`font-medium ${
                                  item.quantidade > 0 ? 'text-emerald-600' : 'text-red-500'
                                }`}>
                                  {item.quantidade} un
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Acoes */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const prod = produtos.find(p => p.id === grupo.produto_id);
                              if (prod) abrirModal('entrada', prod);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar
                          </button>
                          <button
                            onClick={() => {
                              const prod = produtos.find(p => p.id === grupo.produto_id);
                              if (prod) abrirModal('saida', prod);
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Historico de Movimentacoes */
        <Card>
          <CardBody className="p-0">
            {movimentacoes.length === 0 ? (
              <div className="p-12 text-center">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Nenhuma movimentacao
                </h3>
                <p className="text-gray-500">
                  O historico aparecera aqui quando houver entradas ou saidas
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {movimentacoes.map((mov) => (
                  <div key={mov.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className={`p-2 rounded-lg ${
                      mov.tipo === 'entrada' ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {mov.tipo === 'entrada' ? (
                        <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {mov.produto?.nome || 'Produto removido'}
                        {mov.variacao?.nome_variacao && (
                          <span className="text-purple-600 ml-1">
                            ({mov.variacao.nome_variacao})
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {mov.origem === 'producao' && 'Via producao'}
                        {mov.origem === 'venda' && 'Venda'}
                        {mov.origem === 'manual' && 'Ajuste manual'}
                        {mov.origem === 'ajuste' && 'Ajuste'}
                        {mov.observacao && ` - ${mov.observacao}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        mov.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatarData(mov.created_at!)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Modal de Adicionar/Remover */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  {modalTipo === 'entrada' ? (
                    <>
                      <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
                      Adicionar ao Estoque
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="w-6 h-6 text-red-500" />
                      Remover do Estoque
                    </>
                  )}
                </h2>
                <button
                  onClick={() => setModalAberto(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Selecionar Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Produto
                </label>
                <select
                  value={produtoSelecionado?.id || ''}
                  onChange={(e) => {
                    const prod = produtos.find(p => p.id === e.target.value);
                    setProdutoSelecionado(prod || null);
                    setVariacaoSelecionada(null);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selecionar Variacao */}
              {produtoSelecionado?.variacoes && produtoSelecionado.variacoes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Variacao
                  </label>
                  <select
                    value={variacaoSelecionada?.id || ''}
                    onChange={(e) => {
                      const variacao = produtoSelecionado.variacoes?.find(v => v.id === e.target.value);
                      setVariacaoSelecionada(variacao || null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Padrao (sem variacao)</option>
                    {produtoSelecionado.variacoes.map((variacao) => (
                      <option key={variacao.id} value={variacao.id}>
                        {variacao.nome_variacao}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantidade
                </label>
                <input
                  type="number"
                  min="1"
                  max={modalTipo === 'saida' ? estoqueDisponivel : undefined}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {modalTipo === 'saida' && (
                  <p className="text-sm text-gray-500 mt-1">
                    Disponivel: {estoqueDisponivel} unidades
                  </p>
                )}
              </div>

              {/* Observacao */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observacao (opcional)
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex: Ajuste de inventario"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Aviso de estoque insuficiente */}
              {modalTipo === 'saida' && quantidade > estoqueDisponivel && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">
                    Estoque insuficiente. Disponivel: {estoqueDisponivel}
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setModalAberto(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSalvar}
                disabled={
                  salvando ||
                  !produtoSelecionado ||
                  quantidade < 1 ||
                  (modalTipo === 'saida' && quantidade > estoqueDisponivel)
                }
                className={`flex-1 ${modalTipo === 'entrada' ? '' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
