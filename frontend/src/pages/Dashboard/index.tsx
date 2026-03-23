import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getProdutos } from '../../services/produtosService';
import { getPedidosPendentes } from '../../services/pedidosService';
import { getEstoqueProdutos } from '../../services/estoqueProdutosService';
import { getFilamentos } from '../../services/filamentosService';
import { getPrecificacoes } from '../../services/precificacoesService';
import { getImpressoes } from '../../services/impressoesService';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import { ProdutoConcorrente, Pedido, EstoqueProduto, Filamento, PrecificacaoSalva, Impressao } from '../../types';
import {
  Package,
  AlertCircle,
  Clock,
  Cylinder,
  DollarSign,
  ShoppingCart,
  Plus,
  Printer,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Zap,
  Activity,
} from 'lucide-react';

// Formatar tempo
function formatarTempo(horas: number): string {
  if (horas === 0) return '-';
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${m}`;
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
  const [impressoes, setImpressoes] = useState<Impressao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [produtosData, pedidosData, estoqueData, filamentosData, precificacoesData, impressoesData] = await Promise.all([
      getProdutos(),
      getPedidosPendentes(),
      getEstoqueProdutos(),
      getFilamentos(),
      getPrecificacoes(),
      getImpressoes(),
    ]);
    setProdutos(produtosData);
    setPedidos(pedidosData);
    setEstoque(estoqueData);
    setFilamentos(filamentosData);
    setPrecificacoes(precificacoesData);
    setImpressoes(impressoesData);
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
      const prec = precificacoes.find(p => p.produto_id === item.produto_id);
      if (prec) {
        receita += prec.preco_venda * item.quantidade_produzir;
        lucro += prec.lucro_liquido * item.quantidade_produzir;
      }
    });

    return { receita, lucro };
  }, [filaProducao, precificacoes]);

  // Peças produzidas hoje
  const pecasProduzidasHoje = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return impressoes
      .filter(imp => {
        if (!imp.created_at) return false;
        const dataImpressao = new Date(imp.created_at);
        dataImpressao.setHours(0, 0, 0, 0);
        return dataImpressao.getTime() === hoje.getTime();
      })
      .reduce((acc, imp) => acc + imp.quantidade, 0);
  }, [impressoes]);

  // Consumo de filamento
  const consumoFilamento = useMemo(() => {
    const totalNecessario = totais.peso;
    const totalEmEstoque = filamentos.reduce((acc, f) => acc + f.estoque_gramas, 0);
    const aposProducao = totalEmEstoque - totalNecessario;
    const suficiente = aposProducao >= 0;

    // Filamentos com estoque baixo (< 200g)
    const filamentosBaixos = filamentos.filter(f => f.estoque_gramas < 200);

    return {
      necessario: totalNecessario,
      emEstoque: totalEmEstoque,
      aposProducao,
      suficiente,
      filamentosBaixos,
    };
  }, [totais.peso, filamentos]);

  // Alertas
  const alertas = useMemo(() => {
    const lista: { tipo: 'warning' | 'error'; texto: string }[] = [];

    if (!consumoFilamento.suficiente && consumoFilamento.necessario > 0) {
      lista.push({ tipo: 'error', texto: 'Filamento insuficiente para producao' });
    }

    consumoFilamento.filamentosBaixos.forEach(f => {
      lista.push({ tipo: 'warning', texto: `${f.nome_filamento} ${f.cor} com estoque baixo` });
    });

    const pedidosUrgentes = pedidos.filter(p => p.prioridade === 'urgente');
    if (pedidosUrgentes.length > 0) {
      lista.push({ tipo: 'error', texto: `${pedidosUrgentes.length} pedido(s) urgente(s)` });
    }

    return lista;
  }, [consumoFilamento, pedidos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visao geral da operacao
          </p>
        </div>

        <Link
          to="/fila-producao"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </Link>
      </div>

      {!isSupabaseConfigured() && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Modo offline</p>
            <p className="text-sm text-amber-400/70">Dados salvos localmente</p>
          </div>
        </div>
      )}

      {/* Cards Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pedidos Hoje */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm text-gray-400">Pedidos na fila</span>
          </div>
          <p className="text-3xl font-bold text-white">{pedidos.length}</p>
        </div>

        {/* Produção Ativa */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm text-gray-400">Produzidas hoje</span>
          </div>
          <p className="text-3xl font-bold text-white">{pecasProduzidasHoje}</p>
        </div>

        {/* Receita Estimada */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-green-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm text-gray-400">Receita estimada</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {lucroEstimado.receita > 0 ? formatarMoeda(lucroEstimado.receita) : '—'}
          </p>
        </div>

        {/* Alertas */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${alertas.length > 0 ? 'bg-red-500/10' : 'bg-gray-800'}`}>
              <AlertTriangle className={`w-5 h-5 ${alertas.length > 0 ? 'text-red-400' : 'text-gray-500'}`} />
            </div>
            <span className="text-sm text-gray-400">Alertas</span>
          </div>
          <p className={`text-3xl font-bold ${alertas.length > 0 ? 'text-red-400' : 'text-white'}`}>
            {alertas.length}
          </p>
        </div>
      </div>

      {/* Bloco de Produção */}
      {filaProducao.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Producao Pendente</h2>
            </div>
            <Link
              to="/fila-producao"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              Ver fila <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Barra de Progresso Visual */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-400">Progresso geral</span>
              <span className="text-white font-medium">
                {totais.pecas} pecas restantes
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Package className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{totais.pecas}</p>
              <p className="text-xs text-gray-500">Pecas</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Cylinder className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">
                {totais.peso >= 1000 ? `${(totais.peso / 1000).toFixed(1)}kg` : `${totais.peso.toFixed(0)}g`}
              </p>
              <p className="text-xs text-gray-500">Filamento</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <Clock className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{formatarTempo(totais.tempo)}</p>
              <p className="text-xs text-gray-500">Tempo</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-400">
                {lucroEstimado.lucro > 0 ? formatarMoeda(lucroEstimado.lucro) : '—'}
              </p>
              <p className="text-xs text-gray-500">Lucro</p>
            </div>
          </div>

          {/* Lista de itens */}
          <div className="mt-6 space-y-2">
            {filaProducao.slice(0, 5).map((item, idx) => (
              <div
                key={`${item.produto_id}-${item.variacao_id || idx}`}
                className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors"
              >
                {item.imagem_url ? (
                  <img
                    src={item.imagem_url}
                    alt={item.nome_produto}
                    className="w-10 h-10 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {item.nome_produto}
                    {item.nome_variacao && (
                      <span className="text-gray-500 font-normal"> · {item.nome_variacao}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatarTempo(item.tempo_total)} · {item.peso_total.toFixed(0)}g
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-emerald-400">{item.quantidade_produzir}</p>
                  <p className="text-xs text-gray-500">pecas</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sem produção */}
      {filaProducao.length === 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Nenhuma producao pendente</h3>
          <p className="text-gray-500 mb-6">Adicione um pedido para comecar</p>
          <Link
            to="/fila-producao"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </Link>
        </div>
      )}

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Alertas</h2>
          </div>

          <div className="space-y-2">
            {alertas.map((alerta, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  alerta.tipo === 'error' ? 'bg-red-500/10' : 'bg-amber-500/10'
                }`}
              >
                <AlertCircle className={`w-4 h-4 ${
                  alerta.tipo === 'error' ? 'text-red-400' : 'text-amber-400'
                }`} />
                <span className={`text-sm ${
                  alerta.tipo === 'error' ? 'text-red-300' : 'text-amber-300'
                }`}>
                  {alerta.texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atalhos Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/fila-producao"
          className="bg-gray-900 rounded-2xl border border-gray-800 p-5 hover:border-gray-700 hover:bg-gray-900/80 transition-all group"
        >
          <Printer className="w-6 h-6 text-gray-500 group-hover:text-emerald-400 transition-colors mb-3" />
          <p className="font-medium text-white">Fila de Producao</p>
          <p className="text-sm text-gray-500">{pedidos.length} pedidos</p>
        </Link>

        <Link
          to="/impressoes"
          className="bg-gray-900 rounded-2xl border border-gray-800 p-5 hover:border-gray-700 hover:bg-gray-900/80 transition-all group"
        >
          <Zap className="w-6 h-6 text-gray-500 group-hover:text-emerald-400 transition-colors mb-3" />
          <p className="font-medium text-white">Registrar Impressao</p>
          <p className="text-sm text-gray-500">{impressoes.length} registros</p>
        </Link>

        <Link
          to="/radar-produtos"
          className="bg-gray-900 rounded-2xl border border-gray-800 p-5 hover:border-gray-700 hover:bg-gray-900/80 transition-all group"
        >
          <Package className="w-6 h-6 text-gray-500 group-hover:text-emerald-400 transition-colors mb-3" />
          <p className="font-medium text-white">Radar de Produtos</p>
          <p className="text-sm text-gray-500">{produtos.length} produtos</p>
        </Link>

        <Link
          to="/filamentos"
          className="bg-gray-900 rounded-2xl border border-gray-800 p-5 hover:border-gray-700 hover:bg-gray-900/80 transition-all group"
        >
          <Cylinder className="w-6 h-6 text-gray-500 group-hover:text-emerald-400 transition-colors mb-3" />
          <p className="font-medium text-white">Filamentos</p>
          <p className="text-sm text-gray-500">{filamentos.length} cadastrados</p>
        </Link>
      </div>
    </div>
  );
}
