import { Plus, Trash2, Package, Scale, Clock } from 'lucide-react';
import { Input } from './Input';
import { Button } from './Button';
import { ShopeeIcon, MercadoLivreIcon } from './MarketplaceIcons';
import { VariacaoProduto } from '../../types';

interface VariacaoItem {
  id?: string;
  nome_variacao: string;
  preco_shopee: string;
  preco_mercado_livre: string;
  peso_filamento: string;
  tempo_horas: number;
  tempo_minutos: number;
}

interface VariacoesEditorProps {
  value: VariacaoItem[];
  onChange: (variacoes: VariacaoItem[]) => void;
}

export function VariacoesEditor({ value, onChange }: VariacoesEditorProps) {
  const addVariacao = () => {
    onChange([
      ...value,
      {
        nome_variacao: '',
        preco_shopee: '',
        preco_mercado_livre: '',
        peso_filamento: '',
        tempo_horas: 0,
        tempo_minutos: 0,
      },
    ]);
  };

  const removeVariacao = (index: number) => {
    const newVariacoes = value.filter((_, i) => i !== index);
    onChange(newVariacoes);
  };

  const updateVariacao = (index: number, field: keyof VariacaoItem, fieldValue: string | number) => {
    const newVariacoes = [...value];
    newVariacoes[index] = { ...newVariacoes[index], [field]: fieldValue };
    onChange(newVariacoes);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-gray-900">Variacoes do Produto</h3>
        </div>
        <span className="text-sm text-gray-500">
          {value.length} {value.length === 1 ? 'variacao' : 'variacoes'}
        </span>
      </div>

      {value.length === 0 ? (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-3">
            Nenhuma variacao adicionada
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={addVariacao}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Variacao
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {value.map((variacao, index) => (
            <div
              key={index}
              className="bg-white border border-purple-200 rounded-xl shadow-sm overflow-hidden"
            >
              {/* Header da Variacao */}
              <div className="bg-purple-50 px-4 py-3 flex items-center justify-between border-b border-purple-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-purple-900">
                    {variacao.nome_variacao || `Variacao ${index + 1}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeVariacao(index)}
                  className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                  title="Remover variacao"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Nome da Variacao */}
                <Input
                  label="Nome da Variacao"
                  placeholder="Ex: Pequeno, Medio, Grande..."
                  value={variacao.nome_variacao}
                  onChange={(e) => updateVariacao(index, 'nome_variacao', e.target.value)}
                />

                {/* Dados de Producao */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-green-800 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4" />
                    Dados de Producao
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Peso */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Peso da Peca (g)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={variacao.peso_filamento}
                          onChange={(e) => updateVariacao(index, 'peso_filamento', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
                            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          g
                        </span>
                      </div>
                    </div>

                    {/* Tempo de Impressao */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
                              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white
                              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Precos Marketplace */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
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
          ))}

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
        preco_shopee: v.preco_shopee ? parseFloat(v.preco_shopee) : undefined,
        preco_mercado_livre: v.preco_mercado_livre ? parseFloat(v.preco_mercado_livre) : undefined,
        peso_filamento: v.peso_filamento ? parseFloat(v.peso_filamento) : undefined,
        tempo_impressao: tempoImpressao > 0 ? tempoImpressao : undefined,
      };
    });
}

// Utilitario para converter do formato do banco para o editor
export function variacoesFromDB(variacoes?: VariacaoProduto[]): VariacaoItem[] {
  if (!variacoes) return [];
  return variacoes.map(v => {
    const tempo = v.tempo_impressao ? tempoDecimalParaHorasMinutos(v.tempo_impressao) : { horas: 0, minutos: 0 };
    return {
      id: v.id,
      nome_variacao: v.nome_variacao || '',
      preco_shopee: v.preco_shopee?.toString() || '',
      preco_mercado_livre: v.preco_mercado_livre?.toString() || '',
      peso_filamento: v.peso_filamento?.toString() || '',
      tempo_horas: tempo.horas,
      tempo_minutos: tempo.minutos,
    };
  });
}
