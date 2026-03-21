import { useState, useEffect, useMemo } from 'react';
import { MarketplaceState, MarketplaceType, ProdutoSelecionado, CustosProducaoConfig, KitItem, PromocaoConfig, Embalagem } from '../../types';
import { ShopeeConfigComponent } from './ShopeeConfig';
import { MercadoLivreConfigComponent } from './MercadoLivreConfig';
import { VendaDiretaConfigComponent } from './VendaDiretaConfig';
import { ImpressoraEnergiaConfig } from './ImpressoraEnergiaConfig';
import { FilamentoConfig } from './FilamentoConfig';
import { DemaisCustosConfig } from './DemaisCustosConfig';
import { PrecoMargemConfig } from './PrecoMargemConfig';
import { ResultadoCard } from './ResultadoCard';
import { CATEGORIAS } from './MercadoLivreConfig';
import { KitSelector } from './KitSelector';
import { ShopeeIcon, MercadoLivreIcon } from '../ui/MarketplaceIcons';
import { Store, Package, Layers } from 'lucide-react';
import { getEmbalagens } from '../../services/embalagensService';
import { getAcessorios } from '../../services/acessoriosService';
import { Acessorio } from '../../types/acessorio';

interface MarketplaceSelectorProps {
  value: MarketplaceState;
  onChange: (state: MarketplaceState) => void;
  canSave?: boolean;
  onSaveSuccess?: () => void;
  nomeProdutoCarregado?: string; // Nome do produto quando carrega simulação salva
  simulacaoId?: string; // ID da simulação sendo editada
  produtoIdOriginal?: string; // ID do produto quando carrega simulação do radar
}

const MARKETPLACES = [
  {
    id: 'mercadolivre' as MarketplaceType,
    nome: 'Mercado Livre',
    descricao: 'Maior marketplace do Brasil',
    icon: MercadoLivreIcon,
    color: 'yellow',
  },
  {
    id: 'shopee' as MarketplaceType,
    nome: 'Shopee',
    descricao: 'Marketplace com cupons e campanhas',
    icon: ShopeeIcon,
    color: 'orange',
  },
  {
    id: 'venda_direta' as MarketplaceType,
    nome: 'Venda Direta',
    descricao: 'Site proprio ou redes sociais',
    icon: Store,
    color: 'blue',
  },
];

