import { ModoPrecificacao } from '../../types';
import { DollarSign, Percent, Info } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface PrecoMargemConfigProps {
  modo: ModoPrecificacao;
  onModoChange: (modo: ModoPrecificacao) => void;
  precoVenda?: number;
  onPrecoVendaChange: (value: number) => void;
  margemDesejada?: number;
  onMargemDesejadaChange: (value: number) => void;
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
  modo,
  onModoChange,
  precoVenda,
  onPrecoVendaChange,
  margemDesejada,
  onMargemDesejadaChange,
}: PrecoMargemConfigProps) {
  const margem = margemDesejada ?? 30;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        <DollarSign className="w-4 h-4" />
        Preco & Margem
      </h4>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
        {/* Seletor de Modo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Modo de precificacao
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onModoChange('preco_manual')}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                modo === 'preco_manual'
                  ? 'border-green-500 bg-green-100 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Digitar preco
            </button>
            <button
              type="button"
              onClick={() => onModoChange('margem')}
              className={`flex-1 px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                modo === 'margem'
                  ? 'border-green-500 bg-green-100 text-green-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <Percent className="w-4 h-4" />
              Margem desejada
            </button>
          </div>
        </div>

        {/* Modo: Preco Manual */}
        {modo === 'preco_manual' && (
          <div className="border-t border-green-200 pt-4">
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
                Usado para calcular comissoes, taxas e frete subsidiado
              </p>
            </div>
          </div>
        )}

        {/* Modo: Margem */}
        {modo === 'margem' && (
          <div className="border-t border-green-200 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Margem desejada
            </label>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={margem}
                  onChange={(e) => onMargemDesejadaChange(parseInt(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                    [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                />
                <div className="flex items-center gap-1 min-w-[60px]">
                  <span className="text-2xl font-bold text-green-700">{margem}</span>
                  <span className="text-lg text-green-600">%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>5%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>
            <div className="flex items-start gap-1.5 mt-3">
              <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-500">
                O preco sera calculado automaticamente com base na margem
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
