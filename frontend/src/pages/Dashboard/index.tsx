import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui';
import { getProdutos } from '../../services/produtosService';
import { getPedidosPendentes } from '../../services/pedidosService';
import { getEstoqueProdutos } from '../../services/estoqueProdutosService';
import { getFilamentos } from '../../services/filamentosService';
import { getPrecificacoes } from '../../services/precificacoesService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { ProdutoConcorrente, Pedido, EstoqueProduto, Filamento, PrecificacaoSalva } from '../../types';
import {
  Package,
  AlertCircle,
  Clock,
  Cylinder,
  DollarSign,
  ShoppingCart,
  Plus,
  Printer,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  Loader2,
  ArrowRight,
  Factory,
} from 'lucide-react';

// Formatar tempo
function formatarTempo(horas: number): string {
  if (horas === 0) return '-';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}min`;
}

// Formatar moeda
function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Interface para item da fila calculado
interface ItemFila {
  produto_id: string;
  variacao_id?: string | null;
  nome_produto: string;
  nome_variacao?: string;
  imagem_url?: string;
  quantidade_pedida: number;
  quantidade_estoque: number;
  quantidade_produzir: number;
  quantidade_produzida: number;
  peso_por_peca: number;
  tempo_por_peca: number;
  peso_total: number;
  tempo_total: number;
}

export function Dashboard() {
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [estoque, setEstoque] = useState<EstoqueProduto[]>([]);
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [precificacoes, setPrecificacoes] = useState<PrecificacaoSalva[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [produtosData, pedidosData, estoqueData, filamentosData, precificacoesData] = await Promise.all([
      getProdutos(),
      getPedidosPendentes(),
      getEstoqueProdutos(),
      getFilamentos(),
      getPrecificacoes(),
    ]);
    setProdutos(produtosData);
    setPedidos(pedidosData);
    setEstoque(estoqueData);
    setFilamentos(filamentosData);
    setPrecificacoes(precificacoesData);
    setLoading(false);
  };

  // Calcular fila de produção
  const filaProducao = useMemo(() => {
    const mapa = new Map<string, ItemFila>();

    pedidos.forEach(pedido => {
      const key = `${pedido.produto_id}-${pedido.variacao_id || 'sem_variacao'}`;
      const qtdRestante = pedido.quantidade - (pedido.quantidade_produzida || 0);

      if (qtdRestante <= 0) return;

      if (mapa.has(key)) {
        const item = mapa.get(key)!;
        item.quantidade_pedida += pedido.quantidade;
        item.quantidade_produzida += (pedido.quantidade_produzida || 0);
      } else {
        const peso = pedido.variacao?.peso_filamento || pedido.produto?.peso_filamento || 0;
        const tempo = pedido.variacao?.tempo_impressao || pedido.produto?.tempo_impressao || 0;

        mapa.set(key, {
          produto_id: pedido.produto_id,
          variacao_id: pedido.variacao_id,
          nome_produto: pedido.produto?.nome || 'Produto',
          nome_variacao: pedido.variacao?.nome_variacao,
          imagem_url: pedido.produto?.imagem_url,
          quantidade_pedida: pedido.quantidade,
          quantidade_estoque: 0,
          quantidade_produzir: qtdRestante,
          quantidade_produzida: pedido.quantidade_produzida || 0,
          peso_por_peca: peso,
          tempo_por_peca: tempo,
          peso_total: 0,
          tempo_total: 0,
        });
      }
    });

    // Subtrair estoque e calcular totais
    mapa.forEach((item) => {
      const estoqueItem = estoque.find(e =>
        e.produto_id === item.produto_id &&
        (item.variacao_id ? e.variacao_id === item.variacao_id : !e.variacao_id)
      );

      if (estoqueItem) {
        item.quantidade_estoque = estoqueItem.quantidade;
        item.quantidade_produzir = Math.max(0, item.quantidade_pedida - item.quantidade_produzida - estoqueItem.quantidade);
      } else {
        item.quantidade_produzir = Math.max(0, item.quantidade_pedida - item.quantidade_produzida);
      }

      item.peso_total = item.quantidade_produzir * item.peso_por_peca;
      item.tempo_total = item.quantidade_produzir * item.tempo_por_peca;
    });

    return Array.from(mapa.values()).filter(item => item.quantidade_produzir > 0);
  }, [pedidos, estoque]);

  // Totais da fila
  const totais = useMemo(() => {
    return filaProducao.reduce(
      (acc, item) => ({
        pedidos: acc.pedidos + item.quantidade_pedida,
        pecas: acc.pecas + item.quantidade_produzir,
        peso: acc.peso + item.peso_total,
        tempo: acc.tempo + item.tempo_total,
      }),
      { pedidos: 0, pecas: 0, peso: 0, tempo: 0 }
    );
  }, [filaProducao]);

  // Calcular lucro estimado baseado nas precificações
  const lucroEstimado = useMemo(() => {
    let receita = 0;
    let lucro = 0;

    filaProducao.forEach(item => {
      // Buscar precificação do produto
      const prec = precificacoes.find(p => p.produto_id === item.produto_id);
      if (prec) {
        receita += prec.preco_venda * item.quantidade_produzir;
        lucro += prec.lucro_liquido * item.quantidade_produzir;
      }
    });

    return { receita, lucro };
  }, [filaProducao, precificacoes]);

  // Produtos mais vendidos (baseado nos pedidos)
  const produtosMaisVendidos = useMemo(() => {
    const contagem = new Map<string, { nome: string; imagem_url?: string; quantidade: number }>();

    pedidos.forEach(pedido => {
      const key = pedido.produto_id;
      if (contagem.has(key)) {
        contagem.get(key)!.quantidade += pedido.quantidade;
      } else {
        contagem.set(key, {
          nome: pedido.produto?.nome || 'Produto',
          imagem_url: pedido.produto?.imagem_url,
          quantidade: pedido.quantidade,
        });
      }
    });

    return Array.from(contagem.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [pedidos]);

  // Consumo de filamento necessário (agrupado por tipo/cor)
  // Como não temos filamento_id nos produtos, vamos mostrar total necessário
  const consumoFilamento = useMemo(() => {
    const totalNecessario = totais.peso;
    const totalEmEstoque = filamentos.reduce((acc, f) => acc + f.estoque_gramas, 0);
    const suficiente = totalEmEstoque >= totalNecessario;

    return {
      necessario: totalNecessario,
      emEstoque: totalEmEstoque,
      suficiente,
      filamentos: filamentos.slice(0, 5),
    };
  }, [totais.peso, filamentos]);

  // Status da produção (itens em andamento)
  const statusProducao = useMemo(() => {
    const itens: { nome: string; variacao?: string; produzidos: number; total: number; percentual: number }[] = [];

    pedidos.forEach(pedido => {
      const produzidos = pedido.quantidade_produzida || 0;
      const total = pedido.quantidade;
      if (total > 0) {
        // Agrupar por produto+variação
        const key = `${pedido.produto?.nome || 'Produto'}${pedido.variacao?.nome_variacao ? ` (${pedido.variacao.nome_variacao})` : ''}`;
        const existing = itens.find(i => i.nome === key);
        if (existing) {
          existing.produzidos += produzidos;
          existing.total += total;
          existing.percentual = Math.round((existing.produzidos / existing.total) * 100);
        } else {
          itens.push({
            nome: pedido.produto?.nome || 'Produto',
            variacao: pedido.variacao?.nome_variacao,
            produzidos,
            total,
            percentual: Math.round((produzidos / total) * 100),
          });
        }
      }
    });

    return itens.slice(0, 5);
  }, [pedidos]);

  // Indicador de carga
  const cargaProducao = useMemo(() => {
    const horas = totais.tempo;
    if (horas <= 8) {
      return { cor: 'text-green-600', bgCor: 'bg-green-100', texto: 'Producao tranquila' };
    } else if (horas <= 16) {
      return { cor: 'text-yellow-600', bgCor: 'bg-yellow-100', texto: 'Producao cheia' };
    } else {
      return { cor: 'text-red-600', bgCor: 'bg-red-100', texto: 'Producao critica' };
    }
  }, [totais.tempo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel de Operacao</h1>
          <p className="text-gray-500 mt-1">
            Visao geral da sua producao de impressao 3D
          </p>
        </div>

        {/* Atalhos Rápidos */}
        <div className="flex items-center gap-2">
          <Link
            to="/fila-producao"
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            Ver Fila
          </Link>
          <Link
            to="/impressoes"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            Registrar Impressao
          </Link>
          <Link
            to="/fila-producao"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </Link>
        </div>
      </div>

      {!isSupabaseConfigured() && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Supabase nao configurado
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Os dados estao sendo salvos localmente.
            </p>
          </div>
        </div>
      )}

      {/* Indicador de Carga */}
      {filaProducao.length > 0 && (
        <div className={`mb-6 p-4 ${cargaProducao.bgCor} rounded-lg flex items-center gap-3`}>
          {totais.tempo <= 8 ? (
            <TrendingUp className={`w-5 h-5 ${cargaProducao.cor}`} />
          ) : totais.tempo <= 16 ? (
            <Clock className={`w-5 h-5 ${cargaProducao.cor}`} />
          ) : (
            <AlertTriangle className={`w-5 h-5 ${cargaProducao.cor}`} />
          )}
          <span className={`font-semibold ${cargaProducao.cor}`}>
            {cargaProducao.texto}
          </span>
          <span className="text-gray-600">
            - {formatarTempo(totais.tempo)} de producao pendente
          </span>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pedidos na fila</p>
                <p className="text-2xl font-bold text-gray-900">{pedidos.length}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Package className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pecas a produzir</p>
                <p className="text-2xl font-bold text-gray-900">{totais.pecas}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Tempo de producao</p>
                <p className="text-2xl font-bold text-gray-900">{formatarTempo(totais.tempo)}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Cylinder className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Filamento</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totais.peso >= 1000 ? `${(totais.peso / 1000).toFixed(1)}kg` : `${totais.peso.toFixed(0)}g`}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Lucro estimado</p>
                <p className="text-2xl font-bold text-green-600">
                  {lucroEstimado.lucro > 0 ? formatarMoeda(lucroEstimado.lucro) : '-'}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Produção do Dia */}
        <Card className="lg:col-span-2">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Factory className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Producao do Dia
                </h2>
              </div>
              <Link
                to="/fila-producao"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Ver tudo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {filaProducao.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <p className="text-gray-500">Nenhuma producao pendente!</p>
                <Link
                  to="/fila-producao"
                  className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                >
                  Adicionar pedido
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filaProducao.slice(0, 5).map((item, idx) => (
                  <div
                    key={`${item.produto_id}-${item.variacao_id || idx}`}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-indigo-600">{idx + 1}</span>
                    </div>
                    {item.imagem_url ? (
                      <img
                        src={item.imagem_url}
                        alt={item.nome_produto}
                        className="w-10 h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.nome_produto}
                        {item.nome_variacao && (
                          <span className="text-gray-500 font-normal"> ({item.nome_variacao})</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-semibold text-indigo-600">{item.quantidade_produzir} pecas</span>
                        <span>{formatarTempo(item.tempo_por_peca)}/peca</span>
                        <span className="text-blue-600 font-medium">{formatarTempo(item.tempo_total)} total</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Produtos Mais Vendidos */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Mais Vendidos
              </h2>
            </div>

            {produtosMaisVendidos.length === 0 ? (
              <p className="text-gray-500 text-center py-6">
                Nenhum pedido ainda
              </p>
            ) : (
              <div className="space-y-3">
                {produtosMaisVendidos.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      idx === 0 ? 'bg-yellow-100' : idx === 1 ? 'bg-gray-200' : idx === 2 ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-xs font-bold ${
                        idx === 0 ? 'text-yellow-600' : idx === 1 ? 'text-gray-500' : idx === 2 ? 'text-orange-600' : 'text-gray-400'
                      }`}>
                        {idx + 1}
                      </span>
                    </div>
                    {item.imagem_url ? (
                      <img
                        src={item.imagem_url}
                        alt={item.nome}
                        className="w-8 h-8 rounded object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.nome}</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-600">{item.quantidade}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Segunda linha */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status da Produção */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Status da Producao
              </h2>
            </div>

            {statusProducao.length === 0 ? (
              <p className="text-gray-500 text-center py-6">
                Nenhum item em producao
              </p>
            ) : (
              <div className="space-y-4">
                {statusProducao.map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">
                        {item.nome}
                        {item.variacao && <span className="text-gray-400"> ({item.variacao})</span>}
                      </span>
                      <span className="text-sm text-gray-500">
                        {item.produzidos}/{item.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          item.percentual === 100 ? 'bg-green-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${item.percentual}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Consumo de Filamento */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <Cylinder className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Consumo de Filamento
              </h2>
            </div>

            <div className="space-y-4">
              {/* Resumo */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">Necessario:</span>
                  <span className="font-bold text-gray-900">
                    {consumoFilamento.necessario >= 1000
                      ? `${(consumoFilamento.necessario / 1000).toFixed(2)}kg`
                      : `${consumoFilamento.necessario.toFixed(0)}g`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Em estoque:</span>
                  <span className="font-bold text-gray-900">
                    {(consumoFilamento.emEstoque / 1000).toFixed(2)}kg
                  </span>
                </div>
              </div>

              {/* Alerta se insuficiente */}
              {!consumoFilamento.suficiente && consumoFilamento.necessario > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700 font-medium">
                    Filamento insuficiente
                  </span>
                </div>
              )}

              {/* Lista de filamentos */}
              {consumoFilamento.filamentos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Seu estoque:</p>
                  {consumoFilamento.filamentos.map((fil) => (
                    <div key={fil.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{fil.nome_filamento} {fil.cor}</span>
                      <span className="font-medium">{(fil.estoque_gramas / 1000).toFixed(2)}kg</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Lucro Estimado */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Lucro Estimado
              </h2>
            </div>

            {lucroEstimado.receita === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">
                  Precifique seus produtos para ver o lucro estimado
                </p>
                <Link
                  to="/precificacao"
                  className="text-sm text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                >
                  Ir para calculadora
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Receita estimada:</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatarMoeda(lucroEstimado.receita)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Lucro liquido:</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatarMoeda(lucroEstimado.lucro)}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 text-center">
                  * Baseado nas precificacoes salvas
                </p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Radar de Produtos */}
      <div className="mt-6">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Radar de Produtos
                </h2>
              </div>
              <Link
                to="/radar-produtos"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-gray-900">{produtos.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {produtos.filter(p => p.status === 'ideia').length}
                </p>
                <p className="text-xs text-yellow-600">Ideias</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {produtos.filter(p => p.status === 'testando').length}
                </p>
                <p className="text-xs text-blue-600">Testando</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">
                  {produtos.filter(p => p.status === 'validado').length}
                </p>
                <p className="text-xs text-green-600">Validados</p>
              </div>
            </div>

            {produtos.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {produtos.slice(0, 8).map((produto) => (
                  <div
                    key={produto.id}
                    className="flex-shrink-0 w-20 text-center"
                  >
                    {produto.imagem_url ? (
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="w-16 h-16 rounded-lg object-cover mx-auto"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <p className="text-xs text-gray-700 mt-1 truncate">{produto.nome}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
