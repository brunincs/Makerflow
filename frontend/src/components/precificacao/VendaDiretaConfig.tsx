import { useState } from 'react';
import { VendaDiretaConfig as VendaDiretaConfigType, ProdutoSelecionado, FormaPagamento } from '../../types';
import { Input } from '../ui/Input';
import { ProdutoSelector } from './ProdutoSelector';
import { getProdutoBySku } from '../../services/produtosService';
import {
  CreditCard,
  Smartphone,
  Percent,
  Info,
  Search,
  Banknote,
  Wallet,
  AlertCircle,
  Check,
  Loader2
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
  const [skuBusca, setSkuBusca] = useState('');
  const [buscandoSku, setBuscandoSku] = useState(false);
  const [erroSku, setErroSku] = useState<string | null>(null);
  const [sucessoSku, setSucessoSku] = useState(false);

  const handleChange = (field: keyof VendaDiretaConfigType, valor: string | FormaPagamento) => {
    if (field === 'forma_pagamento') {
      onChange({ ...value, [field]: valor as FormaPagamento });
    } else {
      onChange({ ...value, [field]: valor ? parseFloat(valor as string) : 0 });
    }
  };

  // Buscar produto por SKU
  const handleBuscarSku = async () => {
    if (!skuBusca.trim()) return;

    setBuscandoSku(true);
    setErroSku(null);
    setSucessoSku(false);

    const resultado = await getProdutoBySku(skuBusca.trim());

    if (resultado) {
      onProdutoChange({
        produto: resultado.produto,
        variacao: resultado.variacao || undefined,
      });
      setSucessoSku(true);
      setSkuBusca('');
      setTimeout(() => setSucessoSku(false), 2000);
    } else {
      setErroSku(`SKU "${skuBusca}" nao encontrado`);
    }

    setBuscandoSku(false);
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
      {/* Busca por SKU */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Buscar por SKU
        </h4>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={skuBusca}
                onChange={(e) => {
                  setSkuBusca(e.target.value.toUpperCase());
                  setErroSku(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscarSku()}
                placeholder="Digite o SKU do produto..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white uppercase
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {sucessoSku && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
              )}
            </div>
            <button
              type="button"
              onClick={handleBuscarSku}
              disabled={buscandoSku || !skuBusca.trim()}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                flex items-center gap-2"
            >
              {buscandoSku ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Buscar
            </button>
          </div>

          {erroSku && (
            <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {erroSku}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Busca no SKU do produto e nas variacoes
          </p>
        </div>
      </div>

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

      {/* Taxas de Pagamento */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Percent className="w-4 h-4" />
          Taxas de pagamento
        </h4>

        <div className="space-y-4">
          {/* Gateway de Pagamento */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Gateway de pagamento</p>
                <p className="text-xs text-gray-500">Taxa cobrada pela plataforma (ex: Mercado Pago, PagSeguro)</p>
              </div>
            </div>
            <Input
              label="Taxa do gateway (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Ex: 4.99"
              value={value.taxa_gateway?.toString() || ''}
              onChange={(e) => handleChange('taxa_gateway', e.target.value)}
              className="bg-white"
            />
          </div>

          {/* Taxa Cartao */}
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

          {/* Taxa PIX */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Smartphone className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Taxa PIX</p>
                <p className="text-xs text-gray-500">Taxa para pagamentos via PIX (geralmente menor ou gratuita)</p>
              </div>
            </div>
            <Input
              label="Taxa do PIX (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Ex: 0.99"
              value={value.taxa_pix?.toString() || ''}
              onChange={(e) => handleChange('taxa_pix', e.target.value)}
              className="bg-white"
            />
          </div>
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
              As unicas taxas sao as cobradas pelos meios de pagamento que voce utiliza.
            </p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1">
              <li>• <strong>Gateway:</strong> plataforma de checkout (Mercado Pago, PagSeguro, Stripe)</li>
              <li>• <strong>Cartao:</strong> taxa adicional para credito/debito</li>
              <li>• <strong>PIX:</strong> geralmente mais baixa ou zerada</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
