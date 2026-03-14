import { DollarSign, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface PrecoMargemConfigProps {
  precoVenda?: number;
  onPrecoVendaChange: (value: number) => void;
}

// Input especial para preco com formatacao em 2 casas decimais
function PrecoInput({
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
        setInputValue(value.toFixed(2));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      isUserTyping.current = true;
      setInputValue(val);

      if (val === '' || val === '.') {
        onChange(0);
      } else if (!val.endsWith('.')) {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
          onChange(num);
        }
      }
    }
  };

  const handleBlur = () => {
    isUserTyping.current = false;

    if (inputValue === '' || inputValue === '.') {
      setInputValue('');
      onChange(0);
    } else {
      const num = parseFloat(inputValue);
      if (!isNaN(num) && num >= 0) {
        const formatted = num.toFixed(2);
        setInputValue(num === 0 ? '' : formatted);
        onChange(num);
      }
    }
  };

  return (
    <div className="relative max-w-[200px]">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={() => { isUserTyping.current = true; }}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-lg font-semibold
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
      />
    </div>
  );
}

export function PrecoMargemConfig({
  precoVenda,
  onPrecoVendaChange,
}: PrecoMargemConfigProps) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        <DollarSign className="w-4 h-4" />
        Preco de Venda
      </h4>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Preco de venda (R$)
        </label>
        <PrecoInput
          value={precoVenda}
          onChange={onPrecoVendaChange}
          placeholder="39.90"
        />
        <div className="flex items-start gap-1.5 mt-2">
          <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">
            O sistema calcula automaticamente: lucro, margem, lucro por hora e capacidade produtiva
          </p>
        </div>
      </div>
    </div>
  );
}
