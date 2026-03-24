import { Plus, Trash2, Package, Scale, Clock, Lock, Barcode, Ruler } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { ShopeeIcon, MercadoLivreIcon } from './MarketplaceIcons';
import { VariacaoProduto } from '../../types';

interface VariacaoItem {
  id?: string;
  nome_variacao: string;
  sku: string;
  preco_shopee: string;
  preco_mercado_livre: string;
  peso_filamento: string;
  tempo_horas: number;
  tempo_minutos: number;
  dimensoes: string;
  herdaDoProduto?: boolean; // Indica se herda dados do produto base
}

interface VariacoesEditorProps {
  value: VariacaoItem[];
  onChange: (variacoes: VariacaoItem[]) => void;
  // Dados do produto base para herdar na primeira variação
  produtoBase?: {
    peso_filamento: string;
    tempo_horas: number;
    tempo_minutos: number;
  };
}

export function VariacoesEditor({ value, onChange, produtoBase }: VariacoesEditorProps) {
  const addVariacao = () => {
    const isFirstVariation = value.length === 0;

    if (isFirstVariation && produtoBase) {
      // Primeira variação: herda dados do produto base, nome vazio para usuário preencher
      onChange([
        ...value,
        {
          nome_variacao: '',
          sku: '',
          preco_shopee: '',
          preco_mercado_livre: '',
          peso_filamento: produtoBase.peso_filamento,
          tempo_horas: produtoBase.tempo_horas,
          tempo_minutos: produtoBase.tempo_minutos,
          dimensoes: '',
          herdaDoProduto: true,
        },
      ]);
    } else {
      // Demais variações: campos editáveis
      onChange([
        ...value,
        {
          nome_variacao: '',
          sku: '',
          preco_shopee: '',
          preco_mercado_livre: '',
          peso_filamento: '',
          tempo_horas: 0,
          tempo_minutos: 0,
          dimensoes: '',
          herdaDoProduto: false,
        },
      ]);
    }
  };

  const removeVariacao = (index: number) => {
    const newVariacoes = value.filter((_, i) => i !== index);
    onChange(newVariacoes);
  };

  const updateVariacao = (index: number, field: keyof VariacaoItem, fieldValue: string | number | boolean) => {
    const newVariacoes = [...value];
    newVariacoes[index] = { ...newVariacoes[index], [field]: fieldValue };
    onChange(newVariacoes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[#9ca3af]" />
          <h3 className="font-medium text-[#f9fafb]">Variacoes do Produto</h3>
        </div>
        <span className="text-sm text-[#6b7280]">
          {value.length} {value.length === 1 ? 'variacao' : 'variacoes'}
        </span>
      </div>

      {value.length === 0 ? (
        <div className="bg-[#1e293b] border border-dashed border-[#374151] rounded-lg p-6 text-center">
          <Package className="w-8 h-8 text-[#4b5563] mx-auto mb-2" />
          <p className="text-sm text-[#9ca3af] mb-3">
            Nenhuma variacao adicionada
          </p>
          <p className="text-xs text-[#6b7280] mb-3">
            Ao adicionar a primeira variacao, ela herdara os dados de producao do produto base
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={addVariacao}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Variacao
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {value.map((variacao, index) => {
            const isFirstAndInherited = index === 0 && variacao.herdaDoProduto;

            return (
              <div
                key={index}
                className="bg-[#1e293b] border border-[#374151] rounded-xl overflow-hidden"
              >
                {/* Header da Variacao */}
                <div className="px-4 py-3 flex items-center justify-between border-b border-[#374151] bg-[#0f172a]">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold ${
                      isFirstAndInherited ? 'bg-emerald-600' : 'bg-[#6b7280]'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-[#f9fafb]">
                      {variacao.nome_variacao || `Variacao ${index + 1}`}
                    </span>
                    {isFirstAndInherited && (
                      <span className="flex items-center gap-1 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3" />
                        Herda do produto base
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariacao(index)}
                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    title="Remover variacao"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Nome e SKU da Variacao */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Nome da Variacao"
                      placeholder="Ex: Pequeno, Medio, Grande..."
                      value={variacao.nome_variacao}
                      onChange={(e) => updateVariacao(index, 'nome_variacao', e.target.value)}
                    />
                    <div>
                      <label className="block text-sm font-medium text-[#f9fafb] mb-2 flex items-center gap-1">
                        <Barcode className="w-4 h-4 text-[#9ca3af]" />
                        SKU da Variacao
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: GATO-P"
                        value={variacao.sku}
                        onChange={(e) => updateVariacao(index, 'sku', e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-[#374151] rounded-lg bg-[#111827] text-[#f9fafb] placeholder-[#6b7280]
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 uppercase text-sm"
                      />
                    </div>
                  </div>

                  {/* Dados de Producao */}
                  <div className="border border-[#374151] rounded-lg p-3 bg-[#111827]">
                    <h4 className="text-sm font-medium text-[#f9fafb] mb-3 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-[#9ca3af]" />
                      Dados de Producao
                      {isFirstAndInherited && (
                        <span className="text-xs text-emerald-400 font-normal ml-2">
                          (sincronizado com produto base)
                        </span>
                      )}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Peso */}
                      <div>
                        <label className="block text-xs font-medium text-[#9ca3af] mb-1">
                          Peso da Peca (g)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={variacao.peso_filamento}
                            onChange={(e) => {
                              const val = e.target.value.replace(',', '.');
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                updateVariacao(index, 'peso_filamento', val);
                              }
                            }}
                            placeholder="22.46"
                            disabled={isFirstAndInherited}
                            className={`w-full px-3 py-2 pr-8 border border-[#374151] rounded-lg text-sm
                              focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                              ${isFirstAndInherited
                                ? 'bg-emerald-500/10 text-emerald-400 cursor-not-allowed'
                                : 'bg-[#1e293b] text-[#f9fafb]'
                              }`}
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">
                            g
                          </span>
                        </div>
                      </div>

                      {/* Tempo de Impressao */}
                      <div>
                        <label className="block text-xs font-medium text-[#9ca3af] mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Tempo de Impressao
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={variacao.tempo_horas || ''}
                              onChange={(e) => updateVariacao(index, 'tempo_horas', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              disabled={isFirstAndInherited}
                              className={`w-full px-3 py-2 border border-[#374151] rounded-lg text-sm
                                focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                                ${isFirstAndInherited
                                  ? 'bg-emerald-500/10 text-emerald-400 cursor-not-allowed'
                                  : 'bg-[#1e293b] text-[#f9fafb]'
                                }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">
                              h
                            </span>
                          </div>
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              value={variacao.tempo_minutos || ''}
                              onChange={(e) => updateVariacao(index, 'tempo_minutos', parseInt(e.target.value) || 0)}
                              placeholder="0"
                              disabled={isFirstAndInherited}
                              className={`w-full px-3 py-2 border border-[#374151] rounded-lg text-sm
                                focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500
                                ${isFirstAndInherited
                                  ? 'bg-emerald-500/10 text-emerald-400 cursor-not-allowed'
                                  : 'bg-[#1e293b] text-[#f9fafb]'
                                }`}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6b7280]">
                              min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dimensões */}
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-[#9ca3af] mb-1 flex items-center gap-1">
                        <Ruler className="w-3 h-3" />
                        Dimensoes (opcional)
                      </label>
                      <input
                        type="text"
                        value={variacao.dimensoes || ''}
                        onChange={(e) => updateVariacao(index, 'dimensoes', e.target.value)}
                        placeholder="Ex: 10x5x3 cm"
                        className="w-full px-3 py-2 border border-[#374151] rounded-lg text-sm bg-[#1e293b] text-[#f9fafb] placeholder-[#6b7280]
                          focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Precos Marketplace */}
                  <div className="bg-[#111827] border border-[#374151] rounded-lg p-3">
                    <h4 className="text-sm font-medium text-[#f9fafb] mb-3">
                      Precos por Marketplace
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <div className="absolute left-3 top-8 text-orange-500">
                          <ShopeeIcon className="w-4 h-4" />
                        </div>
                        <Input
                          label="Preco Shopee"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={variacao.preco_shopee}
                          onChange={(e) => updateVariacao(index, 'preco_shopee', e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <div className="relative">
                        <div className="absolute left-3 top-8 text-yellow-500">
                          <MercadoLivreIcon className="w-4 h-4" />
                        </div>
                        <Input
                          label="Preco Mercado Livre"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={variacao.preco_mercado_livre}
                          onChange={(e) => updateVariacao(index, 'preco_mercado_livre', e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="secondary" size="sm" onClick={addVariacao}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Variacao
          </Button>
        </div>
      )}
    </div>
  );
}

// Utilitario para converter horas/minutos para decimal
function horasMinutosParaDecimal(horas: number, minutos: number): number {
  return horas + (minutos / 60);
}

// Utilitario para converter decimal para horas/minutos
function tempoDecimalParaHorasMinutos(decimal: number): { horas: number; minutos: number } {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  return { horas, minutos };
}

// Utilitario para converter para o formato do banco
export function variacoesToDB(variacoes: VariacaoItem[]): Omit<VariacaoProduto, 'id' | 'produto_id' | 'created_at'>[] {
  return variacoes
    .filter(v => v.nome_variacao.trim() !== '')
    .map(v => {
      const tempoImpressao = horasMinutosParaDecimal(v.tempo_horas || 0, v.tempo_minutos || 0);
      return {
        nome_variacao: v.nome_variacao.trim(),
        sku: v.sku?.trim() || undefined,
        preco_shopee: v.preco_shopee ? parseFloat(v.preco_shopee) : undefined,
        preco_mercado_livre: v.preco_mercado_livre ? parseFloat(v.preco_mercado_livre) : undefined,
        peso_filamento: v.peso_filamento ? parseFloat(v.peso_filamento) : undefined,
        tempo_impressao: tempoImpressao > 0 ? tempoImpressao : undefined,
        dimensoes: v.dimensoes?.trim() || undefined,
      };
    });
}

// Utilitario para converter do formato do banco para o editor
export function variacoesFromDB(variacoes?: VariacaoProduto[]): VariacaoItem[] {
  if (!variacoes) return [];
  return variacoes.map((v, index) => {
    const tempo = v.tempo_impressao ? tempoDecimalParaHorasMinutos(v.tempo_impressao) : { horas: 0, minutos: 0 };
    return {
      id: v.id,
      nome_variacao: v.nome_variacao || '',
      sku: v.sku || '',
      preco_shopee: v.preco_shopee?.toString() || '',
      preco_mercado_livre: v.preco_mercado_livre?.toString() || '',
      peso_filamento: v.peso_filamento?.toString() || '',
      tempo_horas: tempo.horas,
      tempo_minutos: tempo.minutos,
      dimensoes: v.dimensoes || '',
      // A primeira variação sempre herda (para produtos existentes)
      herdaDoProduto: index === 0,
    };
  });
}
