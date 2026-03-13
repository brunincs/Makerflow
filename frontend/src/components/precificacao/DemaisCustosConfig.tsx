import { DecimalInput } from '../ui/DecimalInput';
import { Receipt, Percent, Package, PlusCircle, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface DemaisCustosConfigProps {
  impostoAliquota?: number;
  onImpostoAliquotaChange: (value: number) => void;
  custoEmbalagem?: number;
  onCustoEmbalagemChange: (value: number) => void;
  outrosCustos?: number;
  onOutrosCustosChange: (value: number) => void;
}

// Input especial para porcentagem (apenas numeros inteiros)
function PercentInput({
  value,
  onChange,
  placeholder,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
}) {
  const [inputValue, setInputValue] = useState<string>('');
  const isUserTyping = useRef(false);

  useEffect(() => {
    if (!isUserTyping.current) {
      if (value === undefined || value === 0) {
        setInputValue('');
      } else {
        setInputValue(String(value));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Permitir apenas digitos
    if (val === '' || /^\d*$/.test(val)) {
      isUserTyping.current = true;
      setInputValue(val);

      if (val === '') {
        onChange(0);
      } else {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num >= 0) {
          onChange(num);
        }
      }
    }
  };

  const handleBlur = () => {
    isUserTyping.current = false;
    if (inputValue === '') {
      setInputValue('');
      onChange(0);
    }
  };

  return (
    <div className="relative max-w-[120px]">
      <input
        type="text"
        inputMode="numeric"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => { isUserTyping.current = true; }}
        placeholder={placeholder}
        className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg bg-white
          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
        %
      </span>
    </div>
  );
}

export function DemaisCustosConfig({
  impostoAliquota,
  onImpostoAliquotaChange,
  custoEmbalagem,
  onCustoEmbalagemChange,
  outrosCustos,
  onOutrosCustosChange,
}: DemaisCustosConfigProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Receipt className="w-4 h-4" />
        Demais Custos
      </h4>

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-5">
        {/* Imposto (aliquota) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Percent className="w-4 h-4" />
            Imposto (aliquota)
          </label>
          <PercentInput
            value={impostoAliquota}
            onChange={onImpostoAliquotaChange}
            placeholder="6"
          />
          <div className="flex items-center gap-1 mt-1.5">
            <Info className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">
              Simples: 4–19,5% · MEI isento
            </p>
          </div>
        </div>

        {/* Embalagem / acabamento */}
        <div className="border-t border-orange-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Embalagem / acabamento
          </label>
          <div className="relative max-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              R$
            </span>
            <DecimalInput
              value={custoEmbalagem}
              onChange={onCustoEmbalagemChange}
              placeholder="2.50"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Outros custos */}
        <div className="border-t border-orange-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Outros custos (R$)
          </label>
          <div className="relative max-w-[160px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              R$
            </span>
            <DecimalInput
              value={outrosCustos}
              onChange={onOutrosCustosChange}
              placeholder="0.00"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
