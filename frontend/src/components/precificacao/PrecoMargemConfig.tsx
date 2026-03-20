import { DollarSign, Info, Tag, Percent } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Toggle } from '../ui/Toggle';
import { PromocaoConfig, ArredondamentoPromocao } from '../../types';

interface PrecoMargemConfigProps {
  precoVenda?: number;
  onPrecoVendaChange: (value: number) => void;
  promocao?: PromocaoConfig;
  onPromocaoChange?: (promocao: PromocaoConfig) => void;
}

// Input especial para preco com formatacao em 2 casas decimais
function PrecoInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
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
        disabled={disabled}
        className={`w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg bg-white text-lg font-semibold
          focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
      />
    </div>
  );
}

// Funcao para arredondar preco para .90 ou .99
function arredondarPreco(preco: number, tipo: ArredondamentoPromocao): number {
  const parteInteira = Math.floor(preco);
  const final = tipo === '90' ? 0.90 : 0.99;

  // Se o preco ja esta abaixo do arredondamento, arredonda para baixo
  if (preco - parteInteira < final) {
    return parteInteira + final;
  }
  // Senao, arredonda para o proximo inteiro + final
  return parteInteira + 1 + final;
}

// Funcao para calcular preco de anuncio
function calcularPrecoAnuncio(precoReal: number, descontoPercent: number): number {
  // Validacao: desconto maximo 90%
  const desconto = Math.min(Math.max(descontoPercent, 0), 90);

  // Evitar divisao por zero
  if (desconto >= 100) return precoReal;

  // Formula: preco_anuncio = preco_real / (1 - (desconto / 100))
  return precoReal / (1 - desconto / 100);
}

export function PrecoMargemConfig({
  precoVenda,
  onPrecoVendaChange,
  promocao,
  onPromocaoChange,
}: PrecoMargemConfigProps) {
  // Estado local da promocao com valores padrao
  const promocaoAtiva = promocao?.ativo ?? false;
  const descontoPercent = promocao?.desconto_percentual ?? 50;
  const arredondamento = promocao?.arredondamento ?? '90';

  // Calcula precos da promocao
  const precosPromocao = useMemo(() => {
    if (!promocaoAtiva || !precoVenda || precoVenda <= 0) {
      return null;
    }

    const precoAnuncioRaw = calcularPrecoAnuncio(precoVenda, descontoPercent);
    const precoAnuncio = arredondarPreco(precoAnuncioRaw, arredondamento);
    const precoFinal = precoAnuncio * (1 - descontoPercent / 100);

    return {
      precoAnuncio,
      precoFinal,
      descontoReal: ((precoAnuncio - precoFinal) / precoAnuncio * 100).toFixed(0),
    };
  }, [promocaoAtiva, precoVenda, descontoPercent, arredondamento]);

  const handlePromocaoToggle = (ativo: boolean) => {
    onPromocaoChange?.({
      ativo,
      desconto_percentual: descontoPercent,
      arredondamento,
    });
  };

  const handleDescontoChange = (valor: string) => {
    const num = parseFloat(valor) || 0;
    // Limitar entre 0 e 90
    const descontoValidado = Math.min(Math.max(num, 0), 90);
    onPromocaoChange?.({
      ativo: promocaoAtiva,
      desconto_percentual: descontoValidado,
      arredondamento,
    });
  };

  const handleArredondamentoChange = (tipo: ArredondamentoPromocao) => {
    onPromocaoChange?.({
      ativo: promocaoAtiva,
      desconto_percentual: descontoPercent,
      arredondamento: tipo,
    });
  };

  return (
    <div className="space-y-4">
      {/* Preco de Venda */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Preco de Venda
        </h4>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {promocaoAtiva ? 'Preco real desejado (R$)' : 'Preco de venda (R$)'}
          </label>
          <PrecoInput
            value={precoVenda}
            onChange={onPrecoVendaChange}
            placeholder="39.90"
          />
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {promocaoAtiva
                ? 'Este e o valor que voce realmente recebera apos o desconto'
                : 'O sistema calcula automaticamente: lucro, margem, lucro por hora e capacidade produtiva'}
            </p>
          </div>
        </div>
      </div>

      {/* Promocao */}
      {onPromocaoChange && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Promocao
          </h4>

          <div className={`border rounded-xl p-4 transition-colors ${
            promocaoAtiva
              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <Toggle
              checked={promocaoAtiva}
              onChange={handlePromocaoToggle}
              label="Calcular preco com promocao"
              description="Mostra preco inflado com desconto para aumentar conversao"
            />

            {promocaoAtiva && (
              <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700 space-y-4">
                {/* Desconto */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    Desconto (%)
                  </label>
                  <div className="relative max-w-[150px]">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      step="1"
                      value={descontoPercent}
                      onChange={(e) => handleDescontoChange(e.target.value)}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximo: 90%
                  </p>
                </div>

                {/* Arredondamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Arredondamento
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleArredondamentoChange('90')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        arredondamento === '90'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-purple-400'
                      }`}
                    >
                      ,90
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArredondamentoChange('99')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        arredondamento === '99'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-purple-400'
                      }`}
                    >
                      ,99
                    </button>
                  </div>
                </div>

                {/* Preview do Preco */}
                {precosPromocao && (
                  <div className="bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-600 rounded-xl p-4 mt-4">
                    <h5 className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Preco de Promocao
                    </h5>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Anunciar por:</span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          R$ {precosPromocao.precoAnuncio.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Com desconto:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            R$ {precosPromocao.precoFinal.toFixed(2)}
                          </span>
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
                            -{precosPromocao.descontoReal}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        O cliente ve o preco riscado de R$ {precosPromocao.precoAnuncio.toFixed(2)} e paga R$ {precosPromocao.precoFinal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Exportar funcoes utilitarias para uso em outros componentes
export { calcularPrecoAnuncio, arredondarPreco };
