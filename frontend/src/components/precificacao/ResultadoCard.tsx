import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceState, PrecificacaoSalva, Embalagem } from '../../types';
import { CATEGORIAS } from './MercadoLivreConfig';
import { createPrecificacao, updatePrecificacao } from '../../services/precificacoesService';
import { getEmbalagens } from '../../services/embalagensService';
import { getAcessorios } from '../../services/acessoriosService';
import { Acessorio } from '../../types/acessorio';
import { createPedido } from '../../services/pedidosService';
import { calcularPrecoAnuncio, arredondarPreco } from './PrecoMargemConfig';
import {
  TrendingUp,
  Clock,
  Calendar,
  Cylinder,
  Zap,
  Package,
  Percent,
  Truck,
  Receipt,
  Factory,
  AlertTriangle,
  Target,
  Star,
  Save,
  Check,
  Loader2,
  Send,
  Layers,
  Lightbulb,
  Tag,
  Ticket
} from 'lucide-react';

// ========== TABELAS DE FRETE MERCADO LIVRE ==========

// Faixas de peso (em kg)
const FAIXAS_PESO = [0.3, 0.5, 1, 2, 3, 4, 5, 9, 13, 17, 23, 30];

// Faixas de preço para frete SEM frete grátis
const FAIXAS_PRECO = [
  { min: 0, max: 18.99 },
  { min: 19, max: 48.99 },
  { min: 49, max: 78.99 },
];

// Tabela de frete SEM frete grátis (peso x preço)
// [faixa_peso][faixa_preco] = valor
const TABELA_FRETE_NORMAL: number[][] = [
  // até 0.3kg: [0-18.99, 19-48.99, 49-78.99]
  [5.65, 6.55, 7.75],
  // 0.3-0.5kg
  [5.95, 6.65, 7.85],
  // 0.5-1kg
  [6.05, 6.75, 7.95],
  // 1-2kg
  [6.50, 7.20, 8.40],
  // 2-3kg
  [7.00, 7.70, 8.90],
  // 3-4kg
  [7.50, 8.20, 9.40],
  // 4-5kg
  [8.00, 8.70, 9.90],
  // 5-9kg
  [9.50, 10.20, 11.40],
  // 9-13kg
  [11.50, 12.20, 13.40],
  // 13-17kg
  [14.00, 14.70, 15.90],
  // 17-23kg
  [17.50, 18.20, 19.40],
  // 23-30kg
  [22.00, 22.70, 23.90],
];

// Tabela de frete COM frete grátis (apenas peso)
const TABELA_FRETE_GRATIS: number[] = [
  12.35,  // até 0.3kg
  13.25,  // 0.3-0.5kg
  13.85,  // 0.5-1kg
  15.50,  // 1-2kg
  17.50,  // 2-3kg
  20.00,  // 3-4kg
  23.00,  // 4-5kg
  30.00,  // 5-9kg
  40.00,  // 9-13kg
  52.00,  // 13-17kg
  68.00,  // 17-23kg
  90.00,  // 23-30kg
];

// Função para encontrar índice da faixa de peso
function getIndicePeso(pesoKg: number): number {
  for (let i = 0; i < FAIXAS_PESO.length; i++) {
    if (pesoKg <= FAIXAS_PESO[i]) {
      return i;
    }
  }
  return FAIXAS_PESO.length - 1; // Retorna última faixa se peso > 30kg
}

// Função para encontrar índice da faixa de preço
function getIndicePreco(preco: number): number {
  for (let i = 0; i < FAIXAS_PRECO.length; i++) {
    if (preco >= FAIXAS_PRECO[i].min && preco <= FAIXAS_PRECO[i].max) {
      return i;
    }
  }
  return FAIXAS_PRECO.length - 1;
}

