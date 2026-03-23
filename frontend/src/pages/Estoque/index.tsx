import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody } from '../../components/ui';
import { EstoqueProduto, EstoqueMovimentacao, ProdutoConcorrente } from '../../types';
import {
  getEstoqueProdutos,
  getMovimentacoes,
  adicionarEstoqueComMovimentacao,
  removerEstoqueComMovimentacao,
} from '../../services/estoqueProdutosService';
import { getProdutos } from '../../services/produtosService';
import {
  Package,
  History,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Layers,
  Loader2,
  BoxIcon,
  Info,
  Plus,
  Minus,
  X,
  PenLine
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
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);

  // Aba atual
  const [abaAtiva, setAbaAtiva] = useState<'estoque' | 'historico'>('estoque');

  // Modal de ajuste manual
  const [showModal, setShowModal] = useState(false);
  const [ajusteTipo, setAjusteTipo] = useState<'entrada' | 'saida'>('entrada');
  const [ajusteProdutoId, setAjusteProdutoId] = useState('');
  const [ajusteVariacaoId, setAjusteVariacaoId] = useState('');
  const [ajusteQuantidade, setAjusteQuantidade] = useState(1);
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [salvandoAjuste, setSalvandoAjuste] = useState(false);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    const [estoqueData, movData, produtosData] = await Promise.all([
      getEstoqueProdutos(),
      getMovimentacoes(100),
      getProdutos(),
    ]);
    // Filtrar apenas produtos com quantidade > 0
    setEstoque(estoqueData.filter(e => e.quantidade > 0));
    setMovimentacoes(movData);
    setProdutos(produtosData);
    setLoading(false);
  }, []);

  // Abrir modal de ajuste
  const abrirModalAjuste = () => {
    setAjusteTipo('entrada');
    setAjusteProdutoId('');
    setAjusteVariacaoId('');
    setAjusteQuantidade(1);
    setAjusteMotivo('');
    setShowModal(true);
  };

  // Salvar ajuste manual
  const salvarAjuste = async () => {
    if (!ajusteProdutoId || ajusteQuantidade <= 0 || !ajusteMotivo.trim()) {
      alert('Preencha todos os campos obrigatorios');
      return;
    }

    setSalvandoAjuste(true);

    const variacaoId = ajusteVariacaoId || null;
    const motivo = `Ajuste manual: ${ajusteMotivo.trim()}`;

    let resultado;
    if (ajusteTipo === 'entrada') {
      resultado = await adicionarEstoqueComMovimentacao(
        ajusteProdutoId,
        variacaoId,
        ajusteQuantidade,
        'ajuste',
        motivo
      );
    } else {
      resultado = await removerEstoqueComMovimentacao(
        ajusteProdutoId,
        variacaoId,
        ajusteQuantidade,
        'ajuste',
        motivo
      );
    }

    setSalvandoAjuste(false);

    if (resultado) {
      setShowModal(false);
      carregarDados();
    } else {
      if (ajusteTipo === 'saida') {
        alert('Estoque insuficiente para esta saida');
      } else {
        alert('Erro ao registrar ajuste');
      }
    }
  };

  // Obter variações do produto selecionado
  const produtoSelecionado = produtos.find(p => p.id === ajusteProdutoId);
  const variacoesProduto = produtoSelecionado?.variacoes || [];

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Agrupar estoque por produto (apenas com quantidade > 0)
  const estoqueAgrupado: ProdutoAgrupado[] = (() => {
    const mapa = new Map<string, ProdutoAgrupado>();

    estoque.forEach(item => {
      if (item.quantidade <= 0) return; // Ignorar itens sem estoque

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <BoxIcon className="w-6 h-6 text-emerald-600" />
            </div>
            Estoque de Produtos
          </h1>
          <p className="text-gray-500 mt-2">
            Produtos prontos em estoque (gerado automaticamente via impressoes)
          </p>
        </div>

        <button
          onClick={abrirModalAjuste}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <PenLine className="w-4 h-4" />
          Ajuste Manual
        </button>
      </div>

      {/* Info Box */}
      <div className="mb-6 bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">Como funciona o estoque</p>
            <ul className="text-sm text-gray-400 mt-1 space-y-1">
              <li>• <strong className="text-gray-300">Entrada:</strong> Automatica ao registrar uma impressao</li>
              <li>• <strong className="text-gray-300">Saida:</strong> Automatica ao criar um pedido (ML, Shopee ou manual)</li>
              <li>• Se houver estoque, o pedido consome automaticamente</li>
              <li>• Se nao houver, o pedido vai para a fila de producao</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="mb-6 border-b border-gray-700">
        <nav className="-mb-px flex gap-4">
          <button
            onClick={() => setAbaAtiva('estoque')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              abaAtiva === 'estoque'
                ? 'border-emerald-500 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
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
                : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-600'
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
          {estoqueAgrupado.length > 0 && (
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produto..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Lista de Estoque */}
          {estoqueFiltrado.length === 0 ? (
            <Card>
              <CardBody className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {busca ? 'Nenhum produto encontrado' : 'Nenhum produto em estoque'}
                </h3>
                <p className="text-gray-500">
                  {busca
                    ? 'Tente buscar por outro termo'
                    : 'O estoque sera preenchido automaticamente ao registrar impressoes'}
                </p>
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
                        <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-8 h-8 text-gray-300" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-white">{grupo.nome}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-emerald-600">
                              {grupo.total}
                            </span>
                            <span className="text-sm text-gray-500">un</span>
                          </div>
                        </div>

                        {/* Variacoes */}
                        {grupo.itens.length > 1 || grupo.itens[0]?.variacao_id ? (
                          <div className="space-y-1">
                            {grupo.itens.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <span className="text-gray-600 flex items-center gap-1">
                                  <Layers className="w-3 h-3" />
                                  {item.variacao?.nome_variacao || 'Padrao'}
                                </span>
                                <span className="font-medium text-emerald-600">
                                  {item.quantidade} un
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
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
                <h3 className="text-lg font-medium text-white mb-2">
                  Nenhuma movimentacao
                </h3>
                <p className="text-gray-500">
                  O historico aparecera aqui quando houver entradas ou saidas
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {movimentacoes.map((mov) => (
                  <div key={mov.id} className="p-4 flex items-center gap-4 hover:bg-gray-800/50">
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
                      <p className="font-medium text-white">
                        {mov.produto?.nome || 'Produto removido'}
                        {mov.variacao?.nome_variacao && (
                          <span className="text-purple-600 ml-1">
                            ({mov.variacao.nome_variacao})
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {mov.origem === 'producao' && 'Via impressao'}
                        {mov.origem === 'venda' && 'Pedido/Venda'}
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

      {/* Modal de Ajuste Manual */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <PenLine className="w-5 h-5 text-emerald-600" />
                Ajuste Manual de Estoque
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Tipo de Ajuste */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tipo de Ajuste
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAjusteTipo('entrada')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      ajusteTipo === 'entrada'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-700 hover:border-gray-600 text-gray-600'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setAjusteTipo('saida')}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      ajusteTipo === 'saida'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-700 hover:border-gray-600 text-gray-600'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    Saida
                  </button>
                </div>
              </div>

              {/* Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Produto *
                </label>
                <select
                  value={ajusteProdutoId}
                  onChange={(e) => {
                    setAjusteProdutoId(e.target.value);
                    setAjusteVariacaoId('');
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variacao (se houver) */}
              {variacoesProduto.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Variacao
                  </label>
                  <select
                    value={ajusteVariacaoId}
                    onChange={(e) => setAjusteVariacaoId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">Produto base (sem variacao)</option>
                    {variacoesProduto.map((variacao) => (
                      <option key={variacao.id} value={variacao.id}>
                        {variacao.nome_variacao}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantidade */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quantidade *
                </label>
                <input
                  type="number"
                  min="1"
                  value={ajusteQuantidade}
                  onChange={(e) => setAjusteQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Motivo (obrigatorio) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Motivo do Ajuste *
                </label>
                <textarea
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  placeholder="Ex: Correcao de inventario, peca danificada, devolucao..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
                    resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Obrigatorio informar o motivo do ajuste
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAjuste}
                disabled={salvandoAjuste || !ajusteProdutoId || !ajusteMotivo.trim()}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors ${
                  ajusteTipo === 'entrada'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {salvandoAjuste ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    {ajusteTipo === 'entrada' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {ajusteTipo === 'entrada' ? 'Adicionar ao Estoque' : 'Remover do Estoque'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
