import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui';
import { Pedido, ProdutoConcorrente, ItemFilaProducao, EstoqueProduto, Filamento, ImpressoraModelo, MLOrder, MLConnectionStatus } from '../../types';
import { getPedidosPendentes, createPedido, deletePedido, marcarProduzido } from '../../services/pedidosService';
import { getEstoqueProdutos, adicionarEstoque, removerDoEstoque } from '../../services/estoqueProdutosService';
import { getProdutos } from '../../services/produtosService';
import { consumirFilamento, getFilamentos } from '../../services/filamentosService';
import {
  checkMLConnection,
  syncMLOrders,
  getMLOrders,
  importMLOrderToPedido,
  disconnectML,
  getMLLoginUrl,
} from '../../services/mercadoLivreService';
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
  ListOrdered,
  Timer,
  Link2,
  RefreshCw,
  Unlink,
} from 'lucide-react';

// Interface para pedido importado/analisado
interface PedidoImportado {
  textoOriginal: string;
  nomeProduto: string;
  nomeVariacao?: string;
  quantidade: number;
  produtoEncontrado?: ProdutoConcorrente;
  variacaoEncontrada?: { id: string; nome_variacao: string };
  status: 'encontrado' | 'nao_encontrado' | 'variacao_nao_encontrada';
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
  impressoraId?: ImpressoraModelo;
}