// Função principal para calcular frete do Mercado Livre
function calcularFreteMercadoLivre(
  pesoKg: number,
  precoVenda: number,
  freteGratis: boolean
): number {
  if (pesoKg <= 0) return 0;

  const indicePeso = getIndicePeso(pesoKg);

  if (freteGratis) {
    // Com frete grátis: usa apenas o peso
    return TABELA_FRETE_GRATIS[indicePeso];
  } else {
    // Sem frete grátis: usa peso + preço
    const indicePreco = getIndicePreco(precoVenda);
    return TABELA_FRETE_NORMAL[indicePeso][indicePreco];
  }
}

interface ResultadoCardProps {
  state: MarketplaceState;
  canSave?: boolean;
  onSaveSuccess?: () => void;
  nomeProdutoCarregado?: string; // Nome do produto quando carrega simulação salva
  simulacaoId?: string; // ID da simulação sendo editada (undefined = nova)
  produtoIdOriginal?: string; // ID do produto do radar quando carrega simulação
  // Modo Kit
  modoKit?: boolean;
  kitTotais?: { peso: number; tempo: number };
}

interface CustoItem {
  label: string;
  valor: number;
  percentual: number;
  icon: React.ElementType;
}

export function ResultadoCard({ state, canSave = true, onSaveSuccess, nomeProdutoCarregado, simulacaoId, produtoIdOriginal, modoKit, kitTotais }: ResultadoCardProps) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingProduction, setIsSendingProduction] = useState(false);
  const [sendProductionSuccess, setSendProductionSuccess] = useState(false);
  const [nomeManual, setNomeManual] = useState('');
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);

  const custos = state.custos_producao || {};
  const temProdutoSelecionado = !!state.produto_selecionado;
  const temKitComItens = modoKit && state.kit_itens && state.kit_itens.length > 0;
  const precoVenda = state.preco_venda || 0;
  const quantidadePecas = custos.quantidade_pecas || 1;

  // Carregar embalagens e acessorios para calcular o custo
  useEffect(() => {
    const loadData = async () => {
      const [embData, acessData] = await Promise.all([
        getEmbalagens(),
        getAcessorios(true)
      ]);
      setEmbalagens(embData);
      setAcessorios(acessData);
    };
    loadData();
  }, []);

  // Pré-preencher nome quando carrega simulação
  useEffect(() => {
    if (nomeProdutoCarregado && !nomeManual) {
      setNomeManual(nomeProdutoCarregado);
    }
  }, [nomeProdutoCarregado]);

  // Se tem produto selecionado, kit com itens ou nome manual, o nome é válido
  const temNomeValido = temProdutoSelecionado || temKitComItens || !!nomeManual.trim();

  // Calcular precos de promocao (DEVE ficar antes do return condicional)
  const precosPromocao = useMemo(() => {
    const promocao = state.promocao;
    if (!promocao?.ativo || precoVenda <= 0) {
      return null;
    }

    const descontoPercent = promocao.desconto_percentual || 50;
    const arredondamento = promocao.arredondamento || '90';

    const precoAnuncioRaw = calcularPrecoAnuncio(precoVenda, descontoPercent);
    const precoAnuncio = arredondarPreco(precoAnuncioRaw, arredondamento);
    const precoFinal = precoAnuncio * (1 - descontoPercent / 100);

    return {
      precoAnuncio,
      precoFinal,
      descontoReal: Math.round((precoAnuncio - precoFinal) / precoAnuncio * 100),
    };
  }, [state.promocao, precoVenda]);

  // Se não tem preço de venda, não mostra o card
  if (precoVenda <= 0) {
    return null;
  }

  // ========== CÁLCULOS DE CUSTOS ==========

  // Peso do filamento (do kit, produto ou manual)
  const pesoFilamento = modoKit && kitTotais && kitTotais.peso > 0
    ? kitTotais.peso
    : state.produto_selecionado?.variacao?.peso_filamento
      || state.produto_selecionado?.produto.peso_filamento
      || custos.peso_filamento_g
      || 0;

  // Custo do filamento
  const custoFilamento = custos.preco_filamento_kg && pesoFilamento
    ? (custos.preco_filamento_kg / 1000) * pesoFilamento
    : 0;

  // Tempo de impressão (do kit, produto ou manual)
  const tempoHoras = modoKit && kitTotais && kitTotais.tempo > 0
    ? kitTotais.tempo
    : state.produto_selecionado?.variacao?.tempo_impressao
      || state.produto_selecionado?.produto.tempo_impressao
      || ((custos.tempo_impressao_horas || 0) + (custos.tempo_impressao_minutos || 0) / 60)
      || 0;

  // Custo de energia
  const consumoKwh = custos.consumo_kwh || 0;
  const valorKwh = custos.valor_kwh || 0;
  let custoEnergia = consumoKwh * valorKwh * tempoHoras;

  // Dividir energia se múltiplas peças
  if (custos.multiplas_pecas && custos.quantidade_pecas && custos.quantidade_pecas > 1) {
    custoEnergia = custoEnergia / custos.quantidade_pecas;
  }

  // Custo de embalagem (soma das embalagens selecionadas com quantidade)
  const custoEmbalagem = (custos.embalagens_config || []).reduce((total, cfg) => {
    const emb = embalagens.find(e => e.id === cfg.embalagem_id);
    return total + (emb?.preco_unitario || 0) * cfg.quantidade;
  }, 0);

  // Custo de acessorios
  const custoAcessorios = (custos.acessorios_config || []).reduce((total, cfg) => {
    const acessorio = acessorios.find(a => a.id === cfg.acessorio_id);
    return total + (acessorio?.custo_unitario || 0) * cfg.quantidade;
  }, 0);

  // Outros custos de produção
  const outrosCustos = custos.outros_custos || 0;

  // Total custos de produção
  const totalCustosProducao = custoFilamento + custoEnergia + custoEmbalagem + custoAcessorios + outrosCustos;

  // ========== CUSTOS DE VENDA ==========

  // Cupom proprio - calcular ANTES da comissão (desconto bancado pelo vendedor)
  let custoCupom = 0;
  if (state.tipo === 'shopee' && state.shopee.cupom_desconto && state.shopee.valor_cupom) {
    custoCupom = state.shopee.valor_cupom;
  } else if (state.tipo === 'mercadolivre' && state.mercadolivre.cupom_desconto && state.mercadolivre.valor_cupom) {
    custoCupom = state.mercadolivre.valor_cupom;
  }

  // Preço líquido após cupom (base para comissão)
  const precoLiquido = Math.max(0, precoVenda - custoCupom);

  // Taxa do marketplace (calculada sobre preço líquido após cupom)
  let taxaMarketplace = 0;
  let taxaFixaShopee = 0;

  if (state.tipo === 'mercadolivre') {
    const categoria = CATEGORIAS.find(c => c.id === state.mercadolivre.categoria_id);
    if (categoria) {
      const taxaMarketplacePercent = state.mercadolivre.tipo_anuncio === 'classico'
        ? categoria.taxa_classico
        : categoria.taxa_premium;
      // Comissão calculada sobre preço líquido após cupom
      taxaMarketplace = (taxaMarketplacePercent / 100) * precoLiquido;
    }
  } else if (state.tipo === 'shopee') {
    // Shopee: faixas de comissão baseadas no preço de venda original
    let comissaoPercent = 0;

    if (precoVenda < 80) {
      comissaoPercent = 20;
      taxaFixaShopee = 4;
    } else if (precoVenda < 100) {
      comissaoPercent = 14;
      taxaFixaShopee = 16;
    } else if (precoVenda < 200) {
      comissaoPercent = 14;
      taxaFixaShopee = 20;
    } else if (precoVenda < 500) {
      comissaoPercent = 14;
      taxaFixaShopee = 26;
    } else {
      comissaoPercent = 14;
      taxaFixaShopee = 26;
    }

    // Comissão calculada sobre preço líquido após cupom (máximo R$100)
    let comissao = (comissaoPercent / 100) * precoLiquido;
    if (comissao > 100) {
      comissao = 100;
    }

    taxaMarketplace = comissao;
  }

  // Custo da campanha de destaque Shopee (+2.5% sobre preço de venda)
  let custoCampanhaDestaque = 0;
  if (state.tipo === 'shopee' && state.shopee.campanha_destaque) {
    custoCampanhaDestaque = (2.5 / 100) * precoVenda;
  }

  // Custo de frete (vendedor sempre paga uma parte)
  let custoFrete = 0;
  if (state.tipo === 'mercadolivre') {
    const pesoKg = state.mercadolivre.peso_kg || 0;

    if (state.mercadolivre.frete_manual && state.mercadolivre.frete_valor) {
      // Frete manual informado pelo usuário
      custoFrete = state.mercadolivre.frete_valor;
    } else if (pesoKg > 0) {
      // Calcular frete pela tabela do Mercado Livre
      custoFrete = calcularFreteMercadoLivre(
        pesoKg,
        precoVenda,
        state.mercadolivre.frete_gratis
      );
    }
  }

  // Imposto (sobre preço de venda original)
  const impostoPercent = custos.imposto_aliquota || 0;
  const custoImposto = (impostoPercent / 100) * precoVenda;

  // Total custos de venda
  const totalCustosVenda = taxaMarketplace + taxaFixaShopee + custoFrete + custoImposto + custoCupom + custoCampanhaDestaque;

  // ========== LUCRO ==========

  const custoTotal = totalCustosProducao + totalCustosVenda;
  const lucroLiquido = precoVenda - custoTotal;
  const margemLiquida = (lucroLiquido / precoVenda) * 100;

  // Tempo efetivo por peça (considera se imprime múltiplas de uma vez)
  // Se multiplas_pecas = true: tempo informado é o tempo TOTAL da mesa, então tempo por peça = tempo / quantidade
  // Se multiplas_pecas = false: tempo informado é de UMA peça
  const tempoEfetivoPorPeca = custos.multiplas_pecas && quantidadePecas > 1
    ? tempoHoras / quantidadePecas
    : tempoHoras;

  // Lucro por hora (usa tempo efetivo por peça para calcular corretamente)
  const lucroPorHora = tempoEfetivoPorPeca > 0 ? lucroLiquido / tempoEfetivoPorPeca : 0;

  // Capacidade produtiva (assumindo 20h de impressão por dia, 30 dias/mês)
  const horasPorDia = 20;
  const diasPorMes = 30;
  // Se multiplas_pecas = true: produz N peças a cada ciclo de tempoHoras
  // Se multiplas_pecas = false: produz 1 peça a cada tempoHoras
  const ciclosPorDia = tempoHoras > 0 ? Math.floor(horasPorDia / tempoHoras) : 0;
  const pecasPorCiclo = custos.multiplas_pecas ? quantidadePecas : 1;
  const pecasPorDia = ciclosPorDia * pecasPorCiclo;
  const lucroDiario = pecasPorDia * lucroLiquido;
  const pecasPorMes = pecasPorDia * diasPorMes;
  const lucroMensal = lucroDiario * diasPorMes;

  // Classificação da margem
  const getMargemClassificacao = (margem: number): { label: string; color: string; bgColor: string; borderColor: string } => {
    if (margem < 10) return { label: 'Muito arriscado', color: 'text-red-700', bgColor: 'bg-red-100', borderColor: 'border-red-200' };
    if (margem < 20) return { label: 'Muito apertada', color: 'text-orange-700', bgColor: 'bg-orange-100', borderColor: 'border-orange-200' };
    if (margem < 30) return { label: 'Ok', color: 'text-yellow-700', bgColor: 'bg-yellow-100', borderColor: 'border-yellow-200' };
    if (margem < 40) return { label: 'Boa', color: 'text-green-700', bgColor: 'bg-green-100', borderColor: 'border-green-200' };
    return { label: 'Excelente', color: 'text-emerald-700', bgColor: 'bg-emerald-100', borderColor: 'border-emerald-200' };
  };

  const margemClass = getMargemClassificacao(margemLiquida);

  // ========== MONTAR LISTAS DE CUSTOS ==========

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const calcPercent = (valor: number) => precoVenda > 0 ? (valor / precoVenda) * 100 : 0;

  const custosProducaoList: CustoItem[] = [
    { label: 'Filamento', valor: custoFilamento, percentual: calcPercent(custoFilamento), icon: Cylinder },
    { label: 'Energia eletrica', valor: custoEnergia, percentual: calcPercent(custoEnergia), icon: Zap },
    { label: 'Embalagem', valor: custoEmbalagem, percentual: calcPercent(custoEmbalagem), icon: Package },
  ];

  if (custoAcessorios > 0) {
    custosProducaoList.push({ label: 'Acessorios', valor: custoAcessorios, percentual: calcPercent(custoAcessorios), icon: Lightbulb });
  }

  if (outrosCustos > 0) {
    custosProducaoList.push({ label: 'Outros custos', valor: outrosCustos, percentual: calcPercent(outrosCustos), icon: Receipt });
  }

  const custosVendaList: CustoItem[] = [];

  // Cupom próprio - mostrar primeiro para clareza
  if (custoCupom > 0) {
    custosVendaList.push({ label: 'Cupom proprio', valor: custoCupom, percentual: calcPercent(custoCupom), icon: Ticket });
  }

  // Taxa marketplace (comissão calculada sobre preço líquido quando há cupom)
  if (taxaMarketplace > 0) {
    let labelComissao = state.tipo === 'shopee' ? 'Comissao Shopee' : 'Taxa marketplace';
    // Indicar que é sobre preço líquido quando tem cupom
    if (custoCupom > 0) {
      labelComissao += ` (s/ R$ ${formatCurrency(precoLiquido)})`;
    }
    custosVendaList.push({ label: labelComissao, valor: taxaMarketplace, percentual: calcPercent(taxaMarketplace), icon: Percent });
  }

  // Taxa fixa Shopee
  if (taxaFixaShopee > 0) {
    custosVendaList.push({ label: 'Taxa fixa Shopee', valor: taxaFixaShopee, percentual: calcPercent(taxaFixaShopee), icon: Receipt });
  }

  // Campanha de destaque Shopee
  if (custoCampanhaDestaque > 0) {
    custosVendaList.push({ label: 'Campanha destaque', valor: custoCampanhaDestaque, percentual: calcPercent(custoCampanhaDestaque), icon: Star });
  }

  if (custoFrete > 0) {
    const freteLabel = state.tipo === 'mercadolivre' && state.mercadolivre.frete_gratis
      ? 'Frete gratis (vendedor)'
      : 'Frete (vendedor)';
    custosVendaList.push({ label: freteLabel, valor: custoFrete, percentual: calcPercent(custoFrete), icon: Truck });
  }

  if (custoImposto > 0) {
    custosVendaList.push({ label: 'Imposto', valor: custoImposto, percentual: calcPercent(custoImposto), icon: Receipt });
  }

  // Handler para salvar a precificação
  const handleSalvar = async () => {
    // Validar nome
    if (!temNomeValido) {
      alert('Por favor, preencha o nome do produto/simulacao.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    // Usar produto_id do produto selecionado, ou o ID original da simulação carregada
    const produtoId = state.produto_selecionado?.produto.id || produtoIdOriginal || null;

    // Determinar valores de cupom baseado no marketplace
    let cupomDesconto = false;
    let valorCupom: number | null = null;
    if (state.tipo === 'shopee' && state.shopee.cupom_desconto) {
      cupomDesconto = true;
      valorCupom = state.shopee.valor_cupom || null;
    } else if (state.tipo === 'mercadolivre' && state.mercadolivre.cupom_desconto) {
      cupomDesconto = true;
      valorCupom = state.mercadolivre.valor_cupom || null;
    }

    const precificacao: Omit<PrecificacaoSalva, 'id' | 'created_at'> = {
      produto_id: produtoId,
      variacao_id: state.produto_selecionado?.variacao?.id || null,
      marketplace: state.tipo,
      preco_venda: precoVenda,
      preco_anuncio: precosPromocao?.precoAnuncio || null,
      custo_filamento: custoFilamento,
      custo_energia: custoEnergia,
      custo_embalagem: custoEmbalagem,
      taxa_marketplace: taxaMarketplace + taxaFixaShopee,
      frete_vendedor: custoFrete,
      lucro_liquido: lucroLiquido,
      margem: margemLiquida,
      lucro_por_hora: lucroPorHora,
      tempo_impressao: tempoHoras,
      // Inputs para restaurar simulacao
      filamento_id: custos.filamento_id || null,
      peso_filamento_g: pesoFilamento,
      preco_filamento_kg: custos.preco_filamento_kg || 0,
      consumo_kwh: custos.consumo_kwh || 0,
      valor_kwh: custos.valor_kwh || 0,
      peso_kg: state.mercadolivre?.peso_kg || 0,
      imposto_aliquota: custos.imposto_aliquota || 0,
      outros_custos: custos.outros_custos || 0,
      embalagens_config: custos.embalagens_config || [],
      embalagens_ids: [], // Legado
      acessorios_config: custos.acessorios_config || [],
      custo_acessorios: custoAcessorios,
      impressora_id: custos.impressora_id || null,
      impressora_modelo: custos.impressora_modelo || null,
      frete_gratis: state.mercadolivre?.frete_gratis || false,
      frete_manual: state.mercadolivre?.frete_manual || false,
      frete_valor: state.mercadolivre?.frete_valor || null,
      tipo_anuncio: state.mercadolivre?.tipo_anuncio,
      categoria_id: state.mercadolivre?.categoria_id,
      multiplas_pecas: custos.multiplas_pecas || false,
      quantidade_pecas: custos.quantidade_pecas || 1,
      // Promocao
      promocao_ativa: state.promocao?.ativo || false,
      desconto_percentual: state.promocao?.desconto_percentual || null,
      arredondamento: state.promocao?.arredondamento || null,
      // Cupom e campanhas
      cupom_desconto: cupomDesconto,
      valor_cupom: valorCupom,
      campanha_destaque: state.tipo === 'shopee' ? (state.shopee.campanha_destaque || false) : false,
      // Metadata
      nome_produto: state.produto_selecionado?.produto.nome || nomeManual.trim() || null,
      variacao_nome: state.produto_selecionado?.variacao?.nome_variacao,
    };

    // Se tem ID, é uma edição; senão, é nova
    const resultado = simulacaoId
      ? await updatePrecificacao(simulacaoId, precificacao)
      : await createPrecificacao(precificacao);

    setIsSaving(false);

    if (resultado) {
      setSaveSuccess(true);
      onSaveSuccess?.(); // Notificar que salvou com sucesso
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      alert('Erro ao salvar calculo. Tente novamente.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <h4 className="text-sm font-medium text-white flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Resultado da Precificacao
      </h4>

      {/* Preço de Venda */}
      {precosPromocao ? (
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4" />
            <span className="text-sm font-medium opacity-90">Preco de Promocao</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-80">Anunciar por:</span>
              <span className="text-2xl font-bold">R$ {formatCurrency(precosPromocao.precoAnuncio)}</span>
            </div>

            <div className="flex items-center justify-between bg-white/20 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-90">Com desconto:</span>
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  -{precosPromocao.descontoReal}%
                </span>
              </div>
              <span className="text-xl font-bold">R$ {formatCurrency(precosPromocao.precoFinal)}</span>
            </div>
          </div>

          <p className="text-xs opacity-70 mt-3">
            Seu lucro e calculado com base no preco real de R$ {formatCurrency(precoVenda)}
          </p>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <p className="text-sm opacity-90 mb-1">Preco de venda</p>
          <p className="text-3xl font-bold">R$ {formatCurrency(precoVenda)}</p>
        </div>
      )}

      {/* Custos de Produção */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Custos de Producao
        </h5>
        <div className="space-y-2">
          {custosProducaoList.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  R$ {formatCurrency(item.valor)}
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {item.percentual.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Subtotal</span>
            <span className="text-sm font-bold text-white">
              R$ {formatCurrency(totalCustosProducao)}
            </span>
          </div>
        </div>
      </div>

      {/* Custos de Venda */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Custos de Venda
        </h5>
        <div className="space-y-2">
          {custosVendaList.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-300">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  R$ {formatCurrency(item.valor)}
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {item.percentual.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-700 pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-300">Subtotal</span>
            <span className="text-sm font-bold text-white">
              R$ {formatCurrency(totalCustosVenda)}
            </span>
          </div>
        </div>
      </div>

      {/* Lucro Líquido - Card Principal */}
      <div className={`rounded-xl p-5 border-2 ${
        lucroLiquido >= 0 ? margemClass.borderColor + ' bg-gradient-to-br from-gray-800 to-gray-900' : 'border-red-500/30 bg-gradient-to-br from-red-900/20 to-red-900/30'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h5 className="text-sm font-medium text-gray-400 mb-1">Lucro Liquido</h5>
            <p className={`text-4xl font-bold ${lucroLiquido >= 0 ? 'text-white' : 'text-red-500'}`}>
              R$ {formatCurrency(lucroLiquido)}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full ${margemClass.bgColor} ${margemClass.color} flex items-center gap-1.5`}>
            <Star className="w-3.5 h-3.5" />
            <span className="text-sm font-semibold">{margemClass.label}</span>
          </div>
        </div>

        {/* Info Row */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-700">
          {tempoHoras > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">
                <strong className="text-white">R$ {formatCurrency(lucroPorHora)}</strong>/hora
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-400">
              Margem: <strong className={margemClass.color}>{margemLiquida.toFixed(1)}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Aviso de Margem Baixa */}
      {margemLiquida < 20 && margemLiquida >= 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              {margemLiquida < 10 ? 'Margem muito arriscada' : 'Margem apertada'} — monitore seus custos
            </p>
            <p className="text-xs text-amber-500 mt-1">
              Considere aumentar o preco ou reduzir custos de producao
            </p>
          </div>
        </div>
      )}

      {/* Capacidade Produtiva */}
      {tempoHoras > 0 && pecasPorDia > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Factory className="w-4 h-4 text-purple-500" />
            <h5 className="text-sm font-medium text-gray-300">Capacidade Produtiva</h5>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-3 border border-purple-500/20">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Potencial diario (20h)
              </p>
              <p className="text-2xl font-bold text-purple-400">
                {pecasPorDia}
              </p>
              <p className="text-xs text-gray-500">{pecasPorDia === 1 ? 'peca' : 'pecas'}</p>
              <p className="text-sm font-semibold text-purple-400 mt-2">
                R$ {formatCurrency(lucroDiario)}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-purple-500/20">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Potencial mensal (30d)
              </p>
              <p className="text-2xl font-bold text-purple-400">
                {pecasPorMes}
              </p>
              <p className="text-xs text-gray-500">pecas</p>
              <p className="text-sm font-semibold text-purple-400 mt-2">
                R$ {formatCurrency(lucroMensal)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Tempo por peca: {Math.floor(tempoEfetivoPorPeca)}h {Math.round((tempoEfetivoPorPeca % 1) * 60)}min
            {custos.multiplas_pecas && quantidadePecas > 1 && ` (${quantidadePecas} de uma vez)`}
          </p>
        </div>
      )}

      {/* Placeholder para Score do Produto (futuro) */}
      {/*
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 text-indigo-600" />
          <h5 className="text-sm font-medium text-gray-700">Score do Produto</h5>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-indigo-600">85</div>
          <div className="flex-1">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: '85%' }} />
            </div>
            <p className="text-xs text-gray-500 mt-1">Produto com bom potencial</p>
          </div>
        </div>
      </div>
      */}

      {/* Resumo de Multiplas Pecas */}
      {quantidadePecas > 1 && (
        <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-blue-500" />
            <h5 className="text-sm font-medium text-gray-300">
              Calculo para {quantidadePecas} pecas
            </h5>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Por Peca */}
            <div className="bg-gray-800 rounded-lg p-3 border border-blue-500/20">
              <p className="text-xs text-gray-500 mb-2">Por peca</p>
              <div className="space-y-1.5">
                {pesoFilamento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Filamento:</span>
                    <span className="font-medium text-white">{pesoFilamento.toFixed(2)}g</span>
                  </div>
                )}
                {tempoEfetivoPorPeca > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tempo:</span>
                    <span className="font-medium text-white">
                      {Math.floor(tempoEfetivoPorPeca)}h {Math.round((tempoEfetivoPorPeca % 1) * 60)}min
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1.5 border-t border-gray-700">
                  <span className="text-gray-400">Lucro:</span>
                  <span className="font-semibold text-green-500">R$ {formatCurrency(lucroLiquido)}</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-500/30">
              <p className="text-xs text-blue-400 mb-2 font-medium">Total ({quantidadePecas} pecas)</p>
              <div className="space-y-1.5">
                {pesoFilamento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-400">Filamento:</span>
                    <span className="font-bold text-blue-300">{(pesoFilamento * quantidadePecas).toFixed(2)}g</span>
                  </div>
                )}
                {tempoEfetivoPorPeca > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-400">Tempo:</span>
                    <span className="font-bold text-blue-300">
                      {(() => {
                        // Tempo total: sempre tempo efetivo por peça * quantidade
                        const totalHoras = tempoEfetivoPorPeca * quantidadePecas;
                        const h = Math.floor(totalHoras);
                        const m = Math.round((totalHoras - h) * 60);
                        return `${h}h ${m}min`;
                      })()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1.5 border-t border-blue-500/30">
                  <span className="text-blue-400">Lucro:</span>
                  <span className="font-bold text-blue-300">R$ {formatCurrency(lucroLiquido * quantidadePecas)}</span>
                </div>
              </div>
            </div>
          </div>

          {custos.multiplas_pecas && (
            <p className="text-xs text-blue-400 text-center">
              Pecas impressas de uma vez (mesa cheia) - energia dividida
            </p>
          )}
        </div>
      )}

      {/* Nome Manual (quando não tem produto selecionado) */}
      {!temProdutoSelecionado && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Nome da simulacao *
          </label>
          <input
            type="text"
            value={nomeManual}
            onChange={(e) => setNomeManual(e.target.value)}
            placeholder="Ex: Vaso decorativo, Suporte celular..."
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Informe um nome para identificar esta simulacao
          </p>
        </div>
      )}

      {/* Botoes de Acao */}
      <div className="space-y-3">
        {/* Botao Enviar para Producao (apenas se tem produto selecionado) */}
        {temProdutoSelecionado && state.produto_selecionado?.produto.id && (
          <button
            onClick={async () => {
              if (!state.produto_selecionado?.produto.id) return;

              setIsSendingProduction(true);
              setSendProductionSuccess(false);

              const pedido = await createPedido({
                produto_id: state.produto_selecionado.produto.id,
                variacao_id: state.produto_selecionado.variacao?.id || null,
                quantidade: quantidadePecas,
                quantidade_produzida: 0,
                status: 'pendente',
                observacao: `Via calculadora - Preco: R$ ${formatCurrency(precoVenda)}`,
              });

              setIsSendingProduction(false);

              if (pedido) {
                setSendProductionSuccess(true);
                setTimeout(() => {
                  setSendProductionSuccess(false);
                  navigate('/fila-producao');
                }, 1500);
              } else {
                alert('Erro ao enviar para producao. Tente novamente.');
              }
            }}
            disabled={isSendingProduction}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
              sendProductionSuccess
                ? 'bg-green-500 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSendingProduction ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : sendProductionSuccess ? (
              <>
                <Check className="w-5 h-5" />
                Enviado! Redirecionando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar {quantidadePecas > 1 ? `${quantidadePecas} pecas` : ''} para producao
              </>
            )}
          </button>
        )}

        {/* Botão Salvar */}
        <button
          onClick={handleSalvar}
          disabled={isSaving || !canSave || !temNomeValido}
          className={`w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            saveSuccess
              ? 'bg-green-500 text-white'
              : canSave && temNomeValido
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gray-700 text-gray-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando...
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-5 h-5" />
              Salvo com sucesso!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {simulacaoId ? 'Atualizar calculo' : 'Salvar calculo'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
