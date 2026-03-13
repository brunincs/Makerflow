import { MarketplaceState, MarketplaceType, ProdutoSelecionado, CustosProducaoConfig, ModoPrecificacao } from '../../types';
import { ShopeeConfigComponent } from './ShopeeConfig';
import { MercadoLivreConfigComponent } from './MercadoLivreConfig';
import { VendaDiretaConfigComponent } from './VendaDiretaConfig';
import { ImpressoraEnergiaConfig } from './ImpressoraEnergiaConfig';
import { FilamentoConfig } from './FilamentoConfig';
import { DemaisCustosConfig } from './DemaisCustosConfig';
import { PrecoMargemConfig } from './PrecoMargemConfig';
import { ResultadoCard } from './ResultadoCard';
import { ShopeeIcon, MercadoLivreIcon } from '../ui/MarketplaceIcons';
import { Store } from 'lucide-react';

interface MarketplaceSelectorProps {
  value: MarketplaceState;
  onChange: (state: MarketplaceState) => void;
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

export function MarketplaceSelector({ value, onChange }: MarketplaceSelectorProps) {
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

  // Handlers para preco e margem
  const handleModoChange = (modo: ModoPrecificacao) => {
    onChange({ ...value, modo_precificacao: modo });
  };

  const handlePrecoVendaChange = (preco: number) => {
    onChange({ ...value, preco_venda: preco });
  };

  const handleMargemDesejadaChange = (margem: number) => {
    onChange({ ...value, margem_desejada: margem });
  };

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

      {/* Configuracao do Marketplace Selecionado */}
      <div className="border-t border-gray-200 pt-6">
        {value.tipo === 'shopee' && (
          <ShopeeConfigComponent
            value={value.shopee}
            onChange={(shopee) => onChange({ ...value, shopee })}
            produtoSelecionado={value.produto_selecionado || null}
            onProdutoChange={handleProdutoChange}
          />
        )}

        {value.tipo === 'mercadolivre' && (
          <MercadoLivreConfigComponent
            value={value.mercadolivre}
            onChange={(mercadolivre) => onChange({ ...value, mercadolivre })}
            produtoSelecionado={value.produto_selecionado || null}
            onProdutoChange={handleProdutoChange}
          />
        )}

        {value.tipo === 'venda_direta' && (
          <VendaDiretaConfigComponent
            value={value.venda_direta}
            onChange={(venda_direta) => onChange({ ...value, venda_direta })}
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
          impressoraModelo={custos.impressora_modelo}
          onImpressoraModeloChange={(v) => handleCustosProducaoChange('impressora_modelo', v)}
          consumoKwh={custos.consumo_kwh}
          onConsumoKwhChange={(v) => handleCustosProducaoChange('consumo_kwh', v >= 0 ? v : 0)}
          valorKwh={custos.valor_kwh}
          onValorKwhChange={(v) => handleCustosProducaoChange('valor_kwh', v >= 0 ? v : 0)}
          multiplasPecas={custos.multiplas_pecas}
          onMultiplasPecasChange={(v) => handleCustosProducaoChange('multiplas_pecas', v)}
          quantidadePecas={custos.quantidade_pecas}
          onQuantidadePecasChange={(v) => handleCustosProducaoChange('quantidade_pecas', v >= 1 ? v : 1)}
        />

        {/* Filamento */}
        <FilamentoConfig
          precoFilamentoKg={custos.preco_filamento_kg}
          onPrecoFilamentoKgChange={(v) => handleCustosProducaoChange('preco_filamento_kg', v)}
          pesoFilamentoG={custos.peso_filamento_g}
          onPesoFilamentoGChange={(v) => handleCustosProducaoChange('peso_filamento_g', v)}
          filamentoId={custos.filamento_id}
          onFilamentoIdChange={(v) => handleCustosProducaoChange('filamento_id', v)}
          produtoSelecionado={value.produto_selecionado || null}
        />

        {/* Demais Custos */}
        <DemaisCustosConfig
          impostoAliquota={custos.imposto_aliquota}
          onImpostoAliquotaChange={(v) => handleCustosProducaoChange('imposto_aliquota', v)}
          custoEmbalagem={custos.custo_embalagem}
          onCustoEmbalagemChange={(v) => handleCustosProducaoChange('custo_embalagem', v)}
          outrosCustos={custos.outros_custos}
          onOutrosCustosChange={(v) => handleCustosProducaoChange('outros_custos', v)}
        />

        {/* Preco & Margem */}
        <PrecoMargemConfig
          modo={value.modo_precificacao}
          onModoChange={handleModoChange}
          precoVenda={value.preco_venda}
          onPrecoVendaChange={handlePrecoVendaChange}
          margemDesejada={value.margem_desejada}
          onMargemDesejadaChange={handleMargemDesejadaChange}
        />

        {/* Resultado */}
        <ResultadoCard state={value} />
      </div>
    </div>
  );
}
