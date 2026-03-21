import { DollarSign, Percent } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Toggle } from '../ui/Toggle';
import { PromocaoConfig, ArredondamentoPromocao } from '../../types';

interface PrecoMargemConfigProps {
  precoVenda?: number;
  onPrecoVendaChange: (value: number) => void;
  promocao?: PromocaoConfig;
  onPromocaoChange?: (promocao: PromocaoConfig) => void;
  custoTotal?: number;
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  custoTotal: _custoTotal,
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

  // Gerar sugestões de desconto simplificadas
  const sugestoesDesconto = useMemo(() => {
    if (!promocaoAtiva || !precoVenda || precoVenda <= 0) {
      return null;
    }

    const configs = [
      { desconto: 30, label: 'Equilibrado', cor: 'green' },
      { desconto: 40, label: 'Agressivo', cor: 'yellow' },
      { desconto: 50, label: 'Explosivo', cor: 'red' },
    ];

    return configs.map(cfg => ({
      desconto: cfg.desconto,
      label: cfg.label,
      cor: cfg.cor,
      precoAnuncio: arredondarPreco(calcularPrecoAnuncio(precoVenda, cfg.desconto), arredondamento),
      isAtual: cfg.desconto === descontoPercent,
    }));
  }, [promocaoAtiva, precoVenda, arredondamento, descontoPercent]);

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
          {promocaoAtiva ? 'Preco Real' : 'Preco de Venda'}
        </h4>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <PrecoInput
            value={precoVenda}
            onChange={onPrecoVendaChange}
            placeholder="39.90"
          />
        </div>
      </div>

      {/* Promocao */}
      {onPromocaoChange && (
        <div className={`border rounded-xl p-4 transition-colors ${
          promocaoAtiva
            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}>
          <Toggle
            checked={promocaoAtiva}
            onChange={handlePromocaoToggle}
            label="Promocao"
          />

          {promocaoAtiva && (
            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700 space-y-4">
              {/* Desconto e Arredondamento em linha */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-gray-500" />
                  <div className="relative w-20">
                    <input
                      type="number"
                      min="1"
                      max="90"
                      step="1"
                      value={descontoPercent}
                      onChange={(e) => handleDescontoChange(e.target.value)}
                      className="w-full px-3 py-2 pr-7 border border-gray-300 dark:border-gray-600 rounded-lg
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-semibold
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                      %
                    </span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleArredondamentoChange('90')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      arredondamento === '90'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    ,90
                  </button>
                  <button
                    type="button"
                    onClick={() => handleArredondamentoChange('99')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      arredondamento === '99'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    ,99
                  </button>
                </div>
              </div>

              {/* Sugestões Compactas */}
              {sugestoesDesconto && sugestoesDesconto.length > 0 && (
                <div className="flex gap-2">
                  {sugestoesDesconto.map((sugestao) => {
                    const cores = {
                      green: {
                        bg: sugestao.isAtual ? 'bg-green-500' : 'bg-green-100 dark:bg-green-900/30',
                        text: sugestao.isAtual ? 'text-white' : 'text-green-700 dark:text-green-400',
                        border: sugestao.isAtual ? 'border-green-500' : 'border-green-200 dark:border-green-700',
                      },
                      yellow: {
                        bg: sugestao.isAtual ? 'bg-yellow-500' : 'bg-yellow-100 dark:bg-yellow-900/30',
                        text: sugestao.isAtual ? 'text-white' : 'text-yellow-700 dark:text-yellow-400',
                        border: sugestao.isAtual ? 'border-yellow-500' : 'border-yellow-200 dark:border-yellow-700',
                      },
                      red: {
                        bg: sugestao.isAtual ? 'bg-red-500' : 'bg-red-100 dark:bg-red-900/30',
                        text: sugestao.isAtual ? 'text-white' : 'text-red-700 dark:text-red-400',
                        border: sugestao.isAtual ? 'border-red-500' : 'border-red-200 dark:border-red-700',
                      },
                    };
                    const cor = cores[sugestao.cor as keyof typeof cores];

                    return (
                      <button
                        key={sugestao.desconto}
                        type="button"
                        onClick={() => handleDescontoChange(String(sugestao.desconto))}
                        className={`flex-1 p-3 rounded-xl border-2 transition-all text-center ${cor.bg} ${cor.border} ${
                          sugestao.isAtual ? 'ring-2 ring-offset-1 ring-purple-400' : 'hover:scale-[1.02]'
                        }`}
                      >
                        <p className={`text-lg font-bold ${cor.text}`}>
                          {sugestao.desconto}%
                        </p>
                        <p className={`text-xs font-medium ${cor.text} opacity-80`}>
                          R$ {sugestao.precoAnuncio.toFixed(2)}
                        </p>
                        <p className={`text-[10px] mt-1 ${cor.text} opacity-70`}>
                          {sugestao.label}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Resultado Final - Destaque */}
              {precosPromocao && (
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs opacity-80">Anunciar por</p>
                      <p className="text-2xl font-bold">R$ {precosPromocao.precoAnuncio.toFixed(2)}</p>
                    </div>
                    <div className="px-3 py-1.5 bg-white/20 rounded-full">
                      <span className="text-sm font-bold">-{precosPromocao.descontoReal}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-white/20">
                    <span className="text-sm opacity-80">Cliente paga</span>
                    <span className="text-xl font-bold">R$ {precosPromocao.precoFinal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Exportar funcoes utilitarias para uso em outros componentes
export { calcularPrecoAnuncio, arredondarPreco };
