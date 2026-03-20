import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui';
import { Pedido, ProdutoConcorrente, ItemFilaProducao, EstoqueProduto, Filamento, Impressora, MLOrder, MLConnectionStatus, TikTokOrder, TikTokConnectionStatus, ShopeeOrder, ShopeeConnectionStatus, PrioridadePedido } from '../../types';
import { getPedidosPendentes, createPedido, marcarProduzido, concluirPedido, getPedidosConcluidos, calcularPrioridade, getPrioridadeValor, cancelarPedido, devolverPedido } from '../../services/pedidosService';
import { getEstoqueProdutos, removerEstoqueComMovimentacao } from '../../services/estoqueProdutosService';
import { getProdutos } from '../../services/produtosService';
import { getFilamentos } from '../../services/filamentosService';
import { createImpressao } from '../../services/impressoesService';
import { getImpressorasAtivas } from '../../services/impressorasService';
import { getPrecificacaoByProduto } from '../../services/precificacoesService';
import { getAcessorios, deduzirEstoqueAcessorios, validarEstoqueAcessorios, registrarSaida as registrarSaidaAcessorio } from '../../services/acessoriosService';
import { getEmbalagens, registrarMovimentacaoEmbalagem } from '../../services/embalagensService';
import { Embalagem } from '../../types';
import { Acessorio } from '../../types/acessorio';
import {
  checkMLConnection,
  syncMLOrders,
  getMLOrders,
  importMLOrderToPedido,
  disconnectML,
  getMLLoginUrl,
  findMatchingProduct,
} from '../../services/mercadoLivreService';
import {
  checkTikTokConnection,
  syncTikTokOrders,
  getTikTokOrders,
  importTikTokOrderToPedido,
  disconnectTikTok,
  getTikTokLoginUrl,
  findMatchingProduct as findMatchingProductTikTok,
} from '../../services/tiktokShopService';
import {
  checkShopeeConnection,
  syncShopeeOrders,
  getShopeeOrders,
  importShopeeOrderToPedido,
  disconnectShopee,
  getShopeeLoginUrl,
  findMatchingProduct as findMatchingProductShopee,
} from '../../services/shopeeService';
import {
  ClipboardList,
  Plus,
  Minus,
  Trash2,
  Check,
  Package,
  Clock,
  Cylinder,
  Loader2,
  X,
  ShoppingCart,
  Archive,
  CheckCircle2,
  ImageOff,
  Printer,
  AlertTriangle,
  TrendingUp,
  Download,
  Search,
  FileText,
  AlertCircle,
  CalendarClock,
  Timer,
  Link2,
  RefreshCw,
  Unlink,
  History,
  Calendar,
  Flame,
  Circle,
  ChevronDown,
  ChevronRight,
  Edit3,
  XCircle,
  RotateCcw,
  Layers,
} from 'lucide-react';

// Interface para variação selecionada com quantidade
interface VariacaoSelecionada {
  id: string;
  nome_variacao: string;
  quantidade: number;
}

// Interface para pedido importado/analisado
interface PedidoImportado {
  textoOriginal: string;
  nomeProduto: string;
  nomeVariacao?: string;
  quantidade: number;
  produtoEncontrado?: ProdutoConcorrente;
  variacaoEncontrada?: { id: string; nome_variacao: string };
  variacoesSelecionadas?: VariacaoSelecionada[]; // Para múltiplas variações
  status: 'encontrado' | 'nao_encontrado' | 'variacao_nao_encontrada' | 'selecionar_variacao';
}

// Interface para pedido ML com match
interface MLOrderWithMatch {
  order: MLOrder;
  produtoMatch?: ProdutoConcorrente;
  variacaoMatch?: { id: string; nome_variacao: string };
  matchStatus: 'encontrado_sku' | 'encontrado_nome' | 'nao_encontrado';
  quantidade: number;
  selecionado: boolean;
  produtoManual?: ProdutoConcorrente;
  variacaoManual?: { id: string; nome_variacao: string };
  expanded: boolean;
}

// Interface para pedido TikTok com match
interface TikTokOrderWithMatch {
  order: TikTokOrder;
  produtoMatch?: ProdutoConcorrente;
  variacaoMatch?: { id: string; nome_variacao: string };
  matchStatus: 'encontrado_sku' | 'encontrado_nome' | 'nao_encontrado';
  quantidade: number;
  selecionado: boolean;
  produtoManual?: ProdutoConcorrente;
  variacaoManual?: { id: string; nome_variacao: string };
  expanded: boolean;
}

// Interface para pedido Shopee com match
interface ShopeeOrderWithMatch {
  order: ShopeeOrder;
  produtoMatch?: ProdutoConcorrente;
  variacaoMatch?: { id: string; nome_variacao: string };
  matchStatus: 'encontrado_sku' | 'encontrado_nome' | 'nao_encontrado';
  quantidade: number;
  selecionado: boolean;
  produtoManual?: ProdutoConcorrente;
  variacaoManual?: { id: string; nome_variacao: string };
  expanded: boolean;
}

// Parser de pedidos colados
function parsePedidosTexto(texto: string): { nome: string; variacao?: string; quantidade: number }[] {
  const linhas = texto.split('\n').filter(l => l.trim());
  const pedidos: { nome: string; variacao?: string; quantidade: number }[] = [];

  for (const linha of linhas) {
    const linhaLimpa = linha.trim();
    if (!linhaLimpa) continue;

    let quantidade = 1;
    let nomeProduto = linhaLimpa;

    // Tentar extrair quantidade nos formatos:
    // "3x Produto" ou "3 x Produto"
    const matchInicio = linhaLimpa.match(/^(\d+)\s*[xX]\s+(.+)$/);
    if (matchInicio) {
      quantidade = parseInt(matchInicio[1]);
      nomeProduto = matchInicio[2].trim();
    } else {
      // "Produto - 3" ou "Produto x3" ou "Produto (3)"
      const matchFim = linhaLimpa.match(/^(.+?)\s*[-xX]\s*(\d+)$|^(.+?)\s*\((\d+)\)$/);
      if (matchFim) {
        nomeProduto = (matchFim[1] || matchFim[3]).trim();
        quantidade = parseInt(matchFim[2] || matchFim[4]);
      }
    }

    // Tentar separar variação do nome do produto
    // Formatos: "Produto - Variacao", "Produto (Variacao)", "Produto Variacao"
    let nomeBase = nomeProduto;
    let variacao: string | undefined;

    // Tentar "Produto - Variacao"
    const matchVariacao = nomeProduto.match(/^(.+?)\s*[-–]\s*(.+)$/);
    if (matchVariacao) {
      nomeBase = matchVariacao[1].trim();
      variacao = matchVariacao[2].trim();
    }

    pedidos.push({
      nome: nomeBase,
      variacao,
      quantidade
    });
  }

  return pedidos;
}


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

// Obter configuracao visual da prioridade
function getPrioridadeConfig(prioridade?: PrioridadePedido): { cor: string; bgCor: string; texto: string; icone: 'flame' | 'alert' | 'circle' } {
  switch (prioridade) {
    case 'urgente':
      return { cor: 'text-red-600', bgCor: 'bg-red-100', texto: 'Urgente', icone: 'flame' };
    case 'alta':
      return { cor: 'text-orange-600', bgCor: 'bg-orange-100', texto: 'Alta', icone: 'alert' };
    default:
      return { cor: 'text-gray-500', bgCor: 'bg-gray-100', texto: 'Normal', icone: 'circle' };
  }
}

