import { VendaDiretaConfig as VendaDiretaConfigType } from '../../types';
import { Input } from '../ui/Input';
import { CreditCard, Smartphone, Percent, Info } from 'lucide-react';

interface VendaDiretaConfigProps {
  value: VendaDiretaConfigType;
  onChange: (config: VendaDiretaConfigType) => void;
}

export function VendaDiretaConfigComponent({ value, onChange }: VendaDiretaConfigProps) {
  const handleChange = (field: keyof VendaDiretaConfigType, valor: string) => {
    onChange({ ...value, [field]: valor ? parseFloat(valor) : 0 });
  };

  return (
    <div className="space-y-6">
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
                <p className="text-xs text-gray-500">Taxa cobrada pela plataforma de pagamento (ex: Mercado Pago, PagSeguro)</p>
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
