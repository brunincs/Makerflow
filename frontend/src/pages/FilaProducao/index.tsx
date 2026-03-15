import { useState, useEffect, useMemo } from 'react';
import { Card, CardBody } from '../../components/ui';
import { Pedido, ProdutoConcorrente, ItemFilaProducao, EstoqueProduto, Filamento, ImpressoraModelo } from '../../types';
import { getPedidosPendentes, createPedido, deletePedido, marcarProduzido } from '../../services/pedidosService';
import { getEstoqueProdutos, adicionarEstoque, removerDoEstoque } from '../../services/estoqueProdutosService';
import { getProdutos } from '../../services/produtosService';
import { consumirFilamento, getFilamentos } from '../../services/filamentosService';
import {
  ClipboardList,
  Plus,
  Trash2,
  Check,
  Package,
  Clock,
  Cylinder,
  Loader2,
  X,
  Factory,
  ShoppingCart,
  Archive,
  CheckCircle2,
  ImageOff,
  Printer,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

// Impressoras disponíveis
const IMPRESSORAS: { id: ImpressoraModelo; nome: string }[] = [
  { id: 'a1_mini', nome: 'Bambu A1 Mini' },
  { id: 'a1', nome: 'Bambu A1' },
  { id: 'p1p', nome: 'Bambu P1P' },
  { id: 'p1s', nome: 'Bambu P1S' },
  { id: 'x1_carbon', nome: 'Bambu X1 Carbon' },
  { id: 'h2d', nome: 'Creality H2D' },
  { id: 'outra', nome: 'Outra' },
];

// Indicador de carga de produção
type CargaProducao = 'tranquila' | 'cheia' | 'critica';

function getCargaProducao(horasTotais: number): { tipo: CargaProducao; cor: string; bgCor: string; texto: string } {
  if (horasTotais <= 8) {
    return { tipo: 'tranquila', cor: 'text-green-600', bgCor: 'bg-green-100', texto: 'Producao tranquila' };
  } else if (horasTotais <= 16) {
    return { tipo: 'cheia', cor: 'text-yellow-600', bgCor: 'bg-yellow-100', texto: 'Producao cheia' };
  } else {
    return { tipo: 'critica', cor: 'text-red-600', bgCor: 'bg-red-100', texto: 'Producao critica' };
  }
}

function formatarTempo(horas: number): string {
  if (horas === 0) return '-';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function FilaProducao() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [estoque, setEstoque] = useState<EstoqueProduto[]>([]);
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Impressoras do usuário (salvas no localStorage)
  const [impressorasUsuario, setImpressorasUsuario] = useState<ImpressoraModelo[]>(() => {
    const saved = localStorage.getItem('makerflow_impressoras_usuario');
    return saved ? JSON.parse(saved) : [];
  });
  const [showImpressorasConfig, setShowImpressorasConfig] = useState(false);

  // Modal de novo pedido
  const [showModal, setShowModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  // Modal de marcar produzido
  const [showProduzidoModal, setShowProduzidoModal] = useState(false);
  const [itemParaProduzir, setItemParaProduzir] = useState<ItemFilaProducao | null>(null);
  const [qtdProduzida, setQtdProduzida] = useState<number>(1);
  const [filamentoId, setFilamentoId] = useState<string>('');
  const [produzindo, setProduzindo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [pedidosData, estoqueData, produtosData, filamentosData] = await Promise.all([
      getPedidosPendentes(),
      getEstoqueProdutos(),
      getProdutos(),
      getFilamentos(),
    ]);
    setPedidos(pedidosData);
    setEstoque(estoqueData);
    setProdutos(produtosData);
    setFilamentos(filamentosData);
    setLoading(false);
  };

  // Salvar impressoras do usuário no localStorage
  const handleSaveImpressoras = (impressoras: ImpressoraModelo[]) => {
    setImpressorasUsuario(impressoras);
    localStorage.setItem('makerflow_impressoras_usuario', JSON.stringify(impressoras));
    setShowImpressorasConfig(false);
  };

  // Calcular fila de produção
  const filaProducao = useMemo(() => {
    const mapa = new Map<string, ItemFilaProducao>();

    // Agrupar pedidos por produto/variação
    pedidos.forEach(pedido => {
      const key = `${pedido.produto_id}-${pedido.variacao_id || 'sem_variacao'}`;
      const qtdRestante = pedido.quantidade - (pedido.quantidade_produzida || 0);

      if (qtdRestante <= 0) return;

      if (mapa.has(key)) {
        const item = mapa.get(key)!;
        item.quantidade_pedida += qtdRestante;
        item.pedidos.push(pedido);
      } else {
        // Obter dados do produto/variação
        const peso = pedido.variacao?.peso_filamento || pedido.produto?.peso_filamento || 0;
        const tempo = pedido.variacao?.tempo_impressao || pedido.produto?.tempo_impressao || 0;

        mapa.set(key, {
          produto_id: pedido.produto_id,
          variacao_id: pedido.variacao_id,
          nome_produto: pedido.produto?.nome || 'Produto',
          nome_variacao: pedido.variacao?.nome_variacao,
          imagem_url: pedido.produto?.imagem_url,
          quantidade_pedida: qtdRestante,
          quantidade_estoque: 0,
          quantidade_produzir: qtdRestante,
          peso_por_peca: peso,
          tempo_por_peca: tempo,
          peso_total: 0,
          tempo_total: 0,
          pedidos: [pedido],
        });
      }
    });

    // Subtrair estoque
    mapa.forEach((item) => {
      const estoqueItem = estoque.find(e =>
        e.produto_id === item.produto_id &&
        (item.variacao_id ? e.variacao_id === item.variacao_id : !e.variacao_id)
      );

      if (estoqueItem) {
        item.quantidade_estoque = estoqueItem.quantidade;
        item.quantidade_produzir = Math.max(0, item.quantidade_pedida - estoqueItem.quantidade);
      }

      // Calcular totais
      item.peso_total = item.quantidade_produzir * item.peso_por_peca;
      item.tempo_total = item.quantidade_produzir * item.tempo_por_peca;
    });

    return Array.from(mapa.values()).filter(item => item.quantidade_produzir > 0);
  }, [pedidos, estoque]);

  // Totais
  const totais = useMemo(() => {
    return filaProducao.reduce(
      (acc, item) => ({
        pecas: acc.pecas + item.quantidade_produzir,
        peso: acc.peso + item.peso_total,
        tempo: acc.tempo + item.tempo_total,
      }),
      { pecas: 0, peso: 0, tempo: 0 }
    );
  }, [filaProducao]);

  // Indicador de carga de produção
  const cargaProducao = useMemo(() => {
    return getCargaProducao(totais.tempo);
  }, [totais.tempo]);

  // Variações do produto selecionado
  const variacoesProduto = useMemo(() => {
    if (!produtoSelecionado) return [];
    const produto = produtos.find(p => p.id === produtoSelecionado);
    return produto?.variacoes || [];
  }, [produtoSelecionado, produtos]);

  const handleAddPedido = async () => {
    if (!produtoSelecionado || quantidade < 1) return;

    setSaving(true);

    const resultado = await createPedido({
      produto_id: produtoSelecionado,
      variacao_id: variacaoSelecionada || null,
      quantidade,
      quantidade_produzida: 0,
      status: 'pendente',
    });

    if (resultado) {
      await loadData();
      setShowModal(false);
      setProdutoSelecionado('');
      setVariacaoSelecionada('');
      setQuantidade(1);
    }

    setSaving(false);
  };

  const handleDeletePedido = async (id: string) => {
    if (!confirm('Excluir este pedido?')) return;

    const success = await deletePedido(id);
    if (success) {
      await loadData();
    }
  };

  const handleAbrirProduzir = (item: ItemFilaProducao) => {
    setItemParaProduzir(item);
    setQtdProduzida(item.quantidade_produzir);
    setFilamentoId('');
    setShowProduzidoModal(true);
  };

  const handleMarcarProduzido = async () => {
    if (!itemParaProduzir || qtdProduzida < 1) return;

    setProduzindo(true);

    try {
      // 1. Marcar pedidos como produzidos (distribuir quantidade entre pedidos)
      let qtdRestante = qtdProduzida;
      for (const pedido of itemParaProduzir.pedidos) {
        if (qtdRestante <= 0) break;

        const qtdPedidoRestante = pedido.quantidade - (pedido.quantidade_produzida || 0);
        const qtdParaMarcar = Math.min(qtdRestante, qtdPedidoRestante);

        if (qtdParaMarcar > 0) {
          await marcarProduzido(pedido.id!, qtdParaMarcar);
          qtdRestante -= qtdParaMarcar;
        }
      }

      // 2. Adicionar ao estoque de produtos
      await adicionarEstoque(
        itemParaProduzir.produto_id,
        itemParaProduzir.variacao_id || null,
        qtdProduzida
      );

      // 3. Consumir filamento (se selecionado)
      if (filamentoId && itemParaProduzir.peso_por_peca > 0) {
        const pesoTotal = qtdProduzida * itemParaProduzir.peso_por_peca;
        await consumirFilamento(filamentoId, pesoTotal);
      }

      // 4. Usar estoque para atender pedidos (subtrair do estoque)
      const qtdParaEntregar = Math.min(qtdProduzida, itemParaProduzir.quantidade_pedida);
      if (qtdParaEntregar > 0) {
        await removerDoEstoque(
          itemParaProduzir.produto_id,
          itemParaProduzir.variacao_id || null,
          qtdParaEntregar
        );
      }

      await loadData();
      setShowProduzidoModal(false);
      setItemParaProduzir(null);
    } catch (error) {
      console.error('Erro ao marcar produzido:', error);
      alert('Erro ao processar produção. Tente novamente.');
    }

    setProduzindo(false);
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
            </div>
            Fila de Producao
          </h1>
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
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-indigo-600" />
            </div>
            Fila de Producao
          </h1>
          <p className="text-gray-500 mt-2">
            Gerencie pedidos e saiba o que precisa produzir
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </button>
      </div>

      {/* Indicador de Carga + Resumo */}
      {filaProducao.length > 0 && (
        <>
          {/* Indicador de Carga */}
          <Card className="mb-4">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 ${cargaProducao.bgCor} rounded-lg`}>
                    {cargaProducao.tipo === 'tranquila' ? (
                      <TrendingUp className={`w-5 h-5 ${cargaProducao.cor}`} />
                    ) : cargaProducao.tipo === 'cheia' ? (
                      <Clock className={`w-5 h-5 ${cargaProducao.cor}`} />
                    ) : (
                      <AlertTriangle className={`w-5 h-5 ${cargaProducao.cor}`} />
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${cargaProducao.cor}`}>
                      {cargaProducao.texto}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatarTempo(totais.tempo)} de producao pendente
                    </p>
                  </div>
                </div>

                {/* Botão de configurar impressoras */}
                <button
                  onClick={() => setShowImpressorasConfig(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  {impressorasUsuario.length > 0
                    ? `${impressorasUsuario.length} impressora${impressorasUsuario.length > 1 ? 's' : ''}`
                    : 'Configurar impressoras'}
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Cards de resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pecas para produzir</p>
                    <p className="text-2xl font-bold text-gray-900">{totais.pecas}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Cylinder className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Filamento necessario</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totais.peso >= 1000
                        ? `${(totais.peso / 1000).toFixed(2)}kg`
                        : `${totais.peso.toFixed(0)}g`}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tempo total estimado</p>
                    <p className="text-2xl font-bold text-gray-900">{formatarTempo(totais.tempo)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Distribuição por Impressora (se tiver mais de 1) */}
          {impressorasUsuario.length > 1 && (
            <Card className="mb-6">
              <CardBody className="p-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Printer className="w-4 h-4" />
                  Distribuicao por Impressora
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {impressorasUsuario.map((impId, idx) => {
                    const impressora = IMPRESSORAS.find(i => i.id === impId);
                    // Distribuir itens igualmente entre impressoras
                    const itensParaImpressora = filaProducao.filter((_, i) => i % impressorasUsuario.length === idx);
                    const tempoImpressora = itensParaImpressora.reduce((acc, item) => acc + item.tempo_total, 0);
                    const pesoImpressora = itensParaImpressora.reduce((acc, item) => acc + item.peso_total, 0);

                    return (
                      <div
                        key={impId}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Printer className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-gray-900">{impressora?.nome || impId}</span>
                        </div>
                        {itensParaImpressora.length === 0 ? (
                          <p className="text-sm text-gray-400">Nenhum item</p>
                        ) : (
                          <>
                            <div className="space-y-1 mb-3">
                              {itensParaImpressora.map(item => (
                                <div key={`${item.produto_id}-${item.variacao_id}`} className="text-sm">
                                  <span className="text-gray-700">{item.nome_produto}</span>
                                  {item.nome_variacao && (
                                    <span className="text-gray-400"> ({item.nome_variacao})</span>
                                  )}
                                  <span className="text-indigo-600 font-medium"> x{item.quantidade_produzir}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-200">
                              <span>{formatarTempo(tempoImpressora)}</span>
                              <span>{pesoImpressora.toFixed(0)}g</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  * Distribuicao automatica. Os itens sao divididos igualmente entre as impressoras.
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Fila de Produção */}
      {filaProducao.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma producao pendente
            </h3>
            <p className="text-gray-500 mb-4">
              Adicione pedidos para ver o que precisa produzir.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Pedido
            </button>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Itens para Produzir
              </h3>
            </div>

            <div className="divide-y divide-gray-100">
              {filaProducao.map((item) => (
                <div
                  key={`${item.produto_id}-${item.variacao_id || 'sem'}`}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Imagem */}
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {item.imagem_url ? (
                        <img
                          src={item.imagem_url}
                          alt={item.nome_produto}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {item.nome_produto}
                      </h4>
                      {item.nome_variacao && (
                        <p className="text-sm text-indigo-600 font-medium">{item.nome_variacao}</p>
                      )}

                      {/* Cálculo: Vendidos - Estoque = Produzir */}
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span className="font-medium">{item.quantidade_pedida}</span>
                          <span className="text-gray-400">vendidos</span>
                        </span>
                        <span className="text-gray-400">-</span>
                        <span className="flex items-center gap-1 text-green-600">
                          <Archive className="w-3.5 h-3.5" />
                          <span className="font-medium">{item.quantidade_estoque}</span>
                          <span className="text-green-500">em estoque</span>
                        </span>
                        <span className="text-gray-400">=</span>
                        <span className="flex items-center gap-1 text-indigo-600 font-bold">
                          {item.quantidade_produzir} para produzir
                        </span>
                      </div>

                      {/* Detalhes de tempo e filamento */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Cylinder className="w-3 h-3" />
                          {item.peso_por_peca}g/peca
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatarTempo(item.tempo_por_peca)}/peca
                        </span>
                      </div>
                    </div>

                    {/* Resumo de produção */}
                    <div className="hidden md:flex flex-col items-end gap-2 min-w-[140px]">
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">{item.peso_total.toFixed(0)}g</p>
                        <p className="text-xs text-gray-400">filamento total</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">{formatarTempo(item.tempo_total)}</p>
                        <p className="text-xs text-gray-400">tempo total</p>
                      </div>
                    </div>

                    {/* Ação */}
                    <button
                      onClick={() => handleAbrirProduzir(item)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Marcar Produzido
                    </button>
                  </div>

                  {/* Mobile: detalhes extras */}
                  <div className="md:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
                    <span className="text-purple-600 font-medium">{item.peso_total.toFixed(0)}g filamento</span>
                    <span className="text-blue-600 font-medium">{formatarTempo(item.tempo_total)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Lista de Pedidos */}
      {pedidos.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Pedidos Recentes
          </h3>
          <Card>
            <CardBody className="p-0">
              <div className="divide-y divide-gray-100">
                {pedidos.slice(0, 10).map((pedido) => (
                  <div
                    key={pedido.id}
                    className="p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {pedido.produto?.imagem_url ? (
                          <img
                            src={pedido.produto.imagem_url}
                            alt={pedido.produto?.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageOff className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {pedido.produto?.nome || 'Produto'}
                          {pedido.variacao?.nome_variacao && (
                            <span className="text-gray-500 font-normal">
                              {' '}({pedido.variacao.nome_variacao})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {pedido.quantidade_produzida || 0} / {pedido.quantidade} produzidos
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        pedido.status === 'concluido'
                          ? 'bg-green-100 text-green-700'
                          : pedido.status === 'em_producao'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {pedido.status === 'concluido' ? 'Concluido' :
                         pedido.status === 'em_producao' ? 'Em producao' : 'Pendente'}
                      </span>

                      <button
                        onClick={() => handleDeletePedido(pedido.id!)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Modal Novo Pedido */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Novo Pedido</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Produto
                </label>
                <select
                  value={produtoSelecionado}
                  onChange={(e) => {
                    setProdutoSelecionado(e.target.value);
                    setVariacaoSelecionada('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione um produto...</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Variação */}
              {variacoesProduto.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variacao (opcional)
                  </label>
                  <select
                    value={variacaoSelecionada}
                    onChange={(e) => setVariacaoSelecionada(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Sem variacao</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade vendida
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPedido}
                disabled={!produtoSelecionado || quantidade < 1 || saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Marcar Produzido */}
      {showProduzidoModal && itemParaProduzir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Marcar Producao</h3>
              <button
                onClick={() => setShowProduzidoModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Info do produto */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                  {itemParaProduzir.imagem_url ? (
                    <img
                      src={itemParaProduzir.imagem_url}
                      alt={itemParaProduzir.nome_produto}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageOff className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {itemParaProduzir.nome_produto}
                  </p>
                  {itemParaProduzir.nome_variacao && (
                    <p className="text-sm text-indigo-600">{itemParaProduzir.nome_variacao}</p>
                  )}
                </div>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade produzida
                </label>
                <input
                  type="number"
                  min="1"
                  max={itemParaProduzir.quantidade_produzir}
                  value={qtdProduzida}
                  onChange={(e) => setQtdProduzida(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximo: {itemParaProduzir.quantidade_produzir} pecas
                </p>
              </div>

              {/* Selecionar filamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filamento utilizado (opcional)
                </label>
                <select
                  value={filamentoId}
                  onChange={(e) => setFilamentoId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Nao descontar filamento</option>
                  {filamentos.map((fil) => (
                    <option key={fil.id} value={fil.id}>
                      {fil.marca} {fil.nome_filamento} - {fil.cor} ({(fil.estoque_gramas / 1000).toFixed(2)}kg em estoque)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Selecione para descontar automaticamente do estoque de filamento
                </p>
              </div>

              {/* Resumo */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <div className="flex justify-between text-sm text-green-800">
                  <span>Pecas produzidas:</span>
                  <span className="font-bold">{qtdProduzida}</span>
                </div>
                <div className="flex justify-between text-sm text-green-800">
                  <span>Filamento utilizado:</span>
                  <span className="font-bold">{(qtdProduzida * itemParaProduzir.peso_por_peca).toFixed(0)}g</span>
                </div>
                <div className="flex justify-between text-sm text-green-800">
                  <span>Tempo de impressao:</span>
                  <span className="font-bold">{formatarTempo(qtdProduzida * itemParaProduzir.tempo_por_peca)}</span>
                </div>
              </div>

              {/* O que vai acontecer */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Ao confirmar:</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Pedidos serao atualizados como produzidos</li>
                  <li>• +{qtdProduzida} unidades adicionadas ao estoque</li>
                  {filamentoId && (
                    <li>• -{(qtdProduzida * itemParaProduzir.peso_por_peca).toFixed(0)}g descontados do filamento</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
              <button
                onClick={() => setShowProduzidoModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleMarcarProduzido}
                disabled={qtdProduzida < 1 || produzindo}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {produzindo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirmar Producao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar Impressoras */}
      {showImpressorasConfig && (
        <ModalImpressoras
          impressorasSelecionadas={impressorasUsuario}
          onSave={handleSaveImpressoras}
          onClose={() => setShowImpressorasConfig(false)}
        />
      )}
    </div>
  );
}

// Componente Modal de Impressoras
function ModalImpressoras({
  impressorasSelecionadas,
  onSave,
  onClose,
}: {
  impressorasSelecionadas: ImpressoraModelo[];
  onSave: (impressoras: ImpressoraModelo[]) => void;
  onClose: () => void;
}) {
  const [selecionadas, setSelecionadas] = useState<ImpressoraModelo[]>(impressorasSelecionadas);

  const toggleImpressora = (id: ImpressoraModelo) => {
    if (selecionadas.includes(id)) {
      setSelecionadas(selecionadas.filter(i => i !== id));
    } else {
      setSelecionadas([...selecionadas, id]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Minhas Impressoras</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-gray-500 mb-4">
            Selecione as impressoras que voce possui para organizar sua producao:
          </p>

          <div className="space-y-2">
            {IMPRESSORAS.map((imp) => (
              <label
                key={imp.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selecionadas.includes(imp.id)
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(imp.id)}
                  onChange={() => toggleImpressora(imp.id)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <Printer className={`w-5 h-5 ${
                  selecionadas.includes(imp.id) ? 'text-indigo-600' : 'text-gray-400'
                }`} />
                <span className={`font-medium ${
                  selecionadas.includes(imp.id) ? 'text-indigo-900' : 'text-gray-700'
                }`}>
                  {imp.nome}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(selecionadas)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
