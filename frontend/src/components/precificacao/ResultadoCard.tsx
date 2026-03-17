import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarketplaceState, PrecificacaoSalva, Embalagem } from '../../types';
import { CATEGORIAS } from './MercadoLivreConfig';
import { createPrecificacao, updatePrecificacao } from '../../services/precificacoesService';
import { getEmbalagens } from '../../services/embalagensService';
import { createPedido } from '../../services/pedidosService';
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
  Layers
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
}

interface CustoItem {
  label: string;
  valor: number;
  percentual: number;
  icon: React.ElementType;
}

export function ResultadoCard({ state, canSave = true, onSaveSuccess, nomeProdutoCarregado, simulacaoId, produtoIdOriginal }: ResultadoCardProps) {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSendingProduction, setIsSendingProduction] = useState(false);
  const [sendProductionSuccess, setSendProductionSuccess] = useState(false);
  const [nomeManual, setNomeManual] = useState('');
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);

  const custos = state.custos_producao || {};
  const temProdutoSelecionado = !!state.produto_selecionado;
  const precoVenda = state.preco_venda || 0;
  const quantidadePecas = custos.quantidade_pecas || 1;

  // Carregar embalagens para calcular o custo
  useEffect(() => {
    const loadEmbalagens = async () => {
      const data = await getEmbalagens();
      setEmbalagens(data);
    };
    loadEmbalagens();
  }, []);

  // Pré-preencher nome quando carrega simulação
  useEffect(() => {
    if (nomeProdutoCarregado && !nomeManual) {
      setNomeManual(nomeProdutoCarregado);
    }
  }, [nomeProdutoCarregado]);

  // Se tem produto selecionado ou nome manual, o nome é válido
  const temNomeValido = temProdutoSelecionado || !!nomeManual.trim();

  // Se não tem preço de venda, não mostra o card
  if (precoVenda <= 0) {
    return null;
  }

  // ========== CÁLCULOS DE CUSTOS ==========

  // Peso do filamento (do produto ou manual)
  const pesoFilamento = state.produto_selecionado?.variacao?.peso_filamento
    || state.produto_selecionado?.produto.peso_filamento
    || custos.peso_filamento_g
    || 0;

  // Custo do filamento
  const custoFilamento = custos.preco_filamento_kg && pesoFilamento
    ? (custos.preco_filamento_kg / 1000) * pesoFilamento
    : 0;

  // Tempo de impressão (do produto ou manual)
  const tempoHoras = state.produto_selecionado?.variacao?.tempo_impressao
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

  // Custo de embalagem (soma das embalagens selecionadas)
  const custoEmbalagem = (custos.embalagens_ids || []).reduce((total, id) => {
    const emb = embalagens.find(e => e.id === id);
    return total + (emb?.preco_unitario || 0);
  }, 0);

  // Outros custos de produção
  const outrosCustos = custos.outros_custos || 0;

  // Total custos de produção
  const totalCustosProducao = custoFilamento + custoEnergia + custoEmbalagem + outrosCustos;

  // ========== CUSTOS DE VENDA ==========

  // Taxa do marketplace (baseado na categoria e tipo de anúncio)
  let taxaMarketplace = 0;
  let taxaFixaShopee = 0;

  if (state.tipo === 'mercadolivre') {
    const categoria = CATEGORIAS.find(c => c.id === state.mercadolivre.categoria_id);
    if (categoria) {
      const taxaMarketplacePercent = state.mercadolivre.tipo_anuncio === 'classico'
        ? categoria.taxa_classico
        : categoria.taxa_premium;
      taxaMarketplace = (taxaMarketplacePercent / 100) * precoVenda;
    }
  } else if (state.tipo === 'shopee') {
    // Shopee: tabela de comissão baseada no preço
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

    // Calcular comissão (máximo R$100)
    let comissao = (comissaoPercent / 100) * precoVenda;
    if (comissao > 100) {
      comissao = 100;
    }

    taxaMarketplace = comissao;
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

  // Imposto
  const impostoPercent = custos.imposto_aliquota || 0;
  const custoImposto = (impostoPercent / 100) * precoVenda;

  // Total custos de venda
  const totalCustosVenda = taxaMarketplace + taxaFixaShopee + custoFrete + custoImposto;

  // ========== LUCRO ==========

  const custoTotal = totalCustosProducao + totalCustosVenda;
  const lucroLiquido = precoVenda - custoTotal;
  const margemLiquida = (lucroLiquido / precoVenda) * 100;

  // Lucro por hora
  const lucroPorHora = tempoHoras > 0 ? lucroLiquido / tempoHoras : 0;

  // Capacidade produtiva (assumindo 20h de impressão por dia, 30 dias/mês)
  const horasPorDia = 20;
  const diasPorMes = 30;
  const pecasPorDia = tempoHoras > 0 ? Math.floor(horasPorDia / tempoHoras) : 0;
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

  const calcPercent = (valor: number) => precoVenda > 0 ? (valor / precoVenda) * 100 : 0;

  const custosProducaoList: CustoItem[] = [
    { label: 'Filamento', valor: custoFilamento, percentual: calcPercent(custoFilamento), icon: Cylinder },
    { label: 'Energia eletrica', valor: custoEnergia, percentual: calcPercent(custoEnergia), icon: Zap },
    { label: 'Embalagem', valor: custoEmbalagem, percentual: calcPercent(custoEmbalagem), icon: Package },
  ];

  if (outrosCustos > 0) {
    custosProducaoList.push({ label: 'Outros custos', valor: outrosCustos, percentual: calcPercent(outrosCustos), icon: Receipt });
  }

  const custosVendaList: CustoItem[] = [];

  // Taxa marketplace (comissão)
  if (taxaMarketplace > 0) {
    const labelComissao = state.tipo === 'shopee' ? 'Comissao Shopee' : 'Taxa marketplace';
    custosVendaList.push({ label: labelComissao, valor: taxaMarketplace, percentual: calcPercent(taxaMarketplace), icon: Percent });
  }

  // Taxa fixa Shopee
  if (taxaFixaShopee > 0) {
    custosVendaList.push({ label: 'Taxa fixa Shopee', valor: taxaFixaShopee, percentual: calcPercent(taxaFixaShopee), icon: Receipt });
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

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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

    const precificacao: Omit<PrecificacaoSalva, 'id' | 'created_at'> = {
      produto_id: produtoId,
      marketplace: state.tipo,
      preco_venda: precoVenda,
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
      embalagens_ids: custos.embalagens_ids || [],
      impressora_modelo: custos.impressora_modelo || null,
      frete_gratis: state.mercadolivre?.frete_gratis || false,
      tipo_anuncio: state.mercadolivre?.tipo_anuncio,
      categoria_id: state.mercadolivre?.categoria_id,
      multiplas_pecas: custos.multiplas_pecas || false,
      quantidade_pecas: custos.quantidade_pecas || 1,
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
      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Resultado da Precificacao
      </h4>

      {/* Preço de Venda */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
        <p className="text-sm opacity-90 mb-1">Preco de venda</p>
        <p className="text-3xl font-bold">R$ {formatCurrency(precoVenda)}</p>
      </div>

      {/* Custos de Produção */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Custos de Producao
        </h5>
        <div className="space-y-2">
          {custosProducaoList.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  R$ {formatCurrency(item.valor)}
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {item.percentual.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Subtotal</span>
            <span className="text-sm font-bold text-gray-900">
              R$ {formatCurrency(totalCustosProducao)}
            </span>
          </div>
        </div>
      </div>

      {/* Custos de Venda */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Custos de Venda
        </h5>
        <div className="space-y-2">
          {custosVendaList.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  R$ {formatCurrency(item.valor)}
                </span>
                <span className="text-xs text-gray-400 w-12 text-right">
                  {item.percentual.toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
          <div className="border-t border-gray-200 pt-2 mt-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Subtotal</span>
            <span className="text-sm font-bold text-gray-900">
              R$ {formatCurrency(totalCustosVenda)}
            </span>
          </div>
        </div>
      </div>

      {/* Lucro Líquido - Card Principal */}
      <div className={`rounded-xl p-5 border-2 ${
        lucroLiquido >= 0 ? margemClass.borderColor + ' bg-gradient-to-br from-white to-gray-50' : 'border-red-300 bg-gradient-to-br from-red-50 to-red-100'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h5 className="text-sm font-medium text-gray-600 mb-1">Lucro Liquido</h5>
            <p className={`text-4xl font-bold ${lucroLiquido >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              R$ {formatCurrency(lucroLiquido)}
            </p>
          </div>
          <div className={`px-3 py-1.5 rounded-full ${margemClass.bgColor} ${margemClass.color} flex items-center gap-1.5`}>
            <Star className="w-3.5 h-3.5" />
            <span className="text-sm font-semibold">{margemClass.label}</span>
          </div>
        </div>

        {/* Info Row */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-200">
          {tempoHoras > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                <strong className="text-gray-900">R$ {formatCurrency(lucroPorHora)}</strong>/hora
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Margem: <strong className={margemClass.color}>{margemLiquida.toFixed(1)}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Aviso de Margem Baixa */}
      {margemLiquida < 20 && margemLiquida >= 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {margemLiquida < 10 ? 'Margem muito arriscada' : 'Margem apertada'} — monitore seus custos
            </p>
            <p className="text-xs text-amber-600 mt-1">
              Considere aumentar o preco ou reduzir custos de producao
            </p>
          </div>
        </div>
      )}

      {/* Capacidade Produtiva */}
      {tempoHoras > 0 && pecasPorDia > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Factory className="w-4 h-4 text-purple-600" />
            <h5 className="text-sm font-medium text-gray-700">Capacidade Produtiva</h5>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Potencial diario (20h)
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {pecasPorDia}
              </p>
              <p className="text-xs text-gray-500">{pecasPorDia === 1 ? 'peca' : 'pecas'}</p>
              <p className="text-sm font-semibold text-purple-600 mt-2">
                R$ {formatCurrency(lucroDiario)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Potencial mensal (30d)
              </p>
              <p className="text-2xl font-bold text-purple-700">
                {pecasPorMes}
              </p>
              <p className="text-xs text-gray-500">pecas</p>
              <p className="text-sm font-semibold text-purple-600 mt-2">
                R$ {formatCurrency(lucroMensal)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Tempo por peca: {Math.floor(tempoHoras)}h {Math.round((tempoHoras % 1) * 60)}min
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
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-blue-600" />
            <h5 className="text-sm font-medium text-gray-700">
              Calculo para {quantidadePecas} pecas
            </h5>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Por Peca */}
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-gray-500 mb-2">Por peca</p>
              <div className="space-y-1.5">
                {pesoFilamento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Filamento:</span>
                    <span className="font-medium">{pesoFilamento}g</span>
                  </div>
                )}
                {tempoHoras > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tempo:</span>
                    <span className="font-medium">
                      {Math.floor(tempoHoras)}h {Math.round((tempoHoras % 1) * 60)}min
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1.5 border-t border-gray-100">
                  <span className="text-gray-600">Lucro:</span>
                  <span className="font-semibold text-green-600">R$ {formatCurrency(lucroLiquido)}</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="bg-blue-100 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-700 mb-2 font-medium">Total ({quantidadePecas} pecas)</p>
              <div className="space-y-1.5">
                {pesoFilamento > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Filamento:</span>
                    <span className="font-bold text-blue-800">{pesoFilamento * quantidadePecas}g</span>
                  </div>
                )}
                {tempoHoras > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Tempo:</span>
                    <span className="font-bold text-blue-800">
                      {(() => {
                        const totalHoras = custos.multiplas_pecas ? tempoHoras : tempoHoras * quantidadePecas;
                        const h = Math.floor(totalHoras);
                        const m = Math.round((totalHoras - h) * 60);
                        return `${h}h ${m}min`;
                      })()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1.5 border-t border-blue-200">
                  <span className="text-blue-700">Lucro:</span>
                  <span className="font-bold text-blue-800">R$ {formatCurrency(lucroLiquido * quantidadePecas)}</span>
                </div>
              </div>
            </div>
          </div>

          {custos.multiplas_pecas && (
            <p className="text-xs text-blue-600 text-center">
              Pecas impressas de uma vez (mesa cheia) - energia dividida
            </p>
          )}
        </div>
      )}

      {/* Nome Manual (quando não tem produto selecionado) */}
      {!temProdutoSelecionado && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome da simulacao *
          </label>
          <input
            type="text"
            value={nomeManual}
            onChange={(e) => setNomeManual(e.target.value)}
            placeholder="Ex: Vaso decorativo, Suporte celular..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
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
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500'
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
