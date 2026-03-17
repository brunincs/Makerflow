import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody } from '../../components/ui';
import { EstoqueProduto, EstoqueMovimentacao } from '../../types';
import {
  getEstoqueProdutos,
  getMovimentacoes,
} from '../../services/estoqueProdutosService';
import {
  Package,
  History,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Layers,
  Loader2,
  BoxIcon,
  Info
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

  // Aba atual
  const [abaAtiva, setAbaAtiva] = useState<'estoque' | 'historico'>('estoque');

  const carregarDados = useCallback(async () => {
    setLoading(true);
    const [estoqueData, movData] = await Promise.all([
      getEstoqueProdutos(),
      getMovimentacoes(100),
    ]);
    // Filtrar apenas produtos com quantidade > 0
    setEstoque(estoqueData.filter(e => e.quantidade > 0));
    setMovimentacoes(movData);
    setLoading(false);
  }, []);

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <BoxIcon className="w-6 h-6 text-emerald-600" />
          </div>
          Estoque de Produtos
        </h1>
        <p className="text-gray-500 mt-2">
          Produtos prontos em estoque (gerado automaticamente via impressoes)
        </p>
      </div>

      {/* Info Box */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Como funciona o estoque</p>
            <ul className="text-sm text-blue-700 mt-1 space-y-1">
              <li>• <strong>Entrada:</strong> Automatica ao registrar uma impressao</li>
              <li>• <strong>Saida:</strong> Automatica ao criar um pedido (ML, Shopee ou manual)</li>
              <li>• Se houver estoque, o pedido consome automaticamente</li>
              <li>• Se nao houver, o pedido vai para a fila de producao</li>
            </ul>
          </div>
        </div>
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
          {estoqueAgrupado.length > 0 && (
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
          )}

          {/* Lista de Estoque */}
          {estoqueFiltrado.length === 0 ? (
            <Card>
              <CardBody className="p-12 text-center">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
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
    </div>
  );
}
