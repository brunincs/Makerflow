import { VendaDiretaConfig as VendaDiretaConfigType, ProdutoSelecionado, FormaPagamento } from '../../types';
import { Input } from '../ui/Input';
import { ProdutoSelector } from './ProdutoSelector';
import {
  CreditCard,
  Percent,
  Info,
  Banknote,
  Wallet,
  Smartphone,
} from 'lucide-react';

interface VendaDiretaConfigProps {
  value: VendaDiretaConfigType;
  onChange: (config: VendaDiretaConfigType) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  onProdutoChange: (produto: ProdutoSelecionado | null) => void;
}

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string; icon: typeof CreditCard; color: string }[] = [
  { value: 'pix', label: 'PIX', icon: Smartphone, color: 'green' },
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'emerald' },
  { value: 'cartao_credito', label: 'Credito', icon: CreditCard, color: 'purple' },
  { value: 'cartao_debito', label: 'Debito', icon: CreditCard, color: 'blue' },
  { value: 'outro', label: 'Outro', icon: Wallet, color: 'gray' },
];

export function VendaDiretaConfigComponent({
  value,
  onChange,
  produtoSelecionado,
  onProdutoChange
}: VendaDiretaConfigProps) {
  const handleChange = (field: keyof VendaDiretaConfigType, valor: string | FormaPagamento) => {
    if (field === 'forma_pagamento') {
      onChange({ ...value, [field]: valor as FormaPagamento });
    } else {
      onChange({ ...value, [field]: valor ? parseFloat(valor as string) : 0 });
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
      green: { bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', iconBg: 'bg-green-100' },
      emerald: { bg: 'bg-emerald-50', border: 'border-emerald-500', text: 'text-emerald-700', iconBg: 'bg-emerald-100' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-500', text: 'text-purple-700', iconBg: 'bg-purple-100' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', iconBg: 'bg-blue-100' },
      gray: { bg: 'bg-gray-50', border: 'border-gray-500', text: 'text-gray-700', iconBg: 'bg-gray-100' },
    };
    return colors[color] || colors.gray;
  };

  return (
    <div className="space-y-6">
      {/* Selecionar Produto do Radar */}
      <ProdutoSelector
        value={produtoSelecionado}
        onChange={onProdutoChange}
      />

      {/* Forma de Pagamento */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          Forma de pagamento
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {FORMAS_PAGAMENTO.map((forma) => {
            const Icon = forma.icon;
            const isSelected = value.forma_pagamento === forma.value;
            const colors = getColorClasses(forma.color);

            return (
              <button
                key={forma.value}
                type="button"
                onClick={() => handleChange('forma_pagamento', forma.value)}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  isSelected
                    ? `${colors.border} ${colors.bg}`
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? colors.iconBg : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isSelected ? colors.text : 'text-gray-500'}`} />
                </div>
                <span className={`text-sm font-medium ${isSelected ? colors.text : 'text-gray-700'}`}>
                  {forma.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Taxa de Cartão */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Percent className="w-4 h-4" />
          Taxa de pagamento
        </h4>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Taxa de cartao</p>
              <p className="text-xs text-gray-500">Taxa para pagamentos com cartao de credito/debito</p>
            </div>
          </div>
          <Input
            label="Taxa do cartao (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            placeholder="Ex: 2.99"
            value={value.taxa_cartao?.toString() || ''}
            onChange={(e) => handleChange('taxa_cartao', e.target.value)}
            className="bg-white"
          />
        </div>
      </div>

      {/* Informativo */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Como funciona</p>
            <p className="text-xs text-gray-600 mt-1">
              Na venda direta, voce nao paga comissoes de marketplace.
              A unica taxa e a do cartao de credito/debito quando utilizado.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Pagamentos em dinheiro ou PIX geralmente nao tem taxas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