// Distribuir itens entre impressoras de forma inteligente (balanceada por tempo)
function distribuirEntreImpressoras(
  itens: ItemFilaProducao[],
  impressoras: ImpressoraModelo[]
): Map<ImpressoraModelo, ItemPlanejado[]> {
  const distribuicao = new Map<ImpressoraModelo, ItemPlanejado[]>();
  const temposPorImpressora = new Map<ImpressoraModelo, number>();

  // Inicializar
  impressoras.forEach(imp => {
    distribuicao.set(imp, []);
    temposPorImpressora.set(imp, 0);
  });

  // Ordenar itens por tempo total (maior primeiro para melhor balanceamento)
  const itensOrdenados = [...itens].sort((a, b) => b.tempo_total - a.tempo_total);

  // Distribuir usando algoritmo de balanceamento (atribuir ao menos carregado)
  itensOrdenados.forEach(item => {
    // Encontrar impressora com menor tempo acumulado
    let impressoraMenosCarregada = impressoras[0];
    let menorTempo = temposPorImpressora.get(impressoras[0]) || 0;

    impressoras.forEach(imp => {
      const tempo = temposPorImpressora.get(imp) || 0;
      if (tempo < menorTempo) {
        menorTempo = tempo;
        impressoraMenosCarregada = imp;
      }
    });

    // Adicionar item à impressora
    const lista = distribuicao.get(impressoraMenosCarregada)!;
    const tempoAtual = temposPorImpressora.get(impressoraMenosCarregada) || 0;

    const itemPlanejado: ItemPlanejado = {
      ...item,
      ordem: lista.length + 1,
      horarioInicio: calcularPrevisaoTermino(tempoAtual),
      horarioTermino: calcularPrevisaoTermino(tempoAtual + item.tempo_total),
      impressoraId: impressoraMenosCarregada,
    };

    lista.push(itemPlanejado);
    temposPorImpressora.set(impressoraMenosCarregada, tempoAtual + item.tempo_total);
  });

  // Reordenar cada lista por tempo (menor primeiro)
  distribuicao.forEach((lista) => {
    lista.sort((a, b) => a.tempo_total - b.tempo_total);
    // Recalcular horários após reordenação
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
  const [mlOrdersToImport, setMlOrdersToImport] = useState<Set<string>>(new Set());
  const [mlLoaded, setMlLoaded] = useState(false);

  // Verificar conexao ML ao carregar
  useEffect(() => {
    console.log('[ML DEBUG] useEffect iniciado - v2');
    console.log('[ML DEBUG] checkMLConnection function:', typeof checkMLConnection);
    const checkML = async () => {
      console.log('[ML DEBUG] checkML chamado - v2');
      try {
        const status = await checkMLConnection();
        console.log('[ML DEBUG] status:', status);
        setMlStatus(status);

        // Se estiver conectado, buscar pedidos pendentes
        if (status.connected) {
          const orders = await getMLOrders(true);
          setMlOrders(orders);
        }
      } catch (error) {
        console.error('[ML DEBUG] Erro:', error);
      } finally {
        console.log('[ML DEBUG] setMlLoaded(true)');
        setMlLoaded(true);
      }
    };

    checkML();
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
    } catch (error) {
      console.error('Erro ao sincronizar ML:', error);
      alert('Erro ao sincronizar com Mercado Livre');
    } finally {
      setMlSyncing(false);
    }
  };

  // Importar pedidos selecionados do ML
  const handleImportMLOrders = async () => {
    if (mlOrdersToImport.size === 0) {
      alert('Selecione pelo menos um pedido para importar');
      return;
    }

    setMlImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (const orderId of mlOrdersToImport) {
      const order = mlOrders.find(o => o.id === orderId);
      if (order) {
        const success = await importMLOrderToPedido(order);
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
    setMlOrdersToImport(new Set());
    setMlImporting(false);
    setShowMLModal(false);

    if (successCount > 0) {
      alert(`${successCount} pedido(s) importado(s) com sucesso!${failCount > 0 ? ` (${failCount} falharam)` : ''}`);
    } else {
      alert('Nenhum pedido foi importado. Verifique se os produtos existem no Radar de Produtos.');
    }
  };

  // Desconectar do Mercado Livre
  const handleDisconnectML = async () => {
    if (confirm('Deseja desconectar do Mercado Livre?')) {
      const success = await disconnectML();
      if (success) {
        setMlStatus({ connected: false });
        setMlOrders([]);
      }
    }
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

    // Ordenar por tempo total (menor primeiro) para otimizar produção
    const itens = Array.from(mapa.values()).filter(item => item.quantidade_produzir > 0);
    return itens.sort((a, b) => a.tempo_total - b.tempo_total);
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

  // Distribuição por impressoras (se houver mais de 1)
  const distribuicaoPorImpressora = useMemo(() => {
    if (impressorasUsuario.length <= 1 || filaProducao.length === 0) {
      return null;
    }
    return distribuirEntreImpressoras(filaProducao, impressorasUsuario);
  }, [filaProducao, impressorasUsuario]);

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
        await createPedido({
          produto_id: pedido.produtoEncontrado!.id!,
          variacao_id: pedido.variacaoEncontrada?.id || null,
          quantidade: pedido.quantidade,
          quantidade_produzida: 0,
          status: 'pendente',
        });
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
            <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded font-bold">[VERSAO 3.0 - TESTE]</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* DEBUG: Este texto deve aparecer sempre */}
          <span className="text-xs text-red-500 font-bold">ML:{mlLoaded ? 'OK' : 'LOADING'}</span>

          {/* Mercado Livre */}
          {!mlLoaded ? (
            <button
              disabled
              className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg opacity-50"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Mercado Livre
            </button>
          ) : mlStatus.connected ? (
            <>
              <button
                onClick={handleSyncML}
                disabled={mlSyncing}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
              >
                {mlSyncing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Sincronizar ML
                {mlOrders.length > 0 && (
                  <span className="bg-white text-yellow-600 px-1.5 py-0.5 rounded-full text-xs font-bold">
                    {mlOrders.length}
                  </span>
                )}
              </button>
              {mlOrders.length > 0 && (
                <button
                  onClick={() => setShowMLModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-yellow-500 text-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Ver Pedidos ML
                </button>
              )}
            </>
          ) : (
            <a
              href={getMLLoginUrl()}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <Link2 className="w-4 h-4" />
              Conectar Mercado Livre
            </a>
          )}

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
                  {impressorasUsuario.length > 0
                    ? `${impressorasUsuario.length} impressora${impressorasUsuario.length > 1 ? 's' : ''}`
                    : 'Configurar impressoras'}
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Cards de resumo */}
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
                    {impressorasUsuario.length > 1 && (
                      <p className="text-xs text-gray-400">com {impressorasUsuario.length} impressoras</p>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Distribuição por Impressora (se tiver mais de 1) */}
          {impressorasUsuario.length > 1 && distribuicaoPorImpressora && (
            <Card className="mb-6">
              <CardBody className="p-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Printer className="w-4 h-4" />
                  Planejador Automatico - Distribuicao por Impressora
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from(distribuicaoPorImpressora.entries()).map(([impId, itensImpressora]) => {
                    const impressora = IMPRESSORAS.find(i => i.id === impId);
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
                            <span className="font-medium text-gray-900">{impressora?.nome || impId}</span>
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
                                <div key={`${item.produto_id}-${item.variacao_id}`} className="flex items-start gap-2">
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm">
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
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <ListOrdered className="w-4 h-4" />
                Ordem de Producao
              </h3>
              <span className="text-xs text-gray-400">
                Ordenado do menor para o maior tempo
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {planejamento.itens.map((item, idx) => (
                <div
                  key={`${item.produto_id}-${item.variacao_id || 'sem'}`}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Ordem */}
                    <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-600">{idx + 1}</span>
                    </div>

                    {/* Imagem */}
                    <div className="w-14 h-14 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      {item.imagem_url ? (
                        <img
                          src={item.imagem_url}
                          alt={item.nome_produto}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageOff className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {item.nome_produto}
                        </h4>
                        {item.nome_variacao && (
                          <span className="text-sm text-indigo-600 font-medium">({item.nome_variacao})</span>
                        )}
                      </div>

                      {/* Cálculo: Vendidos - Estoque = Produzir */}
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <span className="flex items-center gap-1 text-gray-600">
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span className="font-medium">{item.quantidade_pedida}</span>
                          <span className="text-gray-400">vendidos</span>
                        </span>
                        <span className="text-gray-400">-</span>
                        <span className="flex items-center gap-1 text-green-600">
                          <Archive className="w-3.5 h-3.5" />
                          <span className="font-medium">{item.quantidade_estoque}</span>
                          <span className="text-green-500">estoque</span>
                        </span>
                        <span className="text-gray-400">=</span>
                        <span className="flex items-center gap-1 text-indigo-600 font-bold">
                          {item.quantidade_produzir} produzir
                        </span>
                      </div>

                      {/* Detalhes de tempo e filamento */}
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatarTempo(item.tempo_por_peca)}/peca × {item.quantidade_produzir} = <strong className="text-blue-600">{formatarTempo(item.tempo_total)}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Cylinder className="w-3 h-3" />
                          {item.peso_por_peca}g × {item.quantidade_produzir} = <strong className="text-purple-600">{item.peso_total.toFixed(0)}g</strong>
                        </span>
                      </div>
                    </div>

                    {/* Previsão de término */}
                    <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Termina as</p>
                        <p className="text-lg font-bold text-orange-600">{formatarHorario(item.horarioTermino)}</p>
                      </div>
                    </div>

                    {/* Ação */}
                    <button
                      onClick={() => handleAbrirProduzir(item)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      <Check className="w-4 h-4" />
                      Produzido
                    </button>
                  </div>

                  {/* Mobile: detalhes extras */}
                  <div className="md:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-sm">
                    <span className="text-purple-600 font-medium">{item.peso_total.toFixed(0)}g</span>
                    <span className="text-blue-600 font-medium">{formatarTempo(item.tempo_total)}</span>
                    <span className="text-orange-600 font-medium flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {formatarHorario(item.horarioTermino)}
                    </span>
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

              {/* Quantidade com controles [-] [+] */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade vendida
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300
                      hover:bg-gray-100 transition-colors text-gray-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-semibold
                      focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantidade(quantidade + 1)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300
                      hover:bg-gray-100 transition-colors text-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
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
                              ) : pedido.status === 'variacao_nao_encontrada' ? (
                                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                              )}
                              <span className={`font-medium ${
                                pedido.status === 'encontrado'
                                  ? 'text-green-800'
                                  : pedido.status === 'variacao_nao_encontrada'
                                  ? 'text-yellow-800'
                                  : 'text-red-800'
                              }`}>
                                {pedido.nomeProduto}
                                {pedido.nomeVariacao && (
                                  <span className="font-normal"> - {pedido.nomeVariacao}</span>
                                )}
                              </span>
                            </div>
                            <p className={`text-xs mt-1 ${
                              pedido.status === 'encontrado'
                                ? 'text-green-600'
                                : pedido.status === 'variacao_nao_encontrada'
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}>
                              {pedido.status === 'encontrado'
                                ? `Encontrado: ${pedido.produtoEncontrado?.nome}${pedido.variacaoEncontrada ? ` (${pedido.variacaoEncontrada.nome_variacao})` : ''}`
                                : pedido.status === 'variacao_nao_encontrada'
                                ? `Produto encontrado, mas variacao "${pedido.nomeVariacao}" nao existe`
                                : 'Produto nao encontrado no Radar'}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-sm font-bold ${
                            pedido.status === 'encontrado'
                              ? 'bg-green-200 text-green-800'
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
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Prontos para importar:</span>
                      <span className="font-bold text-green-600">
                        {pedidosImportados.filter(p => p.status === 'encontrado').length} pedidos
                      </span>
                    </div>
                    {pedidosImportados.some(p => p.status !== 'encontrado') && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600">Com problemas:</span>
                        <span className="font-bold text-red-600">
                          {pedidosImportados.filter(p => p.status !== 'encontrado').length} pedidos
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
          impressorasSelecionadas={impressorasUsuario}
          onSave={handleSaveImpressoras}
          onClose={() => setShowImpressorasConfig(false)}
        />
      )}

      {/* Modal Pedidos Mercado Livre */}
      {showMLModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ShoppingCart className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Pedidos Mercado Livre
                  </h3>
                  <p className="text-sm text-gray-500">
                    {mlOrders.length} pedido(s) pendente(s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDisconnectML}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Desconectar"
                >
                  <Unlink className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowMLModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {mlOrders.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500">Todos os pedidos foram importados!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selecionar todos */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <input
                      type="checkbox"
                      checked={mlOrdersToImport.size === mlOrders.length && mlOrders.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMlOrdersToImport(new Set(mlOrders.map(o => o.id!)));
                        } else {
                          setMlOrdersToImport(new Set());
                        }
                      }}
                      className="w-4 h-4 text-yellow-600 rounded"
                    />
                    <span className="text-sm text-gray-600">Selecionar todos</span>
                  </div>

                  {mlOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        mlOrdersToImport.has(order.id!)
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={mlOrdersToImport.has(order.id!)}
                          onChange={(e) => {
                            const newSet = new Set(mlOrdersToImport);
                            if (e.target.checked) {
                              newSet.add(order.id!);
                            } else {
                              newSet.delete(order.id!);
                            }
                            setMlOrdersToImport(newSet);
                          }}
                          className="w-4 h-4 text-yellow-600 rounded mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {order.product_title}
                          </p>
                          {order.variation && (
                            <p className="text-sm text-gray-500">
                              Variacao: {order.variation}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-sm">
                            <span className="font-semibold text-indigo-600">
                              {order.quantity}x
                            </span>
                            {order.unit_price && (
                              <span className="text-green-600">
                                R$ {order.unit_price.toFixed(2)}
                              </span>
                            )}
                            <span className="text-gray-400">
                              {order.buyer_nickname}
                            </span>
                          </div>
                          {order.date_created && (
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(order.date_created).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          order.status === 'paid' ? 'bg-green-100 text-green-700' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status === 'paid' ? 'Pago' :
                           order.status === 'pending' ? 'Pendente' :
                           order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                {mlOrdersToImport.size} selecionado(s)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMLModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={handleImportMLOrders}
                  disabled={mlOrdersToImport.size === 0 || mlImporting}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg
                    hover:bg-yellow-600 transition-colors disabled:opacity-50"
                >
                  {mlImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Importar para Fila
                </button>
              </div>
            </div>
          </div>
        </div>
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
