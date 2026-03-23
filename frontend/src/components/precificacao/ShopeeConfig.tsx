import { ShopeeConfig as ShopeeConfigType, ShopeeVendedorType, ShopeeComissaoFaixa, ProdutoSelecionado } from '../../types';
import { Toggle } from '../ui/Toggle';
import { Input } from '../ui/Input';
import { ProdutoSelector } from './ProdutoSelector';
import { Info, Building2, User, Tag, Percent } from 'lucide-react';

interface ShopeeConfigProps {
  value: ShopeeConfigType;
  onChange: (config: ShopeeConfigType) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  onProdutoChange: (produto: ProdutoSelecionado | null) => void;
  modoKit?: boolean;
}

const FAIXAS_COMISSAO: ShopeeComissaoFaixa[] = [
  { min: 0, max: 79.99, percentual: 20, taxa_fixa: 4, label: 'Ate R$79,99' },
  { min: 80, max: 99.99, percentual: 14, taxa_fixa: 16, label: 'R$80 - R$99,99' },
  { min: 100, max: 199.99, percentual: 14, taxa_fixa: 20, label: 'R$100 - R$199,99' },
  { min: 200, max: 499.99, percentual: 14, taxa_fixa: 26, label: 'R$200 - R$499,99' },
  { min: 500, max: null, percentual: 14, taxa_fixa: 26, label: 'R$500+' },
];

export function ShopeeConfigComponent({ value, onChange, produtoSelecionado, onProdutoChange, modoKit }: ShopeeConfigProps) {
  const handleVendedorChange = (tipo: ShopeeVendedorType) => {
    onChange({ ...value, tipo_vendedor: tipo });
  };

  const handleToggle = (field: 'campanha_destaque' | 'cupom_desconto', checked: boolean) => {
    onChange({ ...value, [field]: checked });
  };

  const handleCupomValor = (valor: string) => {
    onChange({ ...value, valor_cupom: valor ? parseFloat(valor) : undefined });
  };

  return (
    <div className="space-y-6">
      {/* Tipo de Vendedor */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          Tipo de vendedor
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleVendedorChange('cnpj')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              value.tipo_vendedor === 'cnpj'
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${value.tipo_vendedor === 'cnpj' ? 'bg-orange-500/20' : 'bg-gray-700'}`}>
                <Building2 className={`w-5 h-5 ${value.tipo_vendedor === 'cnpj' ? 'text-orange-500' : 'text-gray-500'}`} />
              </div>
              <span className="font-semibold text-white">CNPJ</span>
            </div>
            <p className="text-xs text-gray-400">Tabela padrao de comissao</p>
          </button>

          <button
            type="button"
            onClick={() => handleVendedorChange('cpf')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              value.tipo_vendedor === 'cpf'
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${value.tipo_vendedor === 'cpf' ? 'bg-orange-500/20' : 'bg-gray-700'}`}>
                <User className={`w-5 h-5 ${value.tipo_vendedor === 'cpf' ? 'text-orange-500' : 'text-gray-500'}`} />
              </div>
              <span className="font-semibold text-white">CPF</span>
            </div>
            <p className="text-xs text-gray-400">+R$3 por item (baixo volume)</p>
          </button>
        </div>
      </div>

      {/* Selecionar Produto do Radar (esconde em modo Kit) */}
      {!modoKit && (
        <ProdutoSelector
          value={produtoSelecionado}
          onChange={onProdutoChange}
        />
      )}

      {/* Opcoes Adicionais */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-white flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Opcoes adicionais
        </h4>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-4">
          <Toggle
            checked={value.campanha_destaque}
            onChange={(checked) => handleToggle('campanha_destaque', checked)}
            label="Campanha de destaque"
            description="+2.5% de comissao durante a campanha"
          />

          <div className="border-t border-orange-500/30 pt-4">
            <Toggle
              checked={value.cupom_desconto}
              onChange={(checked) => handleToggle('cupom_desconto', checked)}
              label="Cupom de desconto proprio"
              description="Desconto bancado pelo vendedor"
            />

            {value.cupom_desconto && (
              <div className="mt-3 ml-14">
                <Input
                  label="Valor do cupom (R$)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 5.00"
                  value={value.valor_cupom?.toString() || ''}
                  onChange={(e) => handleCupomValor(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Taxas */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Percent className="w-4 h-4" />
          Tabela de taxas Shopee
        </h4>

        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800">
                <th className="px-4 py-3 text-left font-medium text-gray-400">Faixa de preco</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Comissao</th>
                <th className="px-4 py-3 text-right font-medium text-gray-400">Taxa fixa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {FAIXAS_COMISSAO.map((faixa, index) => (
                <tr key={index} className="hover:bg-gray-800">
                  <td className="px-4 py-3 text-white">{faixa.label}</td>
                  <td className="px-4 py-3 text-right text-white">{faixa.percentual}%</td>
                  <td className="px-4 py-3 text-right text-white">R$ {faixa.taxa_fixa.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="px-4 py-3 bg-orange-500/10 border-t border-orange-500/30">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-400">
                <strong>Teto de comissao:</strong> R$100,00 por item
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { FAIXAS_COMISSAO };