// Formatar horário (ex: 14:30)
function formatarHorario(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Calcular previsão de término
function calcularPrevisaoTermino(horasAPartirDeAgora: number): Date {
  const agora = new Date();
  const minutos = horasAPartirDeAgora * 60;
  return new Date(agora.getTime() + minutos * 60 * 1000);
}

// Interface para item planejado com previsão
interface ItemPlanejado extends ItemFilaProducao {
  ordem: number;
  horarioInicio: Date;
  horarioTermino: Date;
  impressoraId?: string;
}

// Distribuir itens entre impressoras de forma equilibrada (dividindo pecas)
function distribuirEntreImpressoras(
  itens: ItemFilaProducao[],
  impressoras: string[]
): Map<string, ItemPlanejado[]> {
  const distribuicao = new Map<string, ItemPlanejado[]>();
  const temposPorImpressora = new Map<string, number>();
  const numImpressoras = impressoras.length;

  // Inicializar
  impressoras.forEach(imp => {
    distribuicao.set(imp, []);
    temposPorImpressora.set(imp, 0);
  });

  // Para cada item, dividir as pecas entre as impressoras
  itens.forEach(item => {
    if (item.quantidade_produzir === 0) return;

    const qtdTotal = item.quantidade_produzir;
    const pecasPorImpressora = Math.ceil(qtdTotal / numImpressoras);
    let qtdRestante = qtdTotal;

    // Distribuir pecas entre impressoras (priorizando as menos carregadas)
    // Criar lista ordenada por tempo acumulado
    const impressorasOrdenadas = [...impressoras].sort((a, b) => {
      return (temposPorImpressora.get(a) || 0) - (temposPorImpressora.get(b) || 0);
    });

    impressorasOrdenadas.forEach(impId => {
      if (qtdRestante <= 0) return;

      // Quantidade para esta impressora
      const qtdParaImpressora = Math.min(pecasPorImpressora, qtdRestante);
      qtdRestante -= qtdParaImpressora;

      // Calcular tempo e peso proporcionais
      const tempoItem = qtdParaImpressora * item.tempo_por_peca;
      const pesoItem = qtdParaImpressora * item.peso_por_peca;

      const lista = distribuicao.get(impId)!;
      const tempoAtual = temposPorImpressora.get(impId) || 0;

      const itemPlanejado: ItemPlanejado = {
        ...item,
        quantidade_produzir: qtdParaImpressora,
        tempo_total: tempoItem,
        peso_total: pesoItem,
        ordem: lista.length + 1,
        horarioInicio: calcularPrevisaoTermino(tempoAtual),
        horarioTermino: calcularPrevisaoTermino(tempoAtual + tempoItem),
        impressoraId: impId,
      };

      lista.push(itemPlanejado);
      temposPorImpressora.set(impId, tempoAtual + tempoItem);
    });
  });

  // Reordenar cada lista por tempo (menor primeiro) e recalcular horarios
  distribuicao.forEach((lista) => {
    lista.sort((a, b) => a.tempo_total - b.tempo_total);
    let tempoAcumulado = 0;
    lista.forEach((item, idx) => {
      item.ordem = idx + 1;
      item.horarioInicio = calcularPrevisaoTermino(tempoAcumulado);
      item.horarioTermino = calcularPrevisaoTermino(tempoAcumulado + item.tempo_total);
      tempoAcumulado += item.tempo_total;
    });
  });

  return distribuicao;
}

export function FilaProducao() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [estoque, setEstoque] = useState<EstoqueProduto[]>([]);
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Impressoras do usuário (do banco de dados)
  const [impressorasDisponiveis, setImpressorasDisponiveis] = useState<Impressora[]>([]);
  const [impressorasSelecionadasIds, setImpressorasSelecionadasIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('makerflow_impressoras_selecionadas');
    return saved ? JSON.parse(saved) : [];
  });
  const [showImpressorasConfig, setShowImpressorasConfig] = useState(false);

  // Modal de novo pedido
  const [showModal, setShowModal] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>('');
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<string>('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [prioridade, setPrioridade] = useState<PrioridadePedido>('normal');
  const [dataEntrega, setDataEntrega] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Modo Kit - permite múltiplos produtos diferentes
  const [modoKit, setModoKit] = useState(false);
  const [itensKit, setItensKit] = useState<{
    id: string;
    produto_id: string;
    variacao_id?: string;
    produto_nome: string;
    variacao_nome?: string;
    quantidade: number;
    imagem_url?: string;
    peso?: number;
    tempo?: number;
  }[]>([]);

  // Modal de marcar produzido
  const [showProduzidoModal, setShowProduzidoModal] = useState(false);
  const [itemParaProduzir, setItemParaProduzir] = useState<ItemFilaProducao | null>(null);
  const [qtdProduzida, setQtdProduzida] = useState<number>(1);
  const [filamentoId, setFilamentoId] = useState<string>('');
  const [impressoraId, setImpressoraId] = useState<string>('');
  const [produzindo, setProduzindo] = useState(false);

  // Embalagens e Acessórios para produção/conclusão
  const [embalagensDisponiveis, setEmbalagensDisponiveis] = useState<Embalagem[]>([]);
  const [acessoriosDisponiveis, setAcessoriosDisponiveis] = useState<Acessorio[]>([]);
  const [embalagensSelecionadas, setEmbalagensSelecionadas] = useState<{id: string, quantidade: number}[]>([]);
  const [acessoriosSelecionados, setAcessoriosSelecionados] = useState<{id: string, quantidade: number}[]>([]);

  // Modal de concluir (do estoque)
  const [showConcluirModal, setShowConcluirModal] = useState(false);
  const [itemParaConcluir, setItemParaConcluir] = useState<ItemFilaProducao | null>(null);
  const [concluindo, setConcluindo] = useState(false);

  // Modal de importar pedidos
  const [showImportModal, setShowImportModal] = useState(false);
  const [textoImportacao, setTextoImportacao] = useState('');
  const [pedidosImportados, setPedidosImportados] = useState<PedidoImportado[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const [importando, setImportando] = useState(false);

  // Mercado Livre
  const [searchParams, setSearchParams] = useSearchParams();
  const [mlStatus, setMlStatus] = useState<MLConnectionStatus>({ connected: false });
  const [mlOrders, setMlOrders] = useState<MLOrder[]>([]);
  const [mlSyncing, setMlSyncing] = useState(false);
  const [showMLModal, setShowMLModal] = useState(false);
  const [mlImporting, setMlImporting] = useState(false);
  const [mlLoaded, setMlLoaded] = useState(false);
  const [mlLoginUrl, setMlLoginUrl] = useState<string>('');
  const [mlOrdersWithMatch, setMlOrdersWithMatch] = useState<MLOrderWithMatch[]>([]);
  const [mlAnalyzing, setMlAnalyzing] = useState(false);

  // TikTok Shop
  const [tiktokStatus, setTiktokStatus] = useState<TikTokConnectionStatus>({ connected: false });
  const [tiktokOrders, setTiktokOrders] = useState<TikTokOrder[]>([]);
  const [tiktokSyncing, setTiktokSyncing] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [tiktokImporting, setTiktokImporting] = useState(false);
  const [tiktokLoaded, setTiktokLoaded] = useState(false);
  const [tiktokLoginUrl, setTiktokLoginUrl] = useState<string>('');
  const [tiktokOrdersWithMatch, setTiktokOrdersWithMatch] = useState<TikTokOrderWithMatch[]>([]);
  const [tiktokAnalyzing, setTiktokAnalyzing] = useState(false);

  // Shopee
  const [shopeeStatus, setShopeeStatus] = useState<ShopeeConnectionStatus>({ connected: false });
  const [shopeeOrders, setShopeeOrders] = useState<ShopeeOrder[]>([]);
  const [shopeeSyncing, setShopeeSyncing] = useState(false);
  const [showShopeeModal, setShowShopeeModal] = useState(false);
  const [shopeeImporting, setShopeeImporting] = useState(false);
  const [shopeeLoaded, setShopeeLoaded] = useState(false);
  const [shopeeLoginUrl, setShopeeLoginUrl] = useState<string>('');
  const [shopeeOrdersWithMatch, setShopeeOrdersWithMatch] = useState<ShopeeOrderWithMatch[]>([]);
  const [shopeeAnalyzing, setShopeeAnalyzing] = useState(false);

  // Historico de pedidos concluidos
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [pedidosConcluidos, setPedidosConcluidos] = useState<Pedido[]>([]);
  const [selectedHistorico, setSelectedHistorico] = useState<string[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [revertendo, setRevertendo] = useState<string | null>(null); // ID do pedido sendo revertido

  // Verificar conexao ML ao carregar
  useEffect(() => {
    const checkML = async () => {
      try {
        const status = await checkMLConnection();
        setMlStatus(status);

        // Se estiver conectado, buscar pedidos pendentes
        if (status.connected) {
          const orders = await getMLOrders(true);
          setMlOrders(orders);
        } else {
          // Carregar URL de login
          const loginUrl = await getMLLoginUrl();
          setMlLoginUrl(loginUrl);
        }
      } catch (error) {
        console.error('Erro ao verificar ML:', error);
      } finally {
        setMlLoaded(true);
      }
    };

    checkML();
  }, []);

  // Verificar conexao TikTok ao carregar
  useEffect(() => {
    const checkTikTok = async () => {
      try {
        const status = await checkTikTokConnection();
        setTiktokStatus(status);

        // Se estiver conectado, buscar pedidos pendentes
        if (status.connected) {
          const orders = await getTikTokOrders(true);
          setTiktokOrders(orders);
        } else {
          // Carregar URL de login
          const loginUrl = await getTikTokLoginUrl();
          setTiktokLoginUrl(loginUrl);
        }
      } catch (error) {
        console.error('Erro ao verificar TikTok:', error);
      } finally {
        setTiktokLoaded(true);
      }
    };

    checkTikTok();
  }, []);

  // Verificar se veio do callback do ML
  useEffect(() => {
    const mlParam = searchParams.get('ml');
    if (mlParam === 'connected') {
      // Limpar parametro da URL
      searchParams.delete('ml');
      setSearchParams(searchParams, { replace: true });
      // Recarregar status
      checkMLConnection().then(status => {
        setMlStatus(status);
        if (status.connected) {
          getMLOrders(true).then(setMlOrders);
        }
      });
    }
  }, [searchParams, setSearchParams]);

  // Verificar se veio do callback do TikTok
  useEffect(() => {
    const tiktokParam = searchParams.get('tiktok');
    if (tiktokParam === 'connected') {
      // Limpar parametro da URL
      searchParams.delete('tiktok');
      setSearchParams(searchParams, { replace: true });
      // Recarregar status
      checkTikTokConnection().then(status => {
        setTiktokStatus(status);
        if (status.connected) {
          getTikTokOrders(true).then(setTiktokOrders);
        }
      });
    }
  }, [searchParams, setSearchParams]);

  // Verificar conexao Shopee ao carregar
  useEffect(() => {
    const checkShopee = async () => {
      try {
        const status = await checkShopeeConnection();
        setShopeeStatus(status);

        // Se estiver conectado, buscar pedidos pendentes
        if (status.connected) {
          const orders = await getShopeeOrders(true);
          setShopeeOrders(orders);
        } else {
          // Carregar URL de login
          const loginUrl = await getShopeeLoginUrl();
          setShopeeLoginUrl(loginUrl);
        }
      } catch (error) {
        console.error('Erro ao verificar Shopee:', error);
      } finally {
        setShopeeLoaded(true);
      }
    };

    checkShopee();
  }, []);

  // Verificar se veio do callback da Shopee
  useEffect(() => {
    const shopeeParam = searchParams.get('shopee');
    if (shopeeParam === 'connected') {
      // Limpar parametro da URL
      searchParams.delete('shopee');
      setSearchParams(searchParams, { replace: true });
      // Recarregar status
      checkShopeeConnection().then(status => {
        setShopeeStatus(status);
        if (status.connected) {
          getShopeeOrders(true).then(setShopeeOrders);
        }
      });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [pedidosData, estoqueData, produtosData, filamentosData, impressorasData, embalagensData, acessoriosData] = await Promise.all([
      getPedidosPendentes(),
      getEstoqueProdutos(),
      getProdutos(),
      getFilamentos(),
      getImpressorasAtivas(),
      getEmbalagens(),
      getAcessorios(),
    ]);
    setPedidos(pedidosData);
    setEstoque(estoqueData);
    setProdutos(produtosData);
    setFilamentos(filamentosData);
    setImpressorasDisponiveis(impressorasData);
    setEmbalagensDisponiveis(embalagensData);
    setAcessoriosDisponiveis(acessoriosData);

    // Atualizar IDs selecionados para remover impressoras que nao existem mais
    setImpressorasSelecionadasIds(prev => {
      const idsValidos = prev.filter(id => impressorasData.some(imp => imp.id === id));
      if (idsValidos.length !== prev.length) {
        localStorage.setItem('makerflow_impressoras_selecionadas', JSON.stringify(idsValidos));
      }
      return idsValidos;
    });

    setLoading(false);
  };

  // Sincronizar pedidos do Mercado Livre
  const handleSyncML = async () => {
    setMlSyncing(true);
    try {
      const result = await syncMLOrders();
      if (result) {
        setMlOrders(result.pending);
        if (result.synced > 0) {
          alert(`${result.synced} novos pedidos sincronizados do Mercado Livre!`);
        } else if (result.pending.length === 0) {
          alert('Nenhum pedido pendente no Mercado Livre.');
        }
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar ML:', error);
      const message = error?.message || 'Erro ao sincronizar com Mercado Livre';
      alert(message);
    } finally {
      setMlSyncing(false);
    }
  };

  // Analisar pedidos ML e buscar correspondencias
  const handleOpenMLImport = async () => {
    setShowMLModal(true);
    setMlAnalyzing(true);

    try {
      const ordersWithMatch: MLOrderWithMatch[] = [];

      for (const order of mlOrders) {
        const match = await findMatchingProduct(order.product_title, order.variation, order.seller_sku);

        ordersWithMatch.push({
          order,
          produtoMatch: match?.produto,
          variacaoMatch: match?.variacao ? { id: match.variacao.id!, nome_variacao: match.variacao.nome_variacao } : undefined,
          matchStatus: match ? (match.matchedBy === 'sku' ? 'encontrado_sku' : 'encontrado_nome') : 'nao_encontrado',
          quantidade: order.quantity,
          selecionado: match !== null, // Auto-selecionar se encontrou
          expanded: false,
        });
      }

      setMlOrdersWithMatch(ordersWithMatch);
    } catch (error) {
      console.error('Erro ao analisar pedidos:', error);
    } finally {
      setMlAnalyzing(false);
    }
  };

  // Toggle seleção de pedido ML
  const toggleMLOrderSelection = (orderId: string) => {
    setMlOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? { ...item, selecionado: !item.selecionado } : item
    ));
  };

  // Toggle expansão de pedido ML
  const toggleMLOrderExpand = (orderId: string) => {
    setMlOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? { ...item, expanded: !item.expanded } : item
    ));
  };

  // Selecionar produto manualmente para pedido ML
  const setMLOrderManualProduct = (orderId: string, produtoId: string, variacaoId?: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    const variacao = produto?.variacoes?.find(v => v.id === variacaoId);

    setMlOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? {
        ...item,
        produtoManual: produto,
        variacaoManual: variacao ? { id: variacao.id!, nome_variacao: variacao.nome_variacao } : undefined,
        selecionado: true,
      } : item
    ));
  };

  // Importar pedidos selecionados do ML (versão melhorada)
  const handleImportMLOrders = async () => {
    const pedidosSelecionados = mlOrdersWithMatch.filter(item => item.selecionado);

    if (pedidosSelecionados.length === 0) {
      alert('Selecione pelo menos um pedido para importar');
      return;
    }

    // Verificar se todos têm produto definido
    const semProduto = pedidosSelecionados.filter(item =>
      !item.produtoManual && !item.produtoMatch
    );

    if (semProduto.length > 0) {
      alert(`${semProduto.length} pedido(s) não têm produto definido. Selecione um produto manualmente ou desmarque-os.`);
      return;
    }

    setMlImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pedidosSelecionados) {
      const produtoId = item.produtoManual?.id || item.produtoMatch?.id;
      const variacaoId = item.variacaoManual?.id || item.variacaoMatch?.id;

      if (produtoId) {
        // Criar pedido com quantidade original do marketplace (nao editavel)
        const success = await importMLOrderToPedido(
          item.order,
          produtoId,
          variacaoId
        );

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    // Recarregar dados
    await loadData();
    const orders = await getMLOrders(true);
    setMlOrders(orders);
    setMlOrdersWithMatch([]);
    setMlImporting(false);
    setShowMLModal(false);

    if (successCount > 0) {
      alert(`${successCount} pedido(s) importado(s) com sucesso!${failCount > 0 ? ` (${failCount} falharam)` : ''}`);
    } else {
      alert('Nenhum pedido foi importado.');
    }
  };

  // Desconectar do Mercado Livre
  const handleDisconnectML = async () => {
    if (confirm('Deseja desconectar do Mercado Livre?')) {
      const success = await disconnectML();
      if (success) {
        setMlStatus({ connected: false });
        setMlOrders([]);
        // Recarregar URL de login para mostrar botao de conectar
        const loginUrl = await getMLLoginUrl();
        setMlLoginUrl(loginUrl);
      }
    }
  };

  // Sincronizar pedidos do TikTok Shop
  const handleSyncTikTok = async () => {
    setTiktokSyncing(true);
    try {
      const result = await syncTikTokOrders();
      if (result) {
        setTiktokOrders(result.pending);
        if (result.synced > 0) {
          alert(`${result.synced} novos pedidos sincronizados do TikTok Shop!`);
        } else if (result.pending.length === 0) {
          alert('Nenhum pedido pendente no TikTok Shop.');
        }
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar TikTok:', error);
      const message = error?.message || 'Erro ao sincronizar com TikTok Shop';
      alert(message);
    } finally {
      setTiktokSyncing(false);
    }
  };

  // Analisar pedidos TikTok e buscar correspondencias
  const handleOpenTikTokImport = async () => {
    setShowTikTokModal(true);
    setTiktokAnalyzing(true);

    try {
      const ordersWithMatch: TikTokOrderWithMatch[] = [];

      for (const order of tiktokOrders) {
        const match = await findMatchingProductTikTok(order.product_title, order.variation, order.seller_sku);

        ordersWithMatch.push({
          order,
          produtoMatch: match?.produto,
          variacaoMatch: match?.variacao ? { id: match.variacao.id!, nome_variacao: match.variacao.nome_variacao } : undefined,
          matchStatus: match ? (match.matchedBy === 'sku' ? 'encontrado_sku' : 'encontrado_nome') : 'nao_encontrado',
          quantidade: order.quantity,
          selecionado: match !== null, // Auto-selecionar se encontrou
          expanded: false,
        });
      }

      setTiktokOrdersWithMatch(ordersWithMatch);
    } catch (error) {
      console.error('Erro ao analisar pedidos TikTok:', error);
    } finally {
      setTiktokAnalyzing(false);
    }
  };

  // Toggle seleção de pedido TikTok
  const toggleTikTokOrderSelection = (orderId: string) => {
    setTiktokOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? { ...item, selecionado: !item.selecionado } : item
    ));
  };

  // Toggle expansão de pedido TikTok
  const toggleTikTokOrderExpand = (orderId: string) => {
    setTiktokOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? { ...item, expanded: !item.expanded } : item
    ));
  };

  // Selecionar produto manualmente para pedido TikTok
  const setTikTokOrderManualProduct = (orderId: string, produtoId: string, variacaoId?: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    const variacao = produto?.variacoes?.find(v => v.id === variacaoId);

    setTiktokOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? {
        ...item,
        produtoManual: produto,
        variacaoManual: variacao ? { id: variacao.id!, nome_variacao: variacao.nome_variacao } : undefined,
        selecionado: true,
      } : item
    ));
  };

  // Importar pedidos selecionados do TikTok
  const handleImportTikTokOrders = async () => {
    const pedidosSelecionados = tiktokOrdersWithMatch.filter(item => item.selecionado);

    if (pedidosSelecionados.length === 0) {
      alert('Selecione pelo menos um pedido para importar');
      return;
    }

    // Verificar se todos têm produto definido
    const semProduto = pedidosSelecionados.filter(item =>
      !item.produtoManual && !item.produtoMatch
    );

    if (semProduto.length > 0) {
      alert(`${semProduto.length} pedido(s) não têm produto definido. Selecione um produto manualmente ou desmarque-os.`);
      return;
    }

    setTiktokImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pedidosSelecionados) {
      const produtoId = item.produtoManual?.id || item.produtoMatch?.id;
      const variacaoId = item.variacaoManual?.id || item.variacaoMatch?.id;

      if (produtoId) {
        // Criar pedido com quantidade original do marketplace (nao editavel)
        const success = await importTikTokOrderToPedido(
          item.order,
          produtoId,
          variacaoId
        );

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    // Recarregar dados
    await loadData();
    const orders = await getTikTokOrders(true);
    setTiktokOrders(orders);
    setTiktokOrdersWithMatch([]);
    setTiktokImporting(false);
    setShowTikTokModal(false);

    if (successCount > 0) {
      alert(`${successCount} pedido(s) importado(s) com sucesso!${failCount > 0 ? ` (${failCount} falharam)` : ''}`);
    } else {
      alert('Nenhum pedido foi importado.');
    }
  };

  // Desconectar do TikTok Shop
  const handleDisconnectTikTok = async () => {
    if (confirm('Deseja desconectar do TikTok Shop?')) {
      const success = await disconnectTikTok();
      if (success) {
        setTiktokStatus({ connected: false });
        setTiktokOrders([]);
        // Recarregar URL de login para mostrar botao de conectar
        const loginUrl = await getTikTokLoginUrl();
        setTiktokLoginUrl(loginUrl);
      }
    }
  };

  // Sincronizar pedidos da Shopee
  const handleSyncShopee = async () => {
    setShopeeSyncing(true);
    try {
      const result = await syncShopeeOrders();
      if (result) {
        setShopeeOrders(result.pending);
        if (result.synced > 0) {
          alert(`${result.synced} novos pedidos sincronizados da Shopee!`);
        } else if (result.pending.length === 0) {
          alert('Nenhum pedido pendente na Shopee.');
        }
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar Shopee:', error);
      const message = error?.message || 'Erro ao sincronizar com Shopee';
      alert(message);
    } finally {
      setShopeeSyncing(false);
    }
  };

  // Analisar pedidos Shopee e buscar correspondencias
  const handleOpenShopeeImport = async () => {
    setShowShopeeModal(true);
    setShopeeAnalyzing(true);

    try {
      const ordersWithMatch: ShopeeOrderWithMatch[] = [];

      for (const order of shopeeOrders) {
        const match = await findMatchingProductShopee(order.product_title, order.variation, order.seller_sku);

        ordersWithMatch.push({
          order,
          produtoMatch: match?.produto,
          variacaoMatch: match?.variacao ? { id: match.variacao.id!, nome_variacao: match.variacao.nome_variacao } : undefined,
          matchStatus: match ? (match.matchedBy === 'sku' ? 'encontrado_sku' : 'encontrado_nome') : 'nao_encontrado',
          quantidade: order.quantity,
          selecionado: match !== null, // Auto-selecionar se encontrou
          expanded: false,
        });
      }

      setShopeeOrdersWithMatch(ordersWithMatch);
    } catch (error) {
      console.error('Erro ao analisar pedidos Shopee:', error);
    } finally {
      setShopeeAnalyzing(false);
    }
  };

  // Toggle seleção de pedido Shopee
  const toggleShopeeOrderSelection = (orderId: string) => {
    setShopeeOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? { ...item, selecionado: !item.selecionado } : item
    ));
  };

  // Toggle expansão de pedido Shopee
  const toggleShopeeOrderExpand = (orderId: string) => {
    setShopeeOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? { ...item, expanded: !item.expanded } : item
    ));
  };

  // Selecionar produto manualmente para pedido Shopee
  const setShopeeOrderManualProduct = (orderId: string, produtoId: string, variacaoId?: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    const variacao = produto?.variacoes?.find(v => v.id === variacaoId);

    setShopeeOrdersWithMatch(prev => prev.map(item =>
      item.order.id === orderId ? {
        ...item,
        produtoManual: produto,
        variacaoManual: variacao ? { id: variacao.id!, nome_variacao: variacao.nome_variacao } : undefined,
        selecionado: true,
      } : item
    ));
  };

  // Importar pedidos selecionados da Shopee
  const handleImportShopeeOrders = async () => {
    const pedidosSelecionados = shopeeOrdersWithMatch.filter(item => item.selecionado);

    if (pedidosSelecionados.length === 0) {
      alert('Selecione pelo menos um pedido para importar');
      return;
    }

    // Verificar se todos têm produto definido
    const semProduto = pedidosSelecionados.filter(item =>
      !item.produtoManual && !item.produtoMatch
    );

    if (semProduto.length > 0) {
      alert(`${semProduto.length} pedido(s) não têm produto definido. Selecione um produto manualmente ou desmarque-os.`);
      return;
    }

    setShopeeImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of pedidosSelecionados) {
      const produtoId = item.produtoManual?.id || item.produtoMatch?.id;
      const variacaoId = item.variacaoManual?.id || item.variacaoMatch?.id;

      if (produtoId) {
        // Criar pedido com quantidade original do marketplace (nao editavel)
        const success = await importShopeeOrderToPedido(
          item.order,
          produtoId,
          variacaoId
        );

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
    }

    // Recarregar dados
    await loadData();
    const orders = await getShopeeOrders(true);
    setShopeeOrders(orders);
    setShopeeOrdersWithMatch([]);
    setShopeeImporting(false);
    setShowShopeeModal(false);

    if (successCount > 0) {
      alert(`${successCount} pedido(s) importado(s) com sucesso!${failCount > 0 ? ` (${failCount} falharam)` : ''}`);
    } else {
      alert('Nenhum pedido foi importado.');
    }
  };

  // Desconectar da Shopee
  const handleDisconnectShopee = async () => {
    if (confirm('Deseja desconectar da Shopee?')) {
      const success = await disconnectShopee();
      if (success) {
        setShopeeStatus({ connected: false });
        setShopeeOrders([]);
        // Recarregar URL de login para mostrar botao de conectar
        const loginUrl = await getShopeeLoginUrl();
        setShopeeLoginUrl(loginUrl);
      }
    }
  };

  // Salvar impressoras selecionadas no localStorage
  const handleSaveImpressoras = (impressorasIds: string[]) => {
    setImpressorasSelecionadasIds(impressorasIds);
    localStorage.setItem('makerflow_impressoras_selecionadas', JSON.stringify(impressorasIds));
    setShowImpressorasConfig(false);
  };

  // Abrir historico de pedidos concluidos
  const handleOpenHistorico = async () => {
    setShowHistoricoModal(true);
    setLoadingHistorico(true);
    try {
      const concluidos = await getPedidosConcluidos();
      setPedidosConcluidos(concluidos);
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
    } finally {
      setLoadingHistorico(false);
    }
  };

  // Marcar pedidos selecionados como cancelados ou devolvidos (retorna estoque e mantém no histórico)
  const handleExcluirSelecionados = async (motivo: 'cancelado' | 'devolvido') => {
    if (selectedHistorico.length === 0) return;
    if (revertendo) return;

    const mensagem = motivo === 'cancelado'
      ? `Marcar ${selectedHistorico.length} pedido(s) como cancelado(s)? O estoque será devolvido.`
      : `Marcar ${selectedHistorico.length} pedido(s) como devolvido(s)? O estoque será devolvido.`;

    if (!confirm(mensagem)) return;

    setRevertendo('multiple');
    try {
      for (const id of selectedHistorico) {
        if (motivo === 'cancelado') {
          await cancelarPedido(id);
        } else {
          await devolverPedido(id);
        }
      }
      const concluidos = await getPedidosConcluidos();
      setPedidosConcluidos(concluidos);
      setSelectedHistorico([]);
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar pedidos:', error);
      alert('Erro ao atualizar pedidos');
    } finally {
      setRevertendo(null);
    }
  };

  // Toggle seleção de pedido no histórico
  const toggleSelectHistorico = (id: string) => {
    setSelectedHistorico(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Selecionar/desselecionar todos
  const toggleSelectAllHistorico = () => {
    if (selectedHistorico.length === pedidosConcluidos.length) {
      setSelectedHistorico([]);
    } else {
      setSelectedHistorico(pedidosConcluidos.map(p => p.id!));
    }
  };

  // Calcular fila de produção - v4 (com prioridade)
  const filaProducao = useMemo((): ItemFilaProducao[] => {
    const mapa = new Map<string, ItemFilaProducao & { quantidade_restante: number }>();

    // Agrupar pedidos por produto/variação
    pedidos.forEach(pedido => {
      const key = `${pedido.produto_id}-${pedido.variacao_id || 'sem_variacao'}`;

      // Quantidade total do pedido (para exibicao de "vendidos")
      const qtdPedido = pedido.quantidade;
      // Quantidade ja atendida (do estoque ou producao anterior)
      const qtdJaAtendida = pedido.quantidade_produzida || 0;
      // Quantidade que ainda falta entregar
      const qtdRestante = pedido.quantidade - qtdJaAtendida;

      // Pular pedidos concluídos, cancelados ou devolvidos
      if (pedido.status === 'concluido' || pedido.status === 'cancelado' || pedido.status === 'devolvido') return;

      if (mapa.has(key)) {
        const item = mapa.get(key)!;
        item.quantidade_pedida += qtdPedido;
        item.quantidade_do_estoque += qtdJaAtendida;
        item.quantidade_restante += qtdRestante;
        item.pedidos.push(pedido);

        // Atualizar prioridade para a mais alta
        const prioridadePedido = pedido.prioridade || calcularPrioridade(pedido.data_entrega);
        if (getPrioridadeValor(prioridadePedido) < getPrioridadeValor(item.prioridade)) {
          item.prioridade = prioridadePedido;
        }

        // Atualizar data de entrega para a mais proxima
        if (pedido.data_entrega) {
          if (!item.data_entrega || pedido.data_entrega < item.data_entrega) {
            item.data_entrega = pedido.data_entrega;
          }
        }
      } else {
        // Obter dados do produto/variação
        const peso = pedido.variacao?.peso_filamento || pedido.produto?.peso_filamento || 0;
        const tempo = pedido.variacao?.tempo_impressao || pedido.produto?.tempo_impressao || 0;

        // Calcular prioridade do pedido
        const prioridadePedido = pedido.prioridade || calcularPrioridade(pedido.data_entrega);

        mapa.set(key, {
          produto_id: pedido.produto_id,
          variacao_id: pedido.variacao_id,
          nome_produto: pedido.produto?.nome || 'Produto',
          nome_variacao: pedido.variacao?.nome_variacao,
          imagem_url: pedido.produto?.imagem_url,
          quantidade_pedida: qtdPedido,
          quantidade_do_estoque: qtdJaAtendida,
          quantidade_restante: qtdRestante,
          quantidade_estoque_disponivel: 0,
          quantidade_produzir: 0,
          status_fila: 'producao',
          peso_por_peca: peso,
          tempo_por_peca: tempo,
          peso_total: 0,
          tempo_total: 0,
          prioridade: prioridadePedido,
          data_entrega: pedido.data_entrega,
          pedidos: [pedido],
        });
      }
    });

    // Calcular producao considerando estoque disponivel
    mapa.forEach((item) => {
      const estoqueItem = estoque.find(e =>
        e.produto_id === item.produto_id &&
        (item.variacao_id ? e.variacao_id === item.variacao_id : !e.variacao_id)
      );

      // Estoque disponivel atual
      item.quantidade_estoque_disponivel = estoqueItem?.quantidade || 0;

      // Calcular quantidade a produzir: restante - estoque disponivel (mínimo 0)
      item.quantidade_produzir = Math.max(0, item.quantidade_restante - item.quantidade_estoque_disponivel);

      // Determinar status do item
      if (item.quantidade_restante === 0) {
        // Tudo ja foi atendido pelo estoque
        item.status_fila = 'estoque_total';
      } else if (item.quantidade_do_estoque > 0 && item.quantidade_produzir > 0) {
        // Parcialmente atendido
        item.status_fila = 'estoque_parcial';
      } else if (item.quantidade_produzir === 0 && item.quantidade_estoque_disponivel >= item.quantidade_restante) {
        // Pode ser atendido pelo estoque disponivel
        item.status_fila = 'estoque_total';
      } else {
        // Precisa producao
        item.status_fila = 'producao';
      }

      // Calcular totais (apenas para o que precisa produzir)
      item.peso_total = item.quantidade_produzir * item.peso_por_peca;
      item.tempo_total = item.quantidade_produzir * item.tempo_por_peca;
    });

    // Ordenar por: 1. Prioridade (urgente > alta > normal), 2. Status, 3. Data criacao
    const itens = Array.from(mapa.values());
    return itens.sort((a, b) => {
      // 1. Ordenar por prioridade do pedido (urgente primeiro)
      const prioridadeA = getPrioridadeValor(a.prioridade);
      const prioridadeB = getPrioridadeValor(b.prioridade);
      if (prioridadeA !== prioridadeB) return prioridadeA - prioridadeB;

      // 2. Ordenar por status da fila (producao > parcial > estoque)
      const statusPrioridade = { producao: 0, estoque_parcial: 1, estoque_total: 2 };
      const statusA = statusPrioridade[a.status_fila];
      const statusB = statusPrioridade[b.status_fila];
      if (statusA !== statusB) return statusA - statusB;

      // 3. Ordenar por data de entrega (mais proxima primeiro)
      if (a.data_entrega && b.data_entrega) {
        return a.data_entrega.localeCompare(b.data_entrega);
      }
      if (a.data_entrega) return -1;
      if (b.data_entrega) return 1;

      // 4. Ordenar por tempo total
      return a.tempo_total - b.tempo_total;
    });
  }, [pedidos, estoque]);

  // Separar itens por status
  const itensPorStatus = useMemo(() => {
    const aProduzir: ItemFilaProducao[] = [];
    const parcial: ItemFilaProducao[] = [];
    const doEstoque: ItemFilaProducao[] = [];

    filaProducao.forEach(item => {
      if (item.status_fila === 'producao') {
        aProduzir.push(item);
      } else if (item.status_fila === 'estoque_parcial') {
        parcial.push(item);
      } else {
        doEstoque.push(item);
      }
    });

    return { aProduzir, parcial, doEstoque };
  }, [filaProducao]);

  // Contadores por seção
  const contadores = useMemo(() => {
    return {
      aProduzir: itensPorStatus.aProduzir.length,
      parcial: itensPorStatus.parcial.length,
      doEstoque: itensPorStatus.doEstoque.length,
      total: filaProducao.length,
    };
  }, [itensPorStatus, filaProducao]);

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

  // Planejamento com previsão de término
  const planejamento = useMemo(() => {
    if (filaProducao.length === 0) return { itens: [], previsaoFinal: null };

    // Calcular previsão para fila simples (1 impressora ou nenhuma configurada)
    let tempoAcumulado = 0;
    const itensPlanejados: ItemPlanejado[] = filaProducao.map((item, idx) => {
      const inicio = calcularPrevisaoTermino(tempoAcumulado);
      const termino = calcularPrevisaoTermino(tempoAcumulado + item.tempo_total);
      tempoAcumulado += item.tempo_total;

      return {
        ...item,
        ordem: idx + 1,
        horarioInicio: inicio,
        horarioTermino: termino,
      };
    });

    return {
      itens: itensPlanejados,
      previsaoFinal: itensPlanejados.length > 0
        ? itensPlanejados[itensPlanejados.length - 1].horarioTermino
        : null,
    };
  }, [filaProducao]);

  // Distribuição por impressoras (se houver mais de 1 selecionada)
  const distribuicaoPorImpressora = useMemo(() => {
    if (impressorasSelecionadasIds.length <= 1 || filaProducao.length === 0) {
      return null;
    }
    return distribuirEntreImpressoras(filaProducao, impressorasSelecionadasIds);
  }, [filaProducao, impressorasSelecionadasIds]);

  // Calcular tempo máximo entre impressoras (para previsão com múltiplas)
  const previsaoComMultiplasImpressoras = useMemo(() => {
    if (!distribuicaoPorImpressora) return null;

    let maiorTempo = 0;
    distribuicaoPorImpressora.forEach((itens) => {
      const tempoImpressora = itens.reduce((acc, item) => acc + item.tempo_total, 0);
      if (tempoImpressora > maiorTempo) {
        maiorTempo = tempoImpressora;
      }
    });

    return calcularPrevisaoTermino(maiorTempo);
  }, [distribuicaoPorImpressora]);

  // Variações do produto selecionado
  const variacoesProduto = useMemo(() => {
    if (!produtoSelecionado) return [];
    const produto = produtos.find(p => p.id === produtoSelecionado);
    return produto?.variacoes || [];
  }, [produtoSelecionado, produtos]);

  // Cálculos do Kit (suporta múltiplos produtos diferentes)
  const kitInfo = useMemo(() => {
    if (!modoKit || itensKit.length === 0) {
      return { pesoTotal: 0, tempoTotal: 0, quantidadeTotal: 0 };
    }

    let pesoTotal = 0;
    let tempoTotal = 0;
    let quantidadeTotal = 0;

    for (const item of itensKit) {
      pesoTotal += (item.peso || 0) * item.quantidade;
      tempoTotal += (item.tempo || 0) * item.quantidade;
      quantidadeTotal += item.quantidade;
    }

    return { pesoTotal, tempoTotal, quantidadeTotal };
  }, [modoKit, itensKit]);

  const handleAddPedido = async () => {
    // Modo Kit: criar pedidos separados para cada item
    if (modoKit) {
      if (itensKit.length === 0) return;

      setSaving(true);

      let sucesso = true;
      for (const item of itensKit) {
        const resultado = await createPedido({
          produto_id: item.produto_id,
          variacao_id: item.variacao_id || null,
          quantidade: item.quantidade,
          quantidade_produzida: 0,
          status: 'pendente',
          prioridade: prioridade,
          data_entrega: dataEntrega || undefined,
        });

        if (!resultado) {
          sucesso = false;
          break;
        }
      }

      if (sucesso) {
        await loadData();
        setShowModal(false);
        setProdutoSelecionado('');
        setItensKit([]);
        setModoKit(false);
        setPrioridade('normal');
        setDataEntrega('');
      }

      setSaving(false);
      return;
    }

    // Modo normal
    if (!produtoSelecionado || quantidade < 1) return;

    setSaving(true);

    const resultado = await createPedido({
      produto_id: produtoSelecionado,
      variacao_id: variacaoSelecionada || null,
      quantidade,
      quantidade_produzida: 0,
      status: 'pendente',
      prioridade: prioridade,
      data_entrega: dataEntrega || undefined,
    });

    if (resultado) {
      await loadData();
      setShowModal(false);
      setProdutoSelecionado('');
      setVariacaoSelecionada('');
      setQuantidade(1);
      setPrioridade('normal');
      setDataEntrega('');
    }

    setSaving(false);
  };

  const handleCancelarPedido = async (id: string) => {
    if (!confirm('Cancelar este pedido? O estoque produzido será devolvido.')) return;

    const resultado = await cancelarPedido(id);
    if (resultado) {
      await loadData();
    }
  };

  const handleAbrirProduzir = (item: ItemFilaProducao) => {
    setItemParaProduzir(item);
    setQtdProduzida(item.quantidade_produzir);
    setFilamentoId('');
    setImpressoraId('');
    setEmbalagensSelecionadas([]);
    setAcessoriosSelecionados([]);
    setShowProduzidoModal(true);
  };

  // Analisar texto colado para encontrar produtos
  const handleAnalisarPedidos = () => {
    if (!textoImportacao.trim()) return;

    setAnalisando(true);
    const pedidosParsed = parsePedidosTexto(textoImportacao);

    const resultado: PedidoImportado[] = pedidosParsed.map(p => {
      // Buscar produto pelo nome (case insensitive, parcial)
      const nomeBusca = p.nome.toLowerCase();
      const produtoEncontrado = produtos.find(prod =>
        prod.nome.toLowerCase().includes(nomeBusca) ||
        nomeBusca.includes(prod.nome.toLowerCase())
      );

      if (!produtoEncontrado) {
        return {
          textoOriginal: `${p.quantidade}x ${p.nome}${p.variacao ? ` - ${p.variacao}` : ''}`,
          nomeProduto: p.nome,
          nomeVariacao: p.variacao,
          quantidade: p.quantidade,
          status: 'nao_encontrado' as const
        };
      }

      // Se tem variação especificada, tentar encontrar
      let variacaoEncontrada: { id: string; nome_variacao: string } | undefined;
      if (p.variacao && produtoEncontrado.variacoes?.length) {
        const variacaoBusca = p.variacao.toLowerCase();
        const variacao = produtoEncontrado.variacoes.find(v =>
          v.nome_variacao.toLowerCase().includes(variacaoBusca) ||
          variacaoBusca.includes(v.nome_variacao.toLowerCase())
        );
        if (variacao) {
          variacaoEncontrada = { id: variacao.id!, nome_variacao: variacao.nome_variacao };
        }
      }

      // Se produto tem variações mas não encontrou a especificada
      if (p.variacao && produtoEncontrado.variacoes?.length && !variacaoEncontrada) {
        return {
          textoOriginal: `${p.quantidade}x ${p.nome} - ${p.variacao}`,
          nomeProduto: p.nome,
          nomeVariacao: p.variacao,
          quantidade: p.quantidade,
          produtoEncontrado,
          status: 'variacao_nao_encontrada' as const
        };
      }

      // Se produto tem variações e não foi especificada nenhuma - precisa selecionar
      if (!p.variacao && produtoEncontrado.variacoes?.length && produtoEncontrado.variacoes.length > 0) {
        return {
          textoOriginal: `${p.quantidade}x ${p.nome}`,
          nomeProduto: produtoEncontrado.nome,
          quantidade: p.quantidade,
          produtoEncontrado,
          status: 'selecionar_variacao' as const
        };
      }

      return {
        textoOriginal: `${p.quantidade}x ${p.nome}${p.variacao ? ` - ${p.variacao}` : ''}`,
        nomeProduto: produtoEncontrado.nome,
        nomeVariacao: variacaoEncontrada?.nome_variacao,
        quantidade: p.quantidade,
        produtoEncontrado,
        variacaoEncontrada,
        status: 'encontrado' as const
      };
    });

    setPedidosImportados(resultado);
    setAnalisando(false);
  };

  // Importar pedidos analisados
  const handleImportarPedidos = async () => {
    const pedidosValidos = pedidosImportados.filter(p => p.status === 'encontrado');
    if (pedidosValidos.length === 0) return;

    setImportando(true);

    try {
      for (const pedido of pedidosValidos) {
        // Se tem múltiplas variações selecionadas, criar um pedido para cada
        if (pedido.variacoesSelecionadas && pedido.variacoesSelecionadas.length > 0) {
          for (const variacao of pedido.variacoesSelecionadas) {
            await createPedido({
              produto_id: pedido.produtoEncontrado!.id!,
              variacao_id: variacao.id,
              quantidade: variacao.quantidade,
              quantidade_produzida: 0,
              status: 'pendente',
            });
          }
        } else {
          // Comportamento normal - uma única variação ou sem variação
          await createPedido({
            produto_id: pedido.produtoEncontrado!.id!,
            variacao_id: pedido.variacaoEncontrada?.id || null,
            quantidade: pedido.quantidade,
            quantidade_produzida: 0,
            status: 'pendente',
          });
        }
      }

      await loadData();
      setShowImportModal(false);
      setTextoImportacao('');
      setPedidosImportados([]);
    } catch (error) {
      console.error('Erro ao importar pedidos:', error);
      alert('Erro ao importar pedidos. Tente novamente.');
    }

    setImportando(false);
  };

  // Limpar importação
  const handleLimparImportacao = () => {
    setTextoImportacao('');
    setPedidosImportados([]);
  };

  // Adicionar variação ao pedido importado
  const handleAdicionarVariacao = (index: number, variacaoId: string, quantidade: number) => {
    setPedidosImportados(prev => prev.map((pedido, i) => {
      if (i !== index || !pedido.produtoEncontrado) return pedido;

      const variacao = pedido.produtoEncontrado.variacoes?.find(v => v.id === variacaoId);
      if (!variacao) return pedido;

      const variacoesSelecionadas = pedido.variacoesSelecionadas || [];
      const existente = variacoesSelecionadas.find(v => v.id === variacaoId);

      let novasVariacoes: VariacaoSelecionada[];
      if (existente) {
        // Atualizar quantidade se já existe
        novasVariacoes = variacoesSelecionadas.map(v =>
          v.id === variacaoId ? { ...v, quantidade: v.quantidade + quantidade } : v
        );
      } else {
        // Adicionar nova variação
        novasVariacoes = [...variacoesSelecionadas, {
          id: variacao.id!,
          nome_variacao: variacao.nome_variacao,
          quantidade
        }];
      }

      // Calcular total selecionado
      const totalSelecionado = novasVariacoes.reduce((sum, v) => sum + v.quantidade, 0);

      return {
        ...pedido,
        variacoesSelecionadas: novasVariacoes,
        status: totalSelecionado >= pedido.quantidade ? 'encontrado' as const : 'selecionar_variacao' as const
      };
    }));
  };

  // Remover variação do pedido importado
  const handleRemoverVariacao = (index: number, variacaoId: string) => {
    setPedidosImportados(prev => prev.map((pedido, i) => {
      if (i !== index) return pedido;

      const variacoesSelecionadas = (pedido.variacoesSelecionadas || []).filter(v => v.id !== variacaoId);
      const totalSelecionado = variacoesSelecionadas.reduce((sum, v) => sum + v.quantidade, 0);

      return {
        ...pedido,
        variacoesSelecionadas,
        status: totalSelecionado >= pedido.quantidade ? 'encontrado' as const : 'selecionar_variacao' as const
      };
    }));
  };

  // Atualizar quantidade de uma variação
  const handleAtualizarQtdVariacao = (index: number, variacaoId: string, quantidade: number) => {
    setPedidosImportados(prev => prev.map((pedido, i) => {
      if (i !== index) return pedido;

      const variacoesSelecionadas = (pedido.variacoesSelecionadas || []).map(v =>
        v.id === variacaoId ? { ...v, quantidade: Math.max(1, quantidade) } : v
      );
      const totalSelecionado = variacoesSelecionadas.reduce((sum, v) => sum + v.quantidade, 0);

      return {
        ...pedido,
        variacoesSelecionadas,
        status: totalSelecionado >= pedido.quantidade ? 'encontrado' as const : 'selecionar_variacao' as const
      };
    }));
  };

  const handleMarcarProduzido = async () => {
    if (!itemParaProduzir || qtdProduzida < 1) return;

    setProduzindo(true);

    try {
      // 0. Verificar e deduzir acessorios (se configurados na precificacao)
      const precificacao = await getPrecificacaoByProduto(itemParaProduzir.produto_id);
      if (precificacao?.acessorios_config && precificacao.acessorios_config.length > 0) {
        // Validar estoque de acessorios
        const validacao = await validarEstoqueAcessorios(precificacao.acessorios_config, qtdProduzida);
        if (!validacao.valido) {
          alert(`Estoque insuficiente de acessorios:\n${validacao.erros.join('\n')}`);
          setProduzindo(false);
          return;
        }

        // Deduzir acessorios
        const deduzido = await deduzirEstoqueAcessorios(
          precificacao.acessorios_config,
          qtdProduzida,
          itemParaProduzir.produto_id,
          'impressao'
        );
        if (!deduzido) {
          alert('Erro ao deduzir estoque de acessorios.');
          setProduzindo(false);
          return;
        }
      }

      // 1. Criar registro de impressao PRIMEIRO (se tem filamento selecionado)
      // A impressao automaticamente adiciona ao estoque via impressoesService
      if (filamentoId && itemParaProduzir.peso_por_peca > 0) {
        const impressao = await createImpressao({
          produto_id: itemParaProduzir.produto_id,
          variacao_id: itemParaProduzir.variacao_id || undefined,
          filamento_id: filamentoId,
          impressora_id: impressoraId || undefined,
          quantidade: qtdProduzida,
          peso_peca_g: itemParaProduzir.peso_por_peca,
          tempo_peca_min: itemParaProduzir.tempo_por_peca ? itemParaProduzir.tempo_por_peca * 60 : undefined,
        });

        if (!impressao) {
          alert('Erro ao registrar impressao. Tente novamente.');
          setProduzindo(false);
          return;
        }
      }

      // 2. Consumir estoque para atender os pedidos
      // O estoque foi adicionado automaticamente pela impressao
      const qtdParaEntregar = Math.min(qtdProduzida, itemParaProduzir.quantidade_produzir);
      if (qtdParaEntregar > 0) {
        const resultado = await removerEstoqueComMovimentacao(
          itemParaProduzir.produto_id,
          itemParaProduzir.variacao_id || null,
          qtdParaEntregar,
          'venda',
          `Entrega de ${qtdParaEntregar} unidade(s) para pedido`
        );

        if (!resultado) {
          console.warn('Nao foi possivel remover estoque - pode nao haver estoque suficiente');
          // Continua mesmo assim - o estoque pode ter sido adicionado corretamente
        }
      }

      // 3. Validar estoque de embalagens e acessórios selecionados manualmente
      const errosEstoque: string[] = [];

      for (const emb of embalagensSelecionadas) {
        if (emb.quantidade > 0) {
          const embData = embalagensDisponiveis.find(e => e.id === emb.id);
          const qtdNecessaria = emb.quantidade * qtdProduzida;
          if (embData && qtdNecessaria > (embData.quantidade || 0)) {
            errosEstoque.push(`${embData.nome_embalagem}: necessário ${qtdNecessaria}, disponível ${embData.quantidade || 0}`);
          }
        }
      }

      for (const acess of acessoriosSelecionados) {
        if (acess.quantidade > 0) {
          const acessData = acessoriosDisponiveis.find(a => a.id === acess.id);
          const qtdNecessaria = acess.quantidade * qtdProduzida;
          if (acessData && qtdNecessaria > (acessData.estoque_atual || 0)) {
            errosEstoque.push(`${acessData.nome}: necessário ${qtdNecessaria}, disponível ${acessData.estoque_atual || 0}`);
          }
        }
      }

      if (errosEstoque.length > 0) {
        alert(`Estoque insuficiente:\n${errosEstoque.join('\n')}`);
        setProduzindo(false);
        return;
      }

      // 4. Deduzir embalagens selecionadas manualmente
      for (const emb of embalagensSelecionadas) {
        if (emb.quantidade > 0) {
          await registrarMovimentacaoEmbalagem(
            emb.id,
            'saida',
            emb.quantidade * qtdProduzida,
            `Produção de ${qtdProduzida} unidade(s) - ${itemParaProduzir.nome_produto}`
          );
        }
      }

      // 5. Deduzir acessórios selecionados manualmente
      for (const acess of acessoriosSelecionados) {
        if (acess.quantidade > 0) {
          await registrarSaidaAcessorio(
            acess.id,
            acess.quantidade * qtdProduzida,
            `Produção de ${qtdProduzida} unidade(s) - ${itemParaProduzir.nome_produto}`
          );
        }
      }

      // 6. Marcar pedidos como produzidos (distribuir quantidade entre pedidos)
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

      await loadData();
      setShowProduzidoModal(false);
      setItemParaProduzir(null);
      setEmbalagensSelecionadas([]);
      setAcessoriosSelecionados([]);
    } catch (error) {
      console.error('Erro ao marcar produzido:', error);
      alert('Erro ao processar produção. Tente novamente.');
    }

    setProduzindo(false);
  };

  // Abrir modal para concluir pedido do estoque
  const handleAbrirConcluir = (item: ItemFilaProducao) => {
    setItemParaConcluir(item);
    setEmbalagensSelecionadas([]);
    setAcessoriosSelecionados([]);
    setShowConcluirModal(true);
  };

  // Concluir pedido que ja foi atendido pelo estoque (com embalagens/acessórios opcionais)
  const handleConcluirComEmbalagens = async () => {
    if (!itemParaConcluir) return;

    setConcluindo(true);

    try {
      // Calcular quantidade restante que precisa consumir do estoque
      const qtdRestanteTotal = itemParaConcluir.pedidos.reduce((acc, pedido) => {
        return acc + (pedido.quantidade - (pedido.quantidade_produzida || 0));
      }, 0);

      // Consumir estoque para atender os pedidos restantes
      if (qtdRestanteTotal > 0 && itemParaConcluir.quantidade_estoque_disponivel > 0) {
        const qtdConsumir = Math.min(qtdRestanteTotal, itemParaConcluir.quantidade_estoque_disponivel);
        const resultado = await removerEstoqueComMovimentacao(
          itemParaConcluir.produto_id,
          itemParaConcluir.variacao_id || null,
          qtdConsumir,
          'venda',
          `Entrega de ${qtdConsumir} unidade(s) para pedido (do estoque)`
        );

        if (!resultado) {
          alert('Erro ao consumir estoque. Verifique se ha estoque suficiente.');
          setConcluindo(false);
          return;
        }
      }

      // Validar estoque de embalagens e acessórios selecionados
      const errosEstoque: string[] = [];

      for (const emb of embalagensSelecionadas) {
        if (emb.quantidade > 0) {
          const embData = embalagensDisponiveis.find(e => e.id === emb.id);
          const qtdNecessaria = emb.quantidade * qtdRestanteTotal;
          if (embData && qtdNecessaria > (embData.quantidade || 0)) {
            errosEstoque.push(`${embData.nome_embalagem}: necessário ${qtdNecessaria}, disponível ${embData.quantidade || 0}`);
          }
        }
      }

      for (const acess of acessoriosSelecionados) {
        if (acess.quantidade > 0) {
          const acessData = acessoriosDisponiveis.find(a => a.id === acess.id);
          const qtdNecessaria = acess.quantidade * qtdRestanteTotal;
          if (acessData && qtdNecessaria > (acessData.estoque_atual || 0)) {
            errosEstoque.push(`${acessData.nome}: necessário ${qtdNecessaria}, disponível ${acessData.estoque_atual || 0}`);
          }
        }
      }

      if (errosEstoque.length > 0) {
        alert(`Estoque insuficiente:\n${errosEstoque.join('\n')}`);
        setConcluindo(false);
        return;
      }

      // Deduzir embalagens selecionadas
      for (const emb of embalagensSelecionadas) {
        if (emb.quantidade > 0) {
          await registrarMovimentacaoEmbalagem(
            emb.id,
            'saida',
            emb.quantidade * qtdRestanteTotal,
            `Conclusão de ${qtdRestanteTotal} unidade(s) - ${itemParaConcluir.nome_produto}`
          );
        }
      }

      // Deduzir acessórios selecionados
      for (const acess of acessoriosSelecionados) {
        if (acess.quantidade > 0) {
          await registrarSaidaAcessorio(
            acess.id,
            acess.quantidade * qtdRestanteTotal,
            `Conclusão de ${qtdRestanteTotal} unidade(s) - ${itemParaConcluir.nome_produto}`
          );
        }
      }

      // Marcar todos os pedidos como concluidos
      for (const pedido of itemParaConcluir.pedidos) {
        const qtdPedidoRestante = pedido.quantidade - (pedido.quantidade_produzida || 0);
        if (qtdPedidoRestante > 0) {
          await marcarProduzido(pedido.id!, qtdPedidoRestante);
        } else {
          await concluirPedido(pedido.id!);
        }
      }

      await loadData();
      setShowConcluirModal(false);
      setItemParaConcluir(null);
      setEmbalagensSelecionadas([]);
      setAcessoriosSelecionados([]);
    } catch (error) {
      console.error('Erro ao concluir pedido:', error);
      alert('Erro ao processar. Tente novamente.');
    }

    setConcluindo(false);
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

        <div className="flex flex-col gap-3">
          {/* Linha 1: Botoes principais */}
          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Importar Pedidos
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>
            <button
              onClick={handleOpenHistorico}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Historico de pedidos"
            >
              <History className="w-4 h-4" />
              Historico
            </button>
          </div>

          {/* Linha 2: Marketplaces */}
          <div className="flex items-center gap-1 justify-end bg-gray-50 rounded-lg p-1.5">
            <span className="text-xs text-gray-400 px-2">Marketplaces:</span>

            {/* Mercado Livre */}
            {!mlLoaded ? (
              <button disabled className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-yellow-500 text-white rounded-md opacity-50">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ML
              </button>
            ) : mlStatus.connected ? (
              <div className="flex items-center">
                <button
                  onClick={mlOrders.length > 0 ? handleOpenMLImport : handleSyncML}
                  disabled={mlSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-yellow-500 text-white rounded-l-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  title={mlOrders.length > 0 ? 'Importar pedidos do Mercado Livre' : 'Sincronizar Mercado Livre'}
                >
                  {mlSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : mlOrders.length > 0 ? (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  ML
                  {mlOrders.length > 0 && (
                    <span className="bg-white text-yellow-600 px-1 py-0.5 rounded text-[10px] font-bold leading-none">
                      {mlOrders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleDisconnectML}
                  className="p-1.5 text-yellow-100 bg-yellow-500 hover:bg-red-500 rounded-r-md transition-colors"
                  title="Desconectar Mercado Livre"
                >
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            ) : mlLoginUrl ? (
              <a href={mlLoginUrl} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-200 text-gray-600 rounded-md hover:bg-yellow-500 hover:text-white transition-colors">
                <Link2 className="w-3.5 h-3.5" />
                ML
              </a>
            ) : null}

            {/* Shopee */}
            {!shopeeLoaded ? (
              <button disabled className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-orange-500 text-white rounded-md opacity-50">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Shopee
              </button>
            ) : shopeeStatus.connected ? (
              <div className="flex items-center">
                <button
                  onClick={shopeeOrders.length > 0 ? handleOpenShopeeImport : handleSyncShopee}
                  disabled={shopeeSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-orange-500 text-white rounded-l-md hover:bg-orange-600 transition-colors disabled:opacity-50"
                  title={shopeeOrders.length > 0 ? 'Importar pedidos da Shopee' : 'Sincronizar Shopee'}
                >
                  {shopeeSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : shopeeOrders.length > 0 ? (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Shopee
                  {shopeeOrders.length > 0 && (
                    <span className="bg-white text-orange-600 px-1 py-0.5 rounded text-[10px] font-bold leading-none">
                      {shopeeOrders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleDisconnectShopee}
                  className="p-1.5 text-orange-100 bg-orange-500 hover:bg-red-500 rounded-r-md transition-colors"
                  title="Desconectar Shopee"
                >
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            ) : shopeeLoginUrl ? (
              <a href={shopeeLoginUrl} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-200 text-gray-600 rounded-md hover:bg-orange-500 hover:text-white transition-colors">
                <Link2 className="w-3.5 h-3.5" />
                Shopee
              </a>
            ) : null}

            {/* TikTok */}
            {!tiktokLoaded ? (
              <button disabled className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-900 text-white rounded-md opacity-50">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                TikTok
              </button>
            ) : tiktokStatus.connected ? (
              <div className="flex items-center">
                <button
                  onClick={tiktokOrders.length > 0 ? handleOpenTikTokImport : handleSyncTikTok}
                  disabled={tiktokSyncing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-900 text-white rounded-l-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                  title={tiktokOrders.length > 0 ? 'Importar pedidos do TikTok' : 'Sincronizar TikTok'}
                >
                  {tiktokSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : tiktokOrders.length > 0 ? (
                    <ShoppingCart className="w-3.5 h-3.5" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  TikTok
                  {tiktokOrders.length > 0 && (
                    <span className="bg-white text-gray-900 px-1 py-0.5 rounded text-[10px] font-bold leading-none">
                      {tiktokOrders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={handleDisconnectTikTok}
                  className="p-1.5 text-gray-400 bg-gray-900 hover:bg-red-500 hover:text-white rounded-r-md transition-colors"
                  title="Desconectar TikTok"
                >
                  <Unlink className="w-3 h-3" />
                </button>
              </div>
            ) : tiktokLoginUrl ? (
              <a href={tiktokLoginUrl} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-200 text-gray-600 rounded-md hover:bg-gray-900 hover:text-white transition-colors">
                <Link2 className="w-3.5 h-3.5" />
                TikTok
              </a>
            ) : null}
          </div>
        </div>
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
                  {impressorasSelecionadasIds.length > 0
                    ? `${impressorasSelecionadasIds.length} impressora${impressorasSelecionadasIds.length > 1 ? 's' : ''}`
                    : 'Selecionar impressoras'}
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Contadores por Seção */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Printer className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">A Produzir</p>
                    <p className="text-2xl font-bold text-blue-600">{contadores.aProduzir}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Parcial</p>
                    <p className="text-2xl font-bold text-yellow-600">{contadores.parcial}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Do Estoque</p>
                    <p className="text-2xl font-bold text-green-600">{contadores.doEstoque}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Cards de resumo de produção */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <p className="text-sm text-gray-500">Tempo total</p>
                    <p className="text-2xl font-bold text-gray-900">{formatarTempo(totais.tempo)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <CalendarClock className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Previsao de termino</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {previsaoComMultiplasImpressoras
                        ? formatarHorario(previsaoComMultiplasImpressoras)
                        : planejamento.previsaoFinal
                        ? formatarHorario(planejamento.previsaoFinal)
                        : '-'}
                    </p>
                    {impressorasSelecionadasIds.length > 1 && (
                      <p className="text-xs text-gray-400">com {impressorasSelecionadasIds.length} impressoras</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Distribuição por Impressora (se tiver mais de 1) */}
          {impressorasSelecionadasIds.length > 1 && distribuicaoPorImpressora && (
            <Card className="mb-6">
              <CardBody className="p-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Printer className="w-4 h-4" />
                  Planejador Automatico - Distribuicao por Impressora
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(distribuicaoPorImpressora.entries()).map(([impId, itensImpressora]) => {
                    const impressora = impressorasDisponiveis.find(i => i.id === impId);
                    const tempoImpressora = itensImpressora.reduce((acc, item) => acc + item.tempo_total, 0);
                    const pesoImpressora = itensImpressora.reduce((acc, item) => acc + item.peso_total, 0);
                    const previsaoTerminoImpressora = itensImpressora.length > 0
                      ? itensImpressora[itensImpressora.length - 1].horarioTermino
                      : null;

                    return (
                      <div
                        key={impId}
                        className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Printer className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium text-gray-900">{impressora?.apelido || impressora?.modelo || 'Impressora'}</span>
                          </div>
                          {previsaoTerminoImpressora && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                              termina {formatarHorario(previsaoTerminoImpressora)}
                            </span>
                          )}
                        </div>
                        {itensImpressora.length === 0 ? (
                          <p className="text-sm text-gray-400">Nenhum item</p>
                        ) : (
                          <>
                            <div className="space-y-2 mb-3">
                              {itensImpressora.map((item, idx) => (
                                <div key={`${item.produto_id}-${item.variacao_id}-${idx}`} className="flex items-start gap-2">
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm flex items-center gap-1 flex-wrap">
                                      {item.prioridade === 'urgente' && (
                                        <Flame className="w-3 h-3 text-red-500" />
                                      )}
                                      {item.prioridade === 'alta' && (
                                        <AlertTriangle className="w-3 h-3 text-orange-500" />
                                      )}
                                      <span className="text-gray-700 font-medium">{item.nome_produto}</span>
                                      {item.nome_variacao && (
                                        <span className="text-gray-400"> ({item.nome_variacao})</span>
                                      )}
                                      <span className="text-indigo-600 font-bold"> x{item.quantidade_produzir}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-2">
                                      <span>{formatarTempo(item.tempo_total)}</span>
                                      <span>•</span>
                                      <span>termina {formatarHorario(item.horarioTermino)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                              <span className="flex items-center gap-1">
                                <Timer className="w-3 h-3" />
                                {formatarTempo(tempoImpressora)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Cylinder className="w-3 h-3" />
                                {pesoImpressora.toFixed(0)}g
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  * Distribuicao otimizada automaticamente. Os itens sao balanceados por tempo de impressao.
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* Fila de Produção - Separada por Status */}
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
        <div className="space-y-6">
          {/* SEÇÃO 1: A PRODUZIR */}
          {itensPorStatus.aProduzir.length > 0 && (
            <Card className="border-l-4 border-l-blue-500">
              <CardBody className="p-0">
                <div className="p-4 border-b border-gray-100 bg-blue-50">
                  <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                    <Printer className="w-5 h-5" />
                    A Produzir
                    <span className="ml-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                      {itensPorStatus.aProduzir.length}
                    </span>
                  </h3>
                  <p className="text-sm text-blue-600 mt-1">Itens que precisam ser produzidos</p>
                </div>

                <div className="divide-y divide-gray-100">
                  {itensPorStatus.aProduzir.map((item) => (
                    <div
                      key={`${item.produto_id}-${item.variacao_id || 'sem'}`}
                      className="p-4 hover:bg-blue-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Imagem */}
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {item.imagem_url ? (
                            <img src={item.imagem_url} alt={item.nome_produto} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">
                              {item.nome_produto}
                              {item.nome_variacao && (
                                <span className="text-blue-600 font-medium"> ({item.nome_variacao})</span>
                              )}
                            </h4>
                            {/* Badge de prioridade */}
                            {item.prioridade && item.prioridade !== 'normal' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPrioridadeConfig(item.prioridade).bgCor} ${getPrioridadeConfig(item.prioridade).cor}`}>
                                {item.prioridade === 'urgente' ? <Flame className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                {getPrioridadeConfig(item.prioridade).texto}
                              </span>
                            )}
                            {/* Contagem de pedidos por prioridade */}
                            {item.pedidos.length > 1 && (
                              <span className="text-xs text-gray-500">
                                ({item.pedidos.length} pedidos:
                                {(() => {
                                  const counts: Record<string, number> = { urgente: 0, alta: 0, normal: 0 };
                                  item.pedidos.forEach(p => {
                                    const prio = p.prioridade || 'normal';
                                    counts[prio]++;
                                  });
                                  const parts = [];
                                  if (counts.urgente > 0) parts.push(`${counts.urgente} urg`);
                                  if (counts.alta > 0) parts.push(`${counts.alta} alta`);
                                  if (counts.normal > 0) parts.push(`${counts.normal} normal`);
                                  return ' ' + parts.join(', ');
                                })()})
                              </span>
                            )}
                            {/* Data de entrega */}
                            {item.data_entrega && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>

                          {/* Quantidades em cards */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                              <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
                              <strong>{item.quantidade_pedida}</strong> vendidos
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                              <Archive className="w-3.5 h-3.5" />
                              <strong>{item.quantidade_estoque_disponivel}</strong> estoque
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-bold">
                              <Printer className="w-3.5 h-3.5" />
                              <strong>{item.quantidade_produzir}</strong> produzir
                            </span>
                          </div>

                          {/* Tempo e peso */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatarTempo(item.tempo_total)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Cylinder className="w-3 h-3" />
                              {item.peso_total.toFixed(0)}g
                            </span>
                          </div>
                        </div>

                        {/* Botão */}
                        <button
                          onClick={() => handleAbrirProduzir(item)}
                          disabled={produzindo}
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                          <Printer className="w-4 h-4" />
                          Produzir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* SEÇÃO 2: PARCIAL */}
          {itensPorStatus.parcial.length > 0 && (
            <Card className="border-l-4 border-l-yellow-500">
              <CardBody className="p-0">
                <div className="p-4 border-b border-gray-100 bg-yellow-50">
                  <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Parcial
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">
                      {itensPorStatus.parcial.length}
                    </span>
                  </h3>
                  <p className="text-sm text-yellow-600 mt-1">Parte do estoque, parte a produzir</p>
                </div>

                <div className="divide-y divide-gray-100">
                  {itensPorStatus.parcial.map((item) => (
                    <div
                      key={`${item.produto_id}-${item.variacao_id || 'sem'}`}
                      className="p-4 hover:bg-yellow-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Imagem */}
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {item.imagem_url ? (
                            <img src={item.imagem_url} alt={item.nome_produto} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">
                              {item.nome_produto}
                              {item.nome_variacao && (
                                <span className="text-yellow-600 font-medium"> ({item.nome_variacao})</span>
                              )}
                            </h4>
                            {/* Badge de prioridade */}
                            {item.prioridade && item.prioridade !== 'normal' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPrioridadeConfig(item.prioridade).bgCor} ${getPrioridadeConfig(item.prioridade).cor}`}>
                                {item.prioridade === 'urgente' ? <Flame className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                {getPrioridadeConfig(item.prioridade).texto}
                              </span>
                            )}
                            {/* Contagem de pedidos por prioridade */}
                            {item.pedidos.length > 1 && (
                              <span className="text-xs text-gray-500">
                                ({item.pedidos.length} pedidos:
                                {(() => {
                                  const counts: Record<string, number> = { urgente: 0, alta: 0, normal: 0 };
                                  item.pedidos.forEach(p => {
                                    const prio = p.prioridade || 'normal';
                                    counts[prio]++;
                                  });
                                  const parts = [];
                                  if (counts.urgente > 0) parts.push(`${counts.urgente} urg`);
                                  if (counts.alta > 0) parts.push(`${counts.alta} alta`);
                                  if (counts.normal > 0) parts.push(`${counts.normal} normal`);
                                  return ' ' + parts.join(', ');
                                })()})
                              </span>
                            )}
                            {/* Data de entrega */}
                            {item.data_entrega && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>

                          {/* Quantidades em cards */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                              <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
                              <strong>{item.quantidade_pedida}</strong> vendidos
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <strong>{item.quantidade_do_estoque}</strong> do estoque
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm font-bold">
                              <Printer className="w-3.5 h-3.5" />
                              <strong>{item.quantidade_produzir}</strong> produzir
                            </span>
                          </div>

                          {/* Tempo e peso */}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatarTempo(item.tempo_total)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Cylinder className="w-3 h-3" />
                              {item.peso_total.toFixed(0)}g
                            </span>
                          </div>
                        </div>

                        {/* Botão */}
                        <button
                          onClick={() => handleAbrirProduzir(item)}
                          disabled={produzindo}
                          className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors font-medium disabled:opacity-50"
                        >
                          <Printer className="w-4 h-4" />
                          Produzir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* SEÇÃO 3: ATENDIDO PELO ESTOQUE */}
          {itensPorStatus.doEstoque.length > 0 && (
            <Card className="border-l-4 border-l-green-500">
              <CardBody className="p-0">
                <div className="p-4 border-b border-gray-100 bg-green-50">
                  <h3 className="font-semibold text-green-800 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Atendido pelo Estoque
                    <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                      {itensPorStatus.doEstoque.length}
                    </span>
                  </h3>
                  <p className="text-sm text-green-600 mt-1">Pronto para enviar - apenas clique em Concluir</p>
                </div>

                <div className="divide-y divide-gray-100">
                  {itensPorStatus.doEstoque.map((item) => (
                    <div
                      key={`${item.produto_id}-${item.variacao_id || 'sem'}`}
                      className="p-4 hover:bg-green-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Imagem */}
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                          {item.imagem_url ? (
                            <img src={item.imagem_url} alt={item.nome_produto} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageOff className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-gray-900">
                              {item.nome_produto}
                              {item.nome_variacao && (
                                <span className="text-green-600 font-medium"> ({item.nome_variacao})</span>
                              )}
                            </h4>
                            {/* Badge de prioridade */}
                            {item.prioridade && item.prioridade !== 'normal' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPrioridadeConfig(item.prioridade).bgCor} ${getPrioridadeConfig(item.prioridade).cor}`}>
                                {item.prioridade === 'urgente' ? <Flame className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                {getPrioridadeConfig(item.prioridade).texto}
                              </span>
                            )}
                            {/* Contagem de pedidos por prioridade */}
                            {item.pedidos.length > 1 && (
                              <span className="text-xs text-gray-500">
                                ({item.pedidos.length} pedidos:
                                {(() => {
                                  const counts: Record<string, number> = { urgente: 0, alta: 0, normal: 0 };
                                  item.pedidos.forEach(p => {
                                    const prio = p.prioridade || 'normal';
                                    counts[prio]++;
                                  });
                                  const parts = [];
                                  if (counts.urgente > 0) parts.push(`${counts.urgente} urg`);
                                  if (counts.alta > 0) parts.push(`${counts.alta} alta`);
                                  if (counts.normal > 0) parts.push(`${counts.normal} normal`);
                                  return ' ' + parts.join(', ');
                                })()})
                              </span>
                            )}
                            {/* Data de entrega */}
                            {item.data_entrega && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                <Calendar className="w-3 h-3" />
                                {new Date(item.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>

                          {/* Quantidades em cards */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm">
                              <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
                              <strong>{item.quantidade_pedida}</strong> vendidos
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-sm font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <strong>{item.quantidade_pedida}</strong> do estoque
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 rounded text-sm">
                              <Printer className="w-3.5 h-3.5" />
                              <strong>0</strong> produzir
                            </span>
                          </div>
                        </div>

                        {/* Botão */}
                        <button
                          onClick={() => handleAbrirConcluir(item)}
                          disabled={concluindo}
                          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Concluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
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
                        onClick={() => handleCancelarPedido(pedido.id!)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancelar pedido"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Novo Pedido</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModoKit(false);
                  setItensKit([]);
                  setProdutoSelecionado('');
                  setVariacaoSelecionada('');
                }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Alternância Produto/Kit */}
              <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setModoKit(false);
                    setItensKit([]);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    !modoKit
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Produto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoKit(true);
                    setVariacaoSelecionada('');
                    setQuantidade(1);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    modoKit
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Kit
                </button>
              </div>

              {/* Modo Kit: Adicionar múltiplos produtos */}
              {modoKit && (
                <div className="space-y-3">
                  {/* Lista de itens do kit */}
                  {itensKit.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {itensKit.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg"
                        >
                          {item.imagem_url ? (
                            <img src={item.imagem_url} alt={item.produto_nome} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <ImageOff className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.produto_nome}
                            </p>
                            {item.variacao_nome && (
                              <p className="text-xs text-indigo-600 dark:text-indigo-400">{item.variacao_nome}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setItensKit(prev => prev.map(i =>
                                i.id === item.id ? { ...i, quantidade: Math.max(1, i.quantidade - 1) } : i
                              ))}
                              className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-semibold">{item.quantidade}</span>
                            <button
                              type="button"
                              onClick={() => setItensKit(prev => prev.map(i =>
                                i.id === item.id ? { ...i, quantidade: i.quantidade + 1 } : i
                              ))}
                              className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => setItensKit(prev => prev.filter(i => i.id !== item.id))}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adicionar produto ao kit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Adicionar produto ao kit
                    </label>
                    <select
                      value={produtoSelecionado}
                      onChange={(e) => {
                        setProdutoSelecionado(e.target.value);
                        setVariacaoSelecionada('');
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
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

                  {/* Variação do produto selecionado */}
                  {produtoSelecionado && variacoesProduto.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Variacao
                      </label>
                      <select
                        value={variacaoSelecionada}
                        onChange={(e) => setVariacaoSelecionada(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
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

                  {/* Botão adicionar ao kit */}
                  {produtoSelecionado && (
                    <button
                      type="button"
                      onClick={() => {
                        const produto = produtos.find(p => p.id === produtoSelecionado);
                        const variacao = variacoesProduto.find(v => v.id === variacaoSelecionada);
                        if (produto) {
                          setItensKit(prev => [...prev, {
                            id: `${produto.id}-${variacao?.id || 'base'}-${Date.now()}`,
                            produto_id: produto.id!,
                            variacao_id: variacao?.id,
                            produto_nome: produto.nome,
                            variacao_nome: variacao?.nome_variacao,
                            quantidade: 1,
                            imagem_url: produto.imagem_url,
                            peso: variacao?.peso_filamento || produto.peso_filamento,
                            tempo: variacao?.tempo_impressao || produto.tempo_impressao,
                          }]);
                          setProdutoSelecionado('');
                          setVariacaoSelecionada('');
                        }
                      }}
                      className="w-full px-3 py-2 border-2 border-dashed border-indigo-300 dark:border-indigo-600 rounded-lg
                        text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors
                        flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar ao kit
                    </button>
                  )}

                  {/* Resumo do Kit */}
                  {itensKit.length > 0 && (
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700">
                      <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400">
                        <span className="flex items-center gap-1">
                          <Cylinder className="w-3 h-3" />
                          {kitInfo.pesoTotal.toFixed(0)}g
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.floor(kitInfo.tempoTotal / 60)}h {Math.round(kitInfo.tempoTotal % 60)}min
                        </span>
                        <span className="font-medium">
                          {kitInfo.quantidadeTotal} {kitInfo.quantidadeTotal === 1 ? 'peca' : 'pecas'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Produto (modo normal) */}
              {!modoKit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Produto
                  </label>
                  <select
                    value={produtoSelecionado}
                    onChange={(e) => {
                      setProdutoSelecionado(e.target.value);
                      setVariacaoSelecionada('');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
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
              )}

              {/* Variação (modo normal) */}
              {!modoKit && variacoesProduto.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Variacao (opcional)
                  </label>
                  <select
                    value={variacaoSelecionada}
                    onChange={(e) => setVariacaoSelecionada(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white
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

              {/* Quantidade com controles [-] [+] (modo normal) */}
              {!modoKit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantidade vendida
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600
                        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-lg font-semibold
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantidade(quantidade + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600
                        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Data de Entrega */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data de entrega (opcional)
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dataEntrega}
                    onChange={(e) => {
                      setDataEntrega(e.target.value);
                      // Calcular prioridade automatica
                      if (e.target.value) {
                        setPrioridade(calcularPrioridade(e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                      bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  A prioridade sera calculada automaticamente
                </p>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prioridade
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPrioridade('normal')}
                    className={`flex-1 px-3 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      prioridade === 'normal'
                        ? 'border-gray-500 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Circle className="w-3 h-3" />
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridade('alta')}
                    className={`flex-1 px-3 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      prioridade === 'alta'
                        ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Alta
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrioridade('urgente')}
                    className={`flex-1 px-3 py-2 rounded-lg border flex items-center justify-center gap-2 transition-colors ${
                      prioridade === 'urgente'
                        ? 'border-red-500 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    Urgente
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => {
                  setShowModal(false);
                  setModoKit(false);
                  setItensKit([]);
                  setProdutoSelecionado('');
                  setVariacaoSelecionada('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPedido}
                disabled={
                  (modoKit ? itensKit.length === 0 : (!produtoSelecionado || quantidade < 1)) ||
                  saving
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : modoKit ? (
                  <Layers className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {modoKit ? `Adicionar Kit (${kitInfo.quantidadeTotal})` : 'Adicionar'}
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
                  Quantidade a produzir
                </label>
                <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 font-medium">
                  {itemParaProduzir.quantidade_produzir} peças
                </div>
              </div>

              {/* Selecionar impressora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Impressora utilizada
                </label>
                <select
                  value={impressoraId}
                  onChange={(e) => setImpressoraId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione uma impressora</option>
                  {impressorasDisponiveis.map((imp) => (
                    <option key={imp.id} value={imp.id}>
                      {imp.apelido || imp.modelo} {imp.marca ? `(${imp.marca})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selecionar filamento */}
              {(() => {
                const pesoNecessario = qtdProduzida * itemParaProduzir.peso_por_peca;
                const filamentoSelecionado = filamentos.find(f => f.id === filamentoId);
                const estoqueInsuficiente = filamentoSelecionado && pesoNecessario > filamentoSelecionado.estoque_gramas;
                return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filamento utilizado
                  </label>
                  <select
                    value={filamentoId}
                    onChange={(e) => setFilamentoId(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      estoqueInsuficiente ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione um filamento</option>
                    {filamentos.map((fil) => {
                      const semEstoque = fil.estoque_gramas <= 0;
                      const insuficiente = pesoNecessario > fil.estoque_gramas;
                      return (
                        <option
                          key={fil.id}
                          value={fil.id}
                          disabled={semEstoque}
                          className={insuficiente ? 'text-red-600' : ''}
                        >
                          {fil.marca} {fil.nome_filamento} - {fil.cor} ({(fil.estoque_gramas / 1000).toFixed(2)}kg em estoque)
                          {semEstoque ? ' - SEM ESTOQUE' : insuficiente ? ' - INSUFICIENTE' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {estoqueInsuficiente && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Estoque insuficiente! Necessário: {pesoNecessario.toFixed(0)}g, disponível: {filamentoSelecionado.estoque_gramas.toFixed(0)}g
                    </p>
                  )}
                </div>
                );
              })()}

              {/* Embalagens (opcional) */}
              {embalagensDisponiveis.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Embalagens (opcional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {embalagensDisponiveis.map((emb) => {
                      const selecionada = embalagensSelecionadas.find(e => e.id === emb.id);
                      const estoqueDisponivel = emb.quantidade || 0;
                      const qtdSelecionada = selecionada?.quantidade || 0;
                      const semEstoque = estoqueDisponivel <= 0;
                      const atingiuLimite = (qtdSelecionada + 1) * qtdProduzida > estoqueDisponivel;
                      return (
                        <div key={emb.id} className={`flex items-center justify-between gap-2 py-1 ${semEstoque ? 'opacity-50' : ''}`}>
                          <span className={`text-sm flex-1 ${semEstoque ? 'text-gray-400' : 'text-gray-700'}`}>
                            {emb.nome_embalagem} {emb.tamanho && `(${emb.tamanho})`}
                            <span className={semEstoque ? 'text-red-400 ml-1 font-medium' : 'text-gray-400 ml-1'}>
                              {semEstoque ? '- Sem estoque' : `- ${estoqueDisponivel} disp.`}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionada && selecionada.quantidade > 0) {
                                  setEmbalagensSelecionadas(prev =>
                                    prev.map(e => e.id === emb.id ? {...e, quantidade: e.quantidade - 1} : e)
                                      .filter(e => e.quantidade > 0)
                                  );
                                }
                              }}
                              disabled={!selecionada || selecionada.quantidade <= 0}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {qtdSelecionada}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionada) {
                                  setEmbalagensSelecionadas(prev =>
                                    prev.map(e => e.id === emb.id ? {...e, quantidade: e.quantidade + 1} : e)
                                  );
                                } else {
                                  setEmbalagensSelecionadas(prev => [...prev, {id: emb.id, quantidade: 1}]);
                                }
                              }}
                              disabled={semEstoque || atingiuLimite}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Acessórios (opcional) */}
              {acessoriosDisponiveis.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acessorios (opcional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {acessoriosDisponiveis.map((acess) => {
                      const selecionado = acessoriosSelecionados.find(a => a.id === acess.id);
                      const estoqueDisponivel = acess.estoque_atual || 0;
                      const qtdSelecionado = selecionado?.quantidade || 0;
                      const semEstoque = estoqueDisponivel <= 0;
                      const atingiuLimite = (qtdSelecionado + 1) * qtdProduzida > estoqueDisponivel;
                      return (
                        <div key={acess.id} className={`flex items-center justify-between gap-2 py-1 ${semEstoque ? 'opacity-50' : ''}`}>
                          <span className={`text-sm flex-1 ${semEstoque ? 'text-gray-400' : 'text-gray-700'}`}>
                            {acess.nome}
                            <span className={semEstoque ? 'text-red-400 ml-1 font-medium' : 'text-gray-400 ml-1'}>
                              {semEstoque ? '- Sem estoque' : `- ${estoqueDisponivel} disp.`}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionado && selecionado.quantidade > 0) {
                                  setAcessoriosSelecionados(prev =>
                                    prev.map(a => a.id === acess.id ? {...a, quantidade: a.quantidade - 1} : a)
                                      .filter(a => a.quantidade > 0)
                                  );
                                }
                              }}
                              disabled={!selecionado || selecionado.quantidade <= 0}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {qtdSelecionado}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionado) {
                                  setAcessoriosSelecionados(prev =>
                                    prev.map(a => a.id === acess.id ? {...a, quantidade: a.quantidade + 1} : a)
                                  );
                                } else {
                                  setAcessoriosSelecionados(prev => [...prev, {id: acess.id, quantidade: 1}]);
                                }
                              }}
                              disabled={semEstoque || atingiuLimite}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                <div className="flex justify-between text-sm text-green-800">
                  <span>Pecas produzidas:</span>
                  <span className="font-bold">{qtdProduzida}</span>
                </div>
                {impressoraId && (
                  <div className="flex justify-between text-sm text-green-800">
                    <span>Impressora:</span>
                    <span className="font-bold">
                      {impressorasDisponiveis.find(i => i.id === impressoraId)?.apelido ||
                       impressorasDisponiveis.find(i => i.id === impressoraId)?.modelo || '-'}
                    </span>
                  </div>
                )}
                {filamentoId && (
                  <div className="flex justify-between text-sm text-green-800">
                    <span>Filamento:</span>
                    <span className="font-bold">
                      {filamentos.find(f => f.id === filamentoId)?.cor || '-'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-green-800">
                  <span>Peso a descontar:</span>
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
                  <li>• -{(qtdProduzida * itemParaProduzir.peso_por_peca).toFixed(0)}g descontados do filamento</li>
                </ul>
              </div>
            </div>

            {(() => {
              const pesoNecessario = qtdProduzida * itemParaProduzir.peso_por_peca;
              const filamentoSelecionado = filamentos.find(f => f.id === filamentoId);
              const filamentoInsuficiente = filamentoSelecionado && pesoNecessario > filamentoSelecionado.estoque_gramas;
              return (
              <div className="flex justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
                <button
                  onClick={() => setShowProduzidoModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMarcarProduzido}
                  disabled={qtdProduzida < 1 || produzindo || !impressoraId || !filamentoId || filamentoInsuficiente}
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
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal Concluir (do estoque) */}
      {showConcluirModal && itemParaConcluir && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Concluir do Estoque</h3>
              <button
                onClick={() => setShowConcluirModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Info do produto */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden">
                  {itemParaConcluir.imagem_url ? (
                    <img
                      src={itemParaConcluir.imagem_url}
                      alt={itemParaConcluir.nome_produto}
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
                    {itemParaConcluir.nome_produto}
                  </p>
                  {itemParaConcluir.nome_variacao && (
                    <p className="text-sm text-indigo-600">{itemParaConcluir.nome_variacao}</p>
                  )}
                  <p className="text-sm text-green-600 font-medium">
                    {itemParaConcluir.pedidos.reduce((acc, p) => acc + (p.quantidade - (p.quantidade_produzida || 0)), 0)} unidade(s) do estoque
                  </p>
                </div>
              </div>

              {/* Embalagens (opcional) */}
              {embalagensDisponiveis.length > 0 && (() => {
                const qtdConcluir = itemParaConcluir.pedidos.reduce((acc, p) => acc + (p.quantidade - (p.quantidade_produzida || 0)), 0);
                return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Embalagens (opcional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {embalagensDisponiveis.map((emb) => {
                      const selecionada = embalagensSelecionadas.find(e => e.id === emb.id);
                      const estoqueDisponivel = emb.quantidade || 0;
                      const qtdSelecionada = selecionada?.quantidade || 0;
                      const semEstoque = estoqueDisponivel <= 0;
                      const atingiuLimite = (qtdSelecionada + 1) * qtdConcluir > estoqueDisponivel;
                      return (
                        <div key={emb.id} className={`flex items-center justify-between gap-2 py-1 ${semEstoque ? 'opacity-50' : ''}`}>
                          <span className={`text-sm flex-1 ${semEstoque ? 'text-gray-400' : 'text-gray-700'}`}>
                            {emb.nome_embalagem} {emb.tamanho && `(${emb.tamanho})`}
                            <span className={semEstoque ? 'text-red-400 ml-1 font-medium' : 'text-gray-400 ml-1'}>
                              {semEstoque ? '- Sem estoque' : `- ${estoqueDisponivel} disp.`}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionada && selecionada.quantidade > 0) {
                                  setEmbalagensSelecionadas(prev =>
                                    prev.map(e => e.id === emb.id ? {...e, quantidade: e.quantidade - 1} : e)
                                      .filter(e => e.quantidade > 0)
                                  );
                                }
                              }}
                              disabled={!selecionada || selecionada.quantidade <= 0}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {qtdSelecionada}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionada) {
                                  setEmbalagensSelecionadas(prev =>
                                    prev.map(e => e.id === emb.id ? {...e, quantidade: e.quantidade + 1} : e)
                                  );
                                } else {
                                  setEmbalagensSelecionadas(prev => [...prev, {id: emb.id, quantidade: 1}]);
                                }
                              }}
                              disabled={semEstoque || atingiuLimite}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {/* Acessórios (opcional) */}
              {acessoriosDisponiveis.length > 0 && (() => {
                const qtdConcluir = itemParaConcluir.pedidos.reduce((acc, p) => acc + (p.quantidade - (p.quantidade_produzida || 0)), 0);
                return (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acessorios (opcional)
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {acessoriosDisponiveis.map((acess) => {
                      const selecionado = acessoriosSelecionados.find(a => a.id === acess.id);
                      const estoqueDisponivel = acess.estoque_atual || 0;
                      const qtdSelecionado = selecionado?.quantidade || 0;
                      const semEstoque = estoqueDisponivel <= 0;
                      const atingiuLimite = (qtdSelecionado + 1) * qtdConcluir > estoqueDisponivel;
                      return (
                        <div key={acess.id} className={`flex items-center justify-between gap-2 py-1 ${semEstoque ? 'opacity-50' : ''}`}>
                          <span className={`text-sm flex-1 ${semEstoque ? 'text-gray-400' : 'text-gray-700'}`}>
                            {acess.nome}
                            <span className={semEstoque ? 'text-red-400 ml-1 font-medium' : 'text-gray-400 ml-1'}>
                              {semEstoque ? '- Sem estoque' : `- ${estoqueDisponivel} disp.`}
                            </span>
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionado && selecionado.quantidade > 0) {
                                  setAcessoriosSelecionados(prev =>
                                    prev.map(a => a.id === acess.id ? {...a, quantidade: a.quantidade - 1} : a)
                                      .filter(a => a.quantidade > 0)
                                  );
                                }
                              }}
                              disabled={!selecionado || selecionado.quantidade <= 0}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-sm font-medium">
                              {qtdSelecionado}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selecionado) {
                                  setAcessoriosSelecionados(prev =>
                                    prev.map(a => a.id === acess.id ? {...a, quantidade: a.quantidade + 1} : a)
                                  );
                                } else {
                                  setAcessoriosSelecionados(prev => [...prev, {id: acess.id, quantidade: 1}]);
                                }
                              }}
                              disabled={semEstoque || atingiuLimite}
                              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {/* Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  O produto ja esta no estoque. Selecione embalagens e acessorios se necessario.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
              <button
                onClick={() => setShowConcluirModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConcluirComEmbalagens}
                disabled={concluindo}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {concluindo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar Pedidos */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                Importar Pedidos
              </h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setTextoImportacao('');
                  setPedidosImportados([]);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              {/* Instrucoes */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Cole os pedidos copiados do marketplace
                </p>
                <p className="text-xs text-blue-600">
                  Formatos aceitos: "3x Produto", "Produto - 3", "Produto x3", "Produto (3)"
                </p>
              </div>

              {/* Campo de texto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pedidos
                </label>
                <textarea
                  value={textoImportacao}
                  onChange={(e) => setTextoImportacao(e.target.value)}
                  placeholder={`Cole os pedidos aqui, um por linha:

3x Estatueta Gatos Irmaos Medio
2x Estatueta Gatos Irmaos Grande
5x Dragao Articulado`}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none
                    font-mono text-sm"
                />
              </div>

              {/* Botoes de acao */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAnalisarPedidos}
                  disabled={!textoImportacao.trim() || analisando}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg
                    hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analisando ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Analisar Pedidos
                </button>
                <button
                  onClick={handleLimparImportacao}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar
                </button>
              </div>

              {/* Resultado da analise */}
              {pedidosImportados.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">
                    Pedidos analisados ({pedidosImportados.length})
                  </h4>

                  <div className="space-y-2">
                    {pedidosImportados.map((pedido, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          pedido.status === 'encontrado'
                            ? 'bg-green-50 border-green-200'
                            : pedido.status === 'selecionar_variacao'
                            ? 'bg-purple-50 border-purple-200'
                            : pedido.status === 'variacao_nao_encontrada'
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {pedido.status === 'encontrado' ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              ) : pedido.status === 'selecionar_variacao' ? (
                                <Package className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              ) : pedido.status === 'variacao_nao_encontrada' ? (
                                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                              )}
                              <span className={`font-medium ${
                                pedido.status === 'encontrado'
                                  ? 'text-green-800'
                                  : pedido.status === 'selecionar_variacao'
                                  ? 'text-purple-800'
                                  : pedido.status === 'variacao_nao_encontrada'
                                  ? 'text-yellow-800'
                                  : 'text-red-800'
                              }`}>
                                {pedido.nomeProduto}
                                {pedido.nomeVariacao && (
                                  <span className="font-normal"> - {pedido.nomeVariacao}</span>
                                )}
                              </span>
                              {pedido.status === 'selecionar_variacao' && (
                                <span className="px-1.5 py-0.5 text-xs bg-purple-200 text-purple-700 rounded">
                                  Tem variacoes
                                </span>
                              )}
                            </div>
                            <p className={`text-xs mt-1 ${
                              pedido.status === 'encontrado'
                                ? 'text-green-600'
                                : pedido.status === 'selecionar_variacao'
                                ? 'text-purple-600'
                                : pedido.status === 'variacao_nao_encontrada'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {pedido.status === 'encontrado'
                                ? pedido.variacoesSelecionadas && pedido.variacoesSelecionadas.length > 0
                                  ? `${pedido.produtoEncontrado?.nome}: ${pedido.variacoesSelecionadas.map(v => `${v.quantidade}x ${v.nome_variacao}`).join(', ')}`
                                  : `Encontrado: ${pedido.produtoEncontrado?.nome}${pedido.variacaoEncontrada ? ` (${pedido.variacaoEncontrada.nome_variacao})` : ''}`
                                : pedido.status === 'selecionar_variacao'
                                ? `Selecione as variacoes (${pedido.quantidade - (pedido.variacoesSelecionadas || []).reduce((s, v) => s + v.quantidade, 0)} restante${pedido.quantidade - (pedido.variacoesSelecionadas || []).reduce((s, v) => s + v.quantidade, 0) > 1 ? 's' : ''})`
                                : pedido.status === 'variacao_nao_encontrada'
                                ? `Produto encontrado, mas variacao "${pedido.nomeVariacao}" nao existe`
                                : 'Produto nao encontrado no Radar'}
                            </p>

                            {/* Seleção de múltiplas variações */}
                            {(pedido.status === 'selecionar_variacao' || pedido.status === 'variacao_nao_encontrada' ||
                              (pedido.status === 'encontrado' && pedido.variacoesSelecionadas && pedido.variacoesSelecionadas.length > 0)) &&
                              pedido.produtoEncontrado?.variacoes && pedido.produtoEncontrado.variacoes.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {/* Variações já selecionadas */}
                                {pedido.variacoesSelecionadas && pedido.variacoesSelecionadas.length > 0 && (
                                  <div className="space-y-1">
                                    {pedido.variacoesSelecionadas.map(v => (
                                      <div key={v.id} className="flex items-center gap-2 bg-white rounded px-2 py-1 border">
                                        <span className="flex-1 text-sm text-gray-700">{v.nome_variacao}</span>
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleAtualizarQtdVariacao(index, v.id, v.quantidade - 1)}
                                            disabled={v.quantidade <= 1}
                                            className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </button>
                                          <span className="w-6 text-center text-sm font-medium">{v.quantidade}</span>
                                          <button
                                            onClick={() => handleAtualizarQtdVariacao(index, v.id, v.quantidade + 1)}
                                            className="p-0.5 text-gray-400 hover:text-gray-600"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </button>
                                        </div>
                                        <button
                                          onClick={() => handleRemoverVariacao(index, v.id)}
                                          className="p-0.5 text-red-400 hover:text-red-600"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Adicionar nova variação */}
                                {(() => {
                                  const totalSelecionado = (pedido.variacoesSelecionadas || []).reduce((sum, v) => sum + v.quantidade, 0);
                                  const restante = pedido.quantidade - totalSelecionado;

                                  if (restante <= 0) return null;

                                  return (
                                    <div className="flex items-center gap-2">
                                      <select
                                        id={`variacao-${index}`}
                                        defaultValue=""
                                        className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5
                                          focus:outline-none focus:ring-2 focus:ring-purple-500"
                                      >
                                        <option value="">Adicionar variacao... ({restante} restante{restante > 1 ? 's' : ''})</option>
                                        {pedido.produtoEncontrado!.variacoes!.map(v => (
                                          <option key={v.id} value={v.id}>
                                            {v.nome_variacao} {v.sku ? `(${v.sku})` : ''}
                                          </option>
                                        ))}
                                      </select>
                                      <input
                                        type="number"
                                        id={`qtd-${index}`}
                                        min="1"
                                        max={restante}
                                        defaultValue="1"
                                        className="w-14 text-sm border border-gray-300 rounded-lg px-2 py-1.5 text-center"
                                      />
                                      <button
                                        onClick={() => {
                                          const selectEl = document.getElementById(`variacao-${index}`) as HTMLSelectElement;
                                          const qtdEl = document.getElementById(`qtd-${index}`) as HTMLInputElement;
                                          if (selectEl.value) {
                                            handleAdicionarVariacao(index, selectEl.value, parseInt(qtdEl.value) || 1);
                                            selectEl.value = '';
                                            qtdEl.value = '1';
                                          }
                                        }}
                                        className="px-2 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded text-sm font-bold ${
                            pedido.status === 'encontrado'
                              ? 'bg-green-200 text-green-800'
                              : pedido.status === 'selecionar_variacao'
                              ? 'bg-purple-200 text-purple-800'
                              : pedido.status === 'variacao_nao_encontrada'
                              ? 'bg-yellow-200 text-yellow-800'
                              : 'bg-red-200 text-red-800'
                          }`}>
                            x{pedido.quantidade}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumo */}
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prontos para importar:</span>
                      <span className="font-bold text-green-600">
                        {pedidosImportados.filter(p => p.status === 'encontrado').length} pedidos
                      </span>
                    </div>
                    {pedidosImportados.some(p => p.status === 'selecionar_variacao') && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Selecionar variacao:</span>
                        <span className="font-bold text-purple-600">
                          {pedidosImportados.filter(p => p.status === 'selecionar_variacao').length} pedidos
                        </span>
                      </div>
                    )}
                    {pedidosImportados.some(p => p.status === 'nao_encontrado' || p.status === 'variacao_nao_encontrada') && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Com problemas:</span>
                        <span className="font-bold text-red-600">
                          {pedidosImportados.filter(p => p.status === 'nao_encontrado' || p.status === 'variacao_nao_encontrada').length} pedidos
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-white">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setTextoImportacao('');
                  setPedidosImportados([]);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportarPedidos}
                disabled={pedidosImportados.filter(p => p.status === 'encontrado').length === 0 || importando}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-2"
              >
                {importando ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Importar {pedidosImportados.filter(p => p.status === 'encontrado').length} Pedidos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Configurar Impressoras */}
      {showImpressorasConfig && (
        <ModalImpressoras
          impressorasDisponiveis={impressorasDisponiveis}
          impressorasSelecionadasIds={impressorasSelecionadasIds}
          onSave={handleSaveImpressoras}
          onClose={() => setShowImpressorasConfig(false)}
        />
      )}

      {/* Modal Pedidos Mercado Livre */}
      {showMLModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Importar Pedidos do Mercado Livre
                  </h3>
                  <p className="text-sm text-gray-500">
                    {mlOrdersWithMatch.length} pedido(s) para revisar
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMLModal(false);
                  setMlOrdersWithMatch([]);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {mlAnalyzing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-yellow-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Analisando pedidos e buscando correspondencias...</p>
                </div>
              ) : mlOrdersWithMatch.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum pedido pendente para importar!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selecionar todos */}
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={mlOrdersWithMatch.every(item => item.selecionado)}
                        onChange={(e) => {
                          setMlOrdersWithMatch(prev => prev.map(item => ({
                            ...item,
                            selecionado: e.target.checked && (item.produtoMatch || item.produtoManual) !== undefined
                          })));
                        }}
                        className="w-4 h-4 text-yellow-600 rounded"
                      />
                      <span className="text-sm text-gray-600">Selecionar todos com produto</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="w-3 h-3" /> SKU
                      </span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <Search className="w-3 h-3" /> Nome
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-3 h-3" /> Nao encontrado
                      </span>
                    </div>
                  </div>

                  {mlOrdersWithMatch.map((item) => {
                    const produtoFinal = item.produtoManual || item.produtoMatch;
                    const variacaoFinal = item.variacaoManual || item.variacaoMatch;
                    const temVariacoes = item.order.variation || (produtoFinal?.variacoes && produtoFinal.variacoes.length > 0);

                    return (
                      <div
                        key={item.order.id}
                        className={`rounded-lg border-2 transition-colors ${
                          item.selecionado
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200'
                        }`}
                      >
                        {/* Linha principal */}
                        <div className="p-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.selecionado}
                            onChange={() => toggleMLOrderSelection(item.order.id!)}
                            className="w-4 h-4 text-yellow-600 rounded"
                          />

                          <button
                            onClick={() => toggleMLOrderExpand(item.order.id!)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {item.expanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900 truncate">
                                {item.order.product_title}
                              </p>
                              {temVariacoes && (
                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                  Com variacoes
                                </span>
                              )}
                            </div>
                            {item.order.variation && (
                              <p className="text-sm text-gray-500 truncate">
                                ML: {item.order.variation}
                              </p>
                            )}
                            {produtoFinal && (
                              <p className="text-sm text-green-600 truncate">
                                → {produtoFinal.nome}{variacaoFinal ? ` - ${variacaoFinal.nome_variacao}` : ''}
                              </p>
                            )}
                          </div>

                          {/* Quantidade fixa (marketplace) */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                            <Package className="w-3 h-3" />
                            x{item.order.quantity}
                          </div>

                          {/* Badge de status */}
                          <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                            item.matchStatus === 'encontrado_sku'
                              ? 'bg-green-100 text-green-700'
                              : item.matchStatus === 'encontrado_nome'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.matchStatus === 'encontrado_sku'
                              ? 'SKU'
                              : item.matchStatus === 'encontrado_nome'
                              ? 'Nome'
                              : 'Nao encontrado'}
                          </span>
                        </div>

                        {/* Area expandida */}
                        {item.expanded && (
                          <div className="px-4 pb-4 pt-2 border-t bg-gray-50 space-y-3">
                            {/* Informacoes do pedido ML */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Pedido ML:</span>{' '}
                                <span className="font-mono">{item.order.ml_order_id}</span>
                              </div>
                              {item.order.seller_sku && (
                                <div>
                                  <span className="text-gray-500">SKU:</span>{' '}
                                  <span className="font-mono text-blue-600">{item.order.seller_sku}</span>
                                </div>
                              )}
                              {item.order.buyer_nickname && (
                                <div>
                                  <span className="text-gray-500">Comprador:</span>{' '}
                                  {item.order.buyer_nickname}
                                </div>
                              )}
                              {item.order.unit_price && (
                                <div>
                                  <span className="text-gray-500">Preco:</span>{' '}
                                  <span className="text-green-600">R$ {item.order.unit_price.toFixed(2)}</span>
                                </div>
                              )}
                              {item.order.date_created && (
                                <div>
                                  <span className="text-gray-500">Data:</span>{' '}
                                  {new Date(item.order.date_created).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Qtd original:</span>{' '}
                                <span className="font-semibold">{item.order.quantity}</span>
                              </div>
                            </div>

                            {/* Selecao manual de produto */}
                            <div className="pt-2 border-t">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Edit3 className="w-4 h-4 inline mr-1" />
                                Selecionar produto manualmente:
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={produtoFinal?.id || ''}
                                  onChange={(e) => {
                                    const prodId = e.target.value;
                                    if (prodId) {
                                      setMLOrderManualProduct(item.order.id!, prodId);
                                    }
                                  }}
                                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
                                >
                                  <option value="">Selecionar produto...</option>
                                  {produtos.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.nome} {p.sku ? `(${p.sku})` : ''}
                                    </option>
                                  ))}
                                </select>

                                {/* Selecao de variacao se o produto tiver */}
                                {produtoFinal?.variacoes && produtoFinal.variacoes.length > 0 && (
                                  <select
                                    value={variacaoFinal?.id || ''}
                                    onChange={(e) => {
                                      const varId = e.target.value;
                                      setMLOrderManualProduct(item.order.id!, produtoFinal.id!, varId || undefined);
                                    }}
                                    className="w-48 text-sm border border-gray-300 rounded-lg px-3 py-2"
                                  >
                                    <option value="">Sem variacao</option>
                                    {produtoFinal.variacoes.map(v => (
                                      <option key={v.id} value={v.id}>
                                        {v.nome_variacao} {v.sku ? `(${v.sku})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{mlOrdersWithMatch.filter(i => i.selecionado).length}</span> selecionado(s) de {mlOrdersWithMatch.length}
                {mlOrdersWithMatch.filter(i => i.matchStatus === 'nao_encontrado' && !i.produtoManual).length > 0 && (
                  <span className="text-red-500 ml-2">
                    ({mlOrdersWithMatch.filter(i => i.matchStatus === 'nao_encontrado' && !i.produtoManual).length} sem produto)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowMLModal(false);
                    setMlOrdersWithMatch([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportMLOrders}
                  disabled={mlOrdersWithMatch.filter(i => i.selecionado).length === 0 || mlImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg
                    hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {mlImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Importar Selecionados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pedidos TikTok Shop */}
      {showTikTokModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-900 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Importar Pedidos do TikTok Shop
                  </h3>
                  <p className="text-sm text-gray-500">
                    {tiktokOrdersWithMatch.length} pedido(s) para revisar
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTikTokModal(false);
                  setTiktokOrdersWithMatch([]);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {tiktokAnalyzing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-gray-700 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Analisando pedidos e buscando correspondencias...</p>
                </div>
              ) : tiktokOrdersWithMatch.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum pedido pendente para importar!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selecionar todos */}
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={tiktokOrdersWithMatch.every(item => item.selecionado)}
                        onChange={(e) => {
                          setTiktokOrdersWithMatch(prev => prev.map(item => ({
                            ...item,
                            selecionado: e.target.checked && (item.produtoMatch || item.produtoManual) !== undefined
                          })));
                        }}
                        className="w-4 h-4 text-gray-700 rounded"
                      />
                      <span className="text-sm text-gray-600">Selecionar todos com produto</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="w-3 h-3" /> SKU
                      </span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <Search className="w-3 h-3" /> Nome
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-3 h-3" /> Nao encontrado
                      </span>
                    </div>
                  </div>

                  {tiktokOrdersWithMatch.map((item) => {
                    const produtoFinal = item.produtoManual || item.produtoMatch;
                    const variacaoFinal = item.variacaoManual || item.variacaoMatch;
                    const temVariacoes = item.order.variation || (produtoFinal?.variacoes && produtoFinal.variacoes.length > 0);

                    return (
                      <div
                        key={item.order.id}
                        className={`rounded-lg border-2 transition-colors ${
                          item.selecionado
                            ? 'border-gray-700 bg-gray-50'
                            : 'border-gray-200'
                        }`}
                      >
                        {/* Linha principal */}
                        <div className="p-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.selecionado}
                            onChange={() => toggleTikTokOrderSelection(item.order.id!)}
                            className="w-4 h-4 text-gray-700 rounded"
                          />

                          <button
                            onClick={() => toggleTikTokOrderExpand(item.order.id!)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {item.expanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900 truncate">
                                {item.order.product_title}
                              </p>
                              {temVariacoes && (
                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                  Com variacoes
                                </span>
                              )}
                            </div>
                            {item.order.variation && (
                              <p className="text-sm text-gray-500 truncate">
                                TikTok: {item.order.variation}
                              </p>
                            )}
                            {produtoFinal && (
                              <p className="text-sm text-green-600 truncate">
                                → {produtoFinal.nome}{variacaoFinal ? ` - ${variacaoFinal.nome_variacao}` : ''}
                              </p>
                            )}
                          </div>

                          {/* Quantidade fixa (marketplace) */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-sm font-semibold">
                            <Package className="w-3 h-3" />
                            x{item.order.quantity}
                          </div>

                          {/* Badge de status */}
                          <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                            item.matchStatus === 'encontrado_sku'
                              ? 'bg-green-100 text-green-700'
                              : item.matchStatus === 'encontrado_nome'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.matchStatus === 'encontrado_sku'
                              ? 'SKU'
                              : item.matchStatus === 'encontrado_nome'
                              ? 'Nome'
                              : 'Nao encontrado'}
                          </span>
                        </div>

                        {/* Area expandida */}
                        {item.expanded && (
                          <div className="px-4 pb-4 pt-2 border-t bg-gray-50 space-y-3">
                            {/* Informacoes do pedido TikTok */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Pedido TikTok:</span>{' '}
                                <span className="font-mono">{item.order.tiktok_order_id}</span>
                              </div>
                              {item.order.seller_sku && (
                                <div>
                                  <span className="text-gray-500">SKU:</span>{' '}
                                  <span className="font-mono text-blue-600">{item.order.seller_sku}</span>
                                </div>
                              )}
                              {item.order.buyer_name && (
                                <div>
                                  <span className="text-gray-500">Comprador:</span>{' '}
                                  {item.order.buyer_name}
                                </div>
                              )}
                              {item.order.unit_price && (
                                <div>
                                  <span className="text-gray-500">Preco:</span>{' '}
                                  <span className="text-green-600">R$ {item.order.unit_price.toFixed(2)}</span>
                                </div>
                              )}
                              {item.order.date_created && (
                                <div>
                                  <span className="text-gray-500">Data:</span>{' '}
                                  {new Date(item.order.date_created).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Qtd original:</span>{' '}
                                <span className="font-semibold">{item.order.quantity}</span>
                              </div>
                            </div>

                            {/* Selecao manual de produto */}
                            <div className="pt-2 border-t">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Edit3 className="w-4 h-4 inline mr-1" />
                                Selecionar produto manualmente:
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={produtoFinal?.id || ''}
                                  onChange={(e) => {
                                    const prodId = e.target.value;
                                    if (prodId) {
                                      setTikTokOrderManualProduct(item.order.id!, prodId);
                                    }
                                  }}
                                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
                                >
                                  <option value="">Selecionar produto...</option>
                                  {produtos.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.nome} {p.sku ? `(${p.sku})` : ''}
                                    </option>
                                  ))}
                                </select>

                                {/* Selecao de variacao se o produto tiver */}
                                {produtoFinal?.variacoes && produtoFinal.variacoes.length > 0 && (
                                  <select
                                    value={variacaoFinal?.id || ''}
                                    onChange={(e) => {
                                      const varId = e.target.value;
                                      setTikTokOrderManualProduct(item.order.id!, produtoFinal.id!, varId || undefined);
                                    }}
                                    className="w-48 text-sm border border-gray-300 rounded-lg px-3 py-2"
                                  >
                                    <option value="">Sem variacao</option>
                                    {produtoFinal.variacoes.map(v => (
                                      <option key={v.id} value={v.id}>
                                        {v.nome_variacao} {v.sku ? `(${v.sku})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{tiktokOrdersWithMatch.filter(i => i.selecionado).length}</span> selecionado(s) de {tiktokOrdersWithMatch.length}
                {tiktokOrdersWithMatch.filter(i => i.matchStatus === 'nao_encontrado' && !i.produtoManual).length > 0 && (
                  <span className="text-red-500 ml-2">
                    ({tiktokOrdersWithMatch.filter(i => i.matchStatus === 'nao_encontrado' && !i.produtoManual).length} sem produto)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowTikTokModal(false);
                    setTiktokOrdersWithMatch([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportTikTokOrders}
                  disabled={tiktokOrdersWithMatch.filter(i => i.selecionado).length === 0 || tiktokImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg
                    hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {tiktokImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Importar Selecionados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pedidos Shopee */}
      {showShopeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Importar Pedidos da Shopee
                  </h3>
                  <p className="text-sm text-gray-500">
                    {shopeeOrdersWithMatch.length} pedido(s) para revisar
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowShopeeModal(false);
                  setShopeeOrdersWithMatch([]);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {shopeeAnalyzing ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">Analisando pedidos e buscando correspondencias...</p>
                </div>
              ) : shopeeOrdersWithMatch.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum pedido pendente para importar!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selecionar todos */}
                  <div className="flex items-center justify-between pb-3 border-b">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={shopeeOrdersWithMatch.every(item => item.selecionado)}
                        onChange={(e) => {
                          setShopeeOrdersWithMatch(prev => prev.map(item => ({
                            ...item,
                            selecionado: e.target.checked && (item.produtoMatch || item.produtoManual) !== undefined
                          })));
                        }}
                        className="w-4 h-4 text-orange-600 rounded"
                      />
                      <span className="text-sm text-gray-600">Selecionar todos com produto</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="w-3 h-3" /> SKU
                      </span>
                      <span className="flex items-center gap-1 text-blue-600">
                        <Search className="w-3 h-3" /> Nome
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-3 h-3" /> Nao encontrado
                      </span>
                    </div>
                  </div>

                  {shopeeOrdersWithMatch.map((item) => {
                    const produtoFinal = item.produtoManual || item.produtoMatch;
                    const variacaoFinal = item.variacaoManual || item.variacaoMatch;
                    const temVariacoes = item.order.variation || (produtoFinal?.variacoes && produtoFinal.variacoes.length > 0);

                    return (
                      <div
                        key={item.order.id}
                        className={`rounded-lg border-2 transition-colors ${
                          item.selecionado
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200'
                        }`}
                      >
                        {/* Linha principal */}
                        <div className="p-3 flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={item.selecionado}
                            onChange={() => toggleShopeeOrderSelection(item.order.id!)}
                            className="w-4 h-4 text-orange-600 rounded"
                          />

                          <button
                            onClick={() => toggleShopeeOrderExpand(item.order.id!)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                          >
                            {item.expanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900 truncate">
                                {item.order.product_title}
                              </p>
                              {temVariacoes && (
                                <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                                  Com variacoes
                                </span>
                              )}
                            </div>
                            {item.order.variation && (
                              <p className="text-sm text-gray-500 truncate">
                                Shopee: {item.order.variation}
                              </p>
                            )}
                            {produtoFinal && (
                              <p className="text-sm text-green-600 truncate">
                                → {produtoFinal.nome}{variacaoFinal ? ` - ${variacaoFinal.nome_variacao}` : ''}
                              </p>
                            )}
                          </div>

                          {/* Quantidade fixa (marketplace) */}
                          <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold">
                            <Package className="w-3 h-3" />
                            x{item.order.quantity}
                          </div>

                          {/* Badge de status */}
                          <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                            item.matchStatus === 'encontrado_sku'
                              ? 'bg-green-100 text-green-700'
                              : item.matchStatus === 'encontrado_nome'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {item.matchStatus === 'encontrado_sku'
                              ? 'SKU'
                              : item.matchStatus === 'encontrado_nome'
                              ? 'Nome'
                              : 'Nao encontrado'}
                          </span>
                        </div>

                        {/* Area expandida */}
                        {item.expanded && (
                          <div className="px-4 pb-4 pt-2 border-t bg-gray-50 space-y-3">
                            {/* Informacoes do pedido Shopee */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Pedido Shopee:</span>{' '}
                                <span className="font-mono">{item.order.shopee_order_id}</span>
                              </div>
                              {item.order.seller_sku && (
                                <div>
                                  <span className="text-gray-500">SKU:</span>{' '}
                                  <span className="font-mono text-blue-600">{item.order.seller_sku}</span>
                                </div>
                              )}
                              {item.order.buyer_name && (
                                <div>
                                  <span className="text-gray-500">Comprador:</span>{' '}
                                  {item.order.buyer_name}
                                </div>
                              )}
                              {item.order.unit_price && (
                                <div>
                                  <span className="text-gray-500">Preco:</span>{' '}
                                  <span className="text-green-600">R$ {item.order.unit_price.toFixed(2)}</span>
                                </div>
                              )}
                              {item.order.date_created && (
                                <div>
                                  <span className="text-gray-500">Data:</span>{' '}
                                  {new Date(item.order.date_created).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              )}
                              <div>
                                <span className="text-gray-500">Qtd original:</span>{' '}
                                <span className="font-semibold">{item.order.quantity}</span>
                              </div>
                            </div>

                            {/* Selecao manual de produto */}
                            <div className="pt-2 border-t">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Edit3 className="w-4 h-4 inline mr-1" />
                                Selecionar produto manualmente:
                              </label>
                              <div className="flex gap-2">
                                <select
                                  value={produtoFinal?.id || ''}
                                  onChange={(e) => {
                                    const prodId = e.target.value;
                                    if (prodId) {
                                      setShopeeOrderManualProduct(item.order.id!, prodId);
                                    }
                                  }}
                                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2"
                                >
                                  <option value="">Selecionar produto...</option>
                                  {produtos.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.nome} {p.sku ? `(${p.sku})` : ''}
                                    </option>
                                  ))}
                                </select>

                                {/* Selecao de variacao se o produto tiver */}
                                {produtoFinal?.variacoes && produtoFinal.variacoes.length > 0 && (
                                  <select
                                    value={variacaoFinal?.id || ''}
                                    onChange={(e) => {
                                      const varId = e.target.value;
                                      setShopeeOrderManualProduct(item.order.id!, produtoFinal.id!, varId || undefined);
                                    }}
                                    className="w-48 text-sm border border-gray-300 rounded-lg px-3 py-2"
                                  >
                                    <option value="">Sem variacao</option>
                                    {produtoFinal.variacoes.map(v => (
                                      <option key={v.id} value={v.id}>
                                        {v.nome_variacao} {v.sku ? `(${v.sku})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                <span className="font-medium text-gray-900">{shopeeOrdersWithMatch.filter(i => i.selecionado).length}</span> selecionado(s) de {shopeeOrdersWithMatch.length}
                {shopeeOrdersWithMatch.filter(i => i.matchStatus === 'nao_encontrado' && !i.produtoManual).length > 0 && (
                  <span className="text-red-500 ml-2">
                    ({shopeeOrdersWithMatch.filter(i => i.matchStatus === 'nao_encontrado' && !i.produtoManual).length} sem produto)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowShopeeModal(false);
                    setShopeeOrdersWithMatch([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportShopeeOrders}
                  disabled={shopeeOrdersWithMatch.filter(i => i.selecionado).length === 0 || shopeeImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg
                    hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {shopeeImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Importar Selecionados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historico de Pedidos Concluidos */}
      {showHistoricoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <History className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Historico de Pedidos
                  </h3>
                  <p className="text-sm text-gray-500">
                    {pedidosConcluidos.length} pedido(s) finalizado(s)
                    {selectedHistorico.length > 0 && (
                      <span className="text-orange-600 ml-2">
                        ({selectedHistorico.length} selecionado(s))
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoricoModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de ações */}
            {pedidosConcluidos.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
                <button
                  onClick={toggleSelectAllHistorico}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedHistorico.length === pedidosConcluidos.length && pedidosConcluidos.length > 0
                      ? 'bg-orange-500 border-orange-500'
                      : 'border-gray-400'
                  }`}>
                    {selectedHistorico.length === pedidosConcluidos.length && pedidosConcluidos.length > 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  Selecionar Todos
                </button>
                {selectedHistorico.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{selectedHistorico.length} selecionado(s)</span>
                    <button
                      onClick={() => handleExcluirSelecionados('cancelado')}
                      disabled={revertendo !== null}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {revertendo === 'multiple' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      Cancelado
                    </button>
                    <button
                      onClick={() => handleExcluirSelecionados('devolvido')}
                      disabled={revertendo !== null}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {revertendo === 'multiple' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      Devolvido
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : pedidosConcluidos.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhum pedido concluido ainda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pedidosConcluidos.map((pedido) => (
                    <div
                      key={pedido.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedHistorico.includes(pedido.id!)
                          ? 'bg-orange-50 border-orange-300'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleSelectHistorico(pedido.id!)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selectedHistorico.includes(pedido.id!)
                              ? 'bg-orange-500 border-orange-500'
                              : 'border-gray-400'
                          }`}>
                            {selectedHistorico.includes(pedido.id!) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="w-12 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {pedido.produto?.imagem_url ? (
                              <img
                                src={pedido.produto.imagem_url}
                                alt={pedido.produto?.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageOff className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900">
                                {pedido.produto?.nome || 'Produto'}
                                {pedido.variacao?.nome_variacao && (
                                  <span className="text-gray-500 font-normal">
                                    {' '}({pedido.variacao.nome_variacao})
                                  </span>
                                )}
                              </p>
                              {/* Badge de prioridade individual */}
                              {pedido.prioridade && pedido.prioridade !== 'normal' && (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${getPrioridadeConfig(pedido.prioridade).bgCor} ${getPrioridadeConfig(pedido.prioridade).cor}`}>
                                  {pedido.prioridade === 'urgente' ? <Flame className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                  {getPrioridadeConfig(pedido.prioridade).texto}
                                </span>
                              )}
                              {pedido.prioridade === 'normal' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                  <Circle className="w-3 h-3" />
                                  Normal
                                </span>
                              )}
                            </div>
                            <span className={`text-sm font-semibold ${
                              pedido.status === 'cancelado' ? 'text-gray-500' :
                              pedido.status === 'devolvido' ? 'text-orange-600' :
                              'text-green-600'
                            }`}>
                              {pedido.status === 'cancelado' ? (
                                <span className="flex items-center gap-1">
                                  <XCircle className="w-3 h-3" />
                                  Cancelado ({pedido.quantidade} un)
                                </span>
                              ) : pedido.status === 'devolvido' ? (
                                <span className="flex items-center gap-1">
                                  <RotateCcw className="w-3 h-3" />
                                  Devolvido ({pedido.quantidade} un)
                                </span>
                              ) : (
                                `${pedido.quantidade} unidade(s) entregue(s)`
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowHistoricoModal(false);
                  setSelectedHistorico([]);
                }}
                className="w-full px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente Modal de Impressoras
function ModalImpressoras({
  impressorasDisponiveis,
  impressorasSelecionadasIds,
  onSave,
  onClose,
}: {
  impressorasDisponiveis: Impressora[];
  impressorasSelecionadasIds: string[];
  onSave: (impressorasIds: string[]) => void;
  onClose: () => void;
}) {
  const [selecionadas, setSelecionadas] = useState<string[]>(impressorasSelecionadasIds);

  const toggleImpressora = (id: string) => {
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
          <h3 className="text-lg font-semibold text-gray-900">Selecionar Impressoras</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {impressorasDisponiveis.length === 0 ? (
            <div className="text-center py-6">
              <Printer className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 mb-2">Nenhuma impressora cadastrada</p>
              <p className="text-sm text-gray-400">
                Cadastre suas impressoras em Configuracoes &gt; Impressoras
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Selecione as impressoras para distribuir a producao:
              </p>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {impressorasDisponiveis.map((imp) => (
                  <label
                    key={imp.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selecionadas.includes(imp.id!)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selecionadas.includes(imp.id!)}
                      onChange={() => toggleImpressora(imp.id!)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <Printer className={`w-5 h-5 ${
                      selecionadas.includes(imp.id!) ? 'text-indigo-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1">
                      <span className={`font-medium ${
                        selecionadas.includes(imp.id!) ? 'text-indigo-900' : 'text-gray-700'
                      }`}>
                        {imp.apelido || imp.modelo}
                      </span>
                      {imp.apelido && (
                        <span className="text-xs text-gray-400 ml-2">({imp.modelo})</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
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
            disabled={impressorasDisponiveis.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