export function MarketplaceSelector({ value, onChange, canSave = true, onSaveSuccess, nomeProdutoCarregado, simulacaoId, produtoIdOriginal }: MarketplaceSelectorProps) {
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);

  // Carregar embalagens e acessorios para calcular custos
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

  const handleMarketplaceChange = (tipo: MarketplaceType) => {
    onChange({ ...value, tipo });
  };

  const handleProdutoChange = (produto: ProdutoSelecionado | null) => {
    // Quando um produto e selecionado, carrega automaticamente a categoria no Mercado Livre
    if (produto?.produto.categoria_id) {
      onChange({
        ...value,
        produto_selecionado: produto || undefined,
        mercadolivre: {
          ...value.mercadolivre,
          categoria_id: produto.produto.categoria_id,
        },
      });
    } else {
      onChange({ ...value, produto_selecionado: produto || undefined });
    }
  };

  // Handler para custos de producao
  const handleCustosProducaoChange = (field: keyof CustosProducaoConfig, fieldValue: unknown) => {
    onChange({
      ...value,
      custos_producao: {
        ...value.custos_producao,
        [field]: fieldValue,
      },
    });
  };

  const custos = value.custos_producao || {};

  // Handler combinado para filamento (atualiza id e preço juntos)
  const handleFilamentoChange = (id: string | undefined, preco: number | undefined) => {
    const updates: Partial<CustosProducaoConfig> = { filamento_id: id };
    if (preco !== undefined) {
      updates.preco_filamento_kg = preco;
    }
    onChange({
      ...value,
      custos_producao: {
        ...value.custos_producao,
        ...updates,
      },
    });
  };

  // Handler para preco de venda
  const handlePrecoVendaChange = (preco: number) => {
    onChange({ ...value, preco_venda: preco });
  };

  // Handler para promocao
  const handlePromocaoChange = (promocao: PromocaoConfig) => {
    onChange({ ...value, promocao });
  };

  // Handler para modo kit
  const handleModoKitChange = (modoKit: boolean) => {
    onChange({
      ...value,
      modo_kit: modoKit,
      // Limpar produto selecionado ao trocar de modo
      produto_selecionado: modoKit ? undefined : value.produto_selecionado,
      kit_itens: modoKit ? (value.kit_itens || []) : undefined,
    });
  };

  // Handler para itens do kit
  const handleKitItensChange = (itens: KitItem[]) => {
    onChange({ ...value, kit_itens: itens });
  };

  // Calcular totais do kit para uso nos componentes de custos
  const kitTotais = value.kit_itens?.reduce((acc, item) => {
    const peso = (item.variacao?.peso_filamento || item.produto.peso_filamento || 0) * item.quantidade;
    const tempo = (item.variacao?.tempo_impressao || item.produto.tempo_impressao || 0) * item.quantidade;
    return { peso: acc.peso + peso, tempo: acc.tempo + tempo };
  }, { peso: 0, tempo: 0 }) || { peso: 0, tempo: 0 };

  // Calcular custo total para sugestões de desconto
  const custoTotal = useMemo(() => {
    const custos = value.custos_producao || {};
    const precoVenda = value.preco_venda || 0;

    // Peso do filamento
    const pesoFilamento = value.modo_kit && kitTotais.peso > 0
      ? kitTotais.peso
      : value.produto_selecionado?.variacao?.peso_filamento
        || value.produto_selecionado?.produto.peso_filamento
        || custos.peso_filamento_g
        || 0;

    // Tempo de impressão
    const tempoHoras = value.modo_kit && kitTotais.tempo > 0
      ? kitTotais.tempo
      : value.produto_selecionado?.variacao?.tempo_impressao
        || value.produto_selecionado?.produto.tempo_impressao
        || ((custos.tempo_impressao_horas || 0) + (custos.tempo_impressao_minutos || 0) / 60)
        || 0;

    // Custo do filamento
    const custoFilamento = custos.preco_filamento_kg && pesoFilamento
      ? (custos.preco_filamento_kg / 1000) * pesoFilamento
      : 0;

    // Custo de energia
    let custoEnergia = (custos.consumo_kwh || 0) * (custos.valor_kwh || 0) * tempoHoras;
    if (custos.multiplas_pecas && custos.quantidade_pecas && custos.quantidade_pecas > 1) {
      custoEnergia = custoEnergia / custos.quantidade_pecas;
    }

    // Custo de embalagem (com quantidade)
    const custoEmbalagem = (custos.embalagens_config || []).reduce((total, cfg) => {
      const emb = embalagens.find(e => e.id === cfg.embalagem_id);
      return total + (emb?.preco_unitario || 0) * cfg.quantidade;
    }, 0);

    // Custo de acessorios
    const custoAcessorios = (custos.acessorios_config || []).reduce((total, cfg) => {
      const acessorio = acessorios.find(a => a.id === cfg.acessorio_id);
      return total + (acessorio?.custo_unitario || 0) * cfg.quantidade;
    }, 0);

    const outrosCustos = custos.outros_custos || 0;
    const totalCustosProducao = custoFilamento + custoEnergia + custoEmbalagem + custoAcessorios + outrosCustos;

    // Taxa do marketplace
    let taxaMarketplace = 0;
    let taxaFixaShopee = 0;

    if (value.tipo === 'mercadolivre') {
      const categoria = CATEGORIAS.find(c => c.id === value.mercadolivre.categoria_id);
      if (categoria) {
        const taxaPercent = value.mercadolivre.tipo_anuncio === 'classico'
          ? categoria.taxa_classico
          : categoria.taxa_premium;
        taxaMarketplace = (taxaPercent / 100) * precoVenda;
      }
    } else if (value.tipo === 'shopee') {
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
      } else {
        comissaoPercent = 14;
        taxaFixaShopee = 26;
      }
      let comissao = (comissaoPercent / 100) * precoVenda;
      if (comissao > 100) comissao = 100;
      taxaMarketplace = comissao;
    }

    // Imposto
    const custoImposto = ((custos.imposto_aliquota || 0) / 100) * precoVenda;

    // Cupom próprio
    let custoCupom = 0;
    if (value.tipo === 'shopee' && value.shopee.cupom_desconto && value.shopee.valor_cupom) {
      custoCupom = value.shopee.valor_cupom;
    } else if (value.tipo === 'mercadolivre' && value.mercadolivre.cupom_desconto && value.mercadolivre.valor_cupom) {
      custoCupom = value.mercadolivre.valor_cupom;
    }

    const totalCustosVenda = taxaMarketplace + taxaFixaShopee + custoImposto + custoCupom;

    return totalCustosProducao + totalCustosVenda;
  }, [value, kitTotais, embalagens, acessorios]);

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { selected: string; unselected: string; iconBg: string; iconColor: string }> = {
      yellow: {
        selected: 'border-yellow-500 bg-yellow-50',
        unselected: 'border-gray-200 hover:border-gray-300 bg-white',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
      },
      orange: {
        selected: 'border-orange-500 bg-orange-50',
        unselected: 'border-gray-200 hover:border-gray-300 bg-white',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600',
      },
      blue: {
        selected: 'border-blue-500 bg-blue-50',
        unselected: 'border-gray-200 hover:border-gray-300 bg-white',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
    };

    const c = colors[color] || colors.blue;
    return isSelected ? c : { ...c, selected: c.unselected };
  };

  return (
    <div className="space-y-6">
      {/* Selecao de Marketplace */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Onde voce vai vender?
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {MARKETPLACES.map((marketplace) => {
            const isSelected = value.tipo === marketplace.id;
            const colors = getColorClasses(marketplace.color, isSelected);
            const Icon = marketplace.icon;

            return (
              <button
                key={marketplace.id}
                type="button"
                onClick={() => handleMarketplaceChange(marketplace.id)}
                className={`p-5 rounded-xl border-2 transition-all text-left ${
                  isSelected ? colors.selected : colors.unselected
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-3 rounded-xl ${isSelected ? colors.iconBg : 'bg-gray-100'}`}>
                    <Icon className={`w-6 h-6 ${isSelected ? colors.iconColor : 'text-gray-400'}`} />
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{marketplace.nome}</h4>
                <p className="text-sm text-gray-500">{marketplace.descricao}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selecao Produto/Kit */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => handleModoKitChange(false)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              !value.modo_kit
                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Produto Unico
          </button>
          <button
            type="button"
            onClick={() => handleModoKitChange(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              value.modo_kit
                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Kit
          </button>
        </div>

        {/* Modo Kit: Seletor de multiplos produtos */}
        {value.modo_kit && (
          <div className="mb-6">
            <KitSelector
              itens={value.kit_itens || []}
              onChange={handleKitItensChange}
            />
          </div>
        )}

        {/* Configuracao do Marketplace (aparece sempre) */}
        {value.tipo === 'shopee' && (
          <ShopeeConfigComponent
            value={value.shopee}
            onChange={(shopee) => onChange({ ...value, shopee })}
            produtoSelecionado={value.produto_selecionado || null}
            onProdutoChange={handleProdutoChange}
            modoKit={value.modo_kit}
          />
        )}

        {value.tipo === 'mercadolivre' && (
          <MercadoLivreConfigComponent
            value={value.mercadolivre}
            onChange={(mercadolivre) => onChange({ ...value, mercadolivre })}
            produtoSelecionado={value.produto_selecionado || null}
            onProdutoChange={handleProdutoChange}
            modoKit={value.modo_kit}
          />
        )}

        {value.tipo === 'venda_direta' && (
          <VendaDiretaConfigComponent
            value={value.venda_direta}
            onChange={(venda_direta) => onChange({ ...value, venda_direta })}
            produtoSelecionado={value.produto_selecionado || null}
            onProdutoChange={handleProdutoChange}
            modoKit={value.modo_kit}
          />
        )}
      </div>

      {/* Secoes de Producao (aparecem para todos os marketplaces) */}
      <div className="border-t border-gray-200 pt-6 space-y-6">
        {/* Impressora & Energia */}
        <ImpressoraEnergiaConfig
          tempoHoras={custos.tempo_impressao_horas || 0}
          tempoMinutos={custos.tempo_impressao_minutos || 0}
          onTempoHorasChange={(v) => handleCustosProducaoChange('tempo_impressao_horas', v >= 0 ? v : 0)}
          onTempoMinutosChange={(v) => handleCustosProducaoChange('tempo_impressao_minutos', v >= 0 && v < 60 ? v : 0)}
          produtoSelecionado={value.produto_selecionado || null}
          impressoraId={custos.impressora_id}
          onImpressoraChange={(id, consumo) => {
            // Atualizar id e consumo de uma vez só para evitar race condition
            onChange({
              ...value,
              custos_producao: {
                ...value.custos_producao,
                impressora_id: id,
                consumo_kwh: consumo,
              },
            });
          }}
          consumoKwh={custos.consumo_kwh}
          valorKwh={custos.valor_kwh}
          onValorKwhChange={(v: number) => handleCustosProducaoChange('valor_kwh', v >= 0 ? v : 0)}
          modoKit={value.modo_kit}
          kitTotais={kitTotais}
        />

        {/* Filamento */}
        <FilamentoConfig
          precoFilamentoKg={custos.preco_filamento_kg}
          onPrecoFilamentoKgChange={(v) => handleCustosProducaoChange('preco_filamento_kg', v)}
          pesoFilamentoG={custos.peso_filamento_g}
          onPesoFilamentoGChange={(v) => handleCustosProducaoChange('peso_filamento_g', v)}
          filamentoId={custos.filamento_id}
          onFilamentoChange={handleFilamentoChange}
          produtoSelecionado={value.produto_selecionado || null}
          modoKit={value.modo_kit}
          kitTotais={kitTotais}
        />

        {/* Demais Custos */}
        <DemaisCustosConfig
          impostoAliquota={custos.imposto_aliquota}
          onImpostoAliquotaChange={(v) => handleCustosProducaoChange('imposto_aliquota', v)}
          embalagensConfig={custos.embalagens_config}
          onEmbalagensChange={(config) => handleCustosProducaoChange('embalagens_config', config)}
          acessoriosConfig={custos.acessorios_config}
          onAcessoriosChange={(config) => handleCustosProducaoChange('acessorios_config', config)}
          outrosCustos={custos.outros_custos}
          onOutrosCustosChange={(v) => handleCustosProducaoChange('outros_custos', v)}
        />

        {/* Preco de Venda e Promocao */}
        <PrecoMargemConfig
          precoVenda={value.preco_venda}
          onPrecoVendaChange={handlePrecoVendaChange}
          promocao={value.promocao}
          onPromocaoChange={handlePromocaoChange}
          custoTotal={custoTotal}
        />

        {/* Resultado */}
        <ResultadoCard
          state={value}
          canSave={canSave}
          onSaveSuccess={onSaveSuccess}
          nomeProdutoCarregado={nomeProdutoCarregado}
          simulacaoId={simulacaoId}
          produtoIdOriginal={produtoIdOriginal}
          modoKit={value.modo_kit}
          kitTotais={kitTotais}
        />
      </div>
    </div>
  );
}
