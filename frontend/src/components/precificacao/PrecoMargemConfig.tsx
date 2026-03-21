import { DollarSign, Info, Tag, Percent, Sparkles, Check, AlertTriangle, Target } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Toggle } from '../ui/Toggle';
import { PromocaoConfig, ArredondamentoPromocao } from '../../types';

interface PrecoMargemConfigProps {
  precoVenda?: number;
  onPrecoVendaChange: (value: number) => void;
  promocao?: PromocaoConfig;
  onPromocaoChange?: (promocao: PromocaoConfig) => void;
  // Para calcular sugestões de desconto
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
  custoTotal,
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

  // Gerar sugestões de desconto baseadas na margem
  const sugestoesDesconto = useMemo(() => {
    if (!promocaoAtiva || !custoTotal || custoTotal <= 0) {
      return null;
    }

    const descontos = [20, 30, 40, 50];
    const sugestoes = [];

    for (const desconto of descontos) {
      // Calcular o lucro com o preço atual
      const lucroAtual = precoVenda ? precoVenda - custoTotal : 0;
      const margemAtual = precoVenda && precoVenda > 0 ? (lucroAtual / precoVenda) * 100 : 0;

      // Classificação baseada na margem atual
      let classificacao: 'excelente' | 'equilibrado' | 'agressivo' | 'risco';
      let icon: string;
      let label: string;
      let corFundo: string;
      let corTexto: string;

      if (margemAtual >= 40) {
        classificacao = 'excelente';
        icon = '🟢';
        label = 'Excelente';
        corFundo = 'bg-emerald-50 dark:bg-emerald-900/20';
        corTexto = 'text-emerald-700 dark:text-emerald-400';
      } else if (margemAtual >= 30) {
        classificacao = 'equilibrado';
        icon = '🟢';
        label = 'Equilibrado';
        corFundo = 'bg-green-50 dark:bg-green-900/20';
        corTexto = 'text-green-700 dark:text-green-400';
      } else if (margemAtual >= 20) {
        classificacao = 'agressivo';
        icon = '🟡';
        label = 'Agressivo';
        corFundo = 'bg-yellow-50 dark:bg-yellow-900/20';
        corTexto = 'text-yellow-700 dark:text-yellow-400';
      } else if (margemAtual > 0) {
        classificacao = 'risco';
        icon = '🔴';
        label = 'Risco';
        corFundo = 'bg-red-50 dark:bg-red-900/20';
        corTexto = 'text-red-700 dark:text-red-400';
      } else {
        // Lucro zero ou negativo - não sugerir
        continue;
      }

      // Só adicionar se o lucro for positivo
      if (lucroAtual > 0) {
        sugestoes.push({
          desconto,
          precoAnuncio: precoVenda ? arredondarPreco(calcularPrecoAnuncio(precoVenda, desconto), arredondamento) : 0,
          lucro: lucroAtual,
          margem: margemAtual,
          classificacao,
          icon,
          label,
          corFundo,
          corTexto,
          isAtual: desconto === descontoPercent,
          isIdeal: desconto === 50 && margemAtual >= 30, // 50% é mais atrativo para o cliente
        });
      }
    }

    // Determinar qual é a sugestão ideal (maior desconto com boa margem)
    const sugestaoIdeal = sugestoes.find(s => s.margem >= 30 && s.desconto >= 40)
      || sugestoes.find(s => s.margem >= 20 && s.desconto >= 30)
      || sugestoes[0];

    if (sugestaoIdeal) {
      sugestaoIdeal.isIdeal = true;
    }

    return sugestoes;
  }, [promocaoAtiva, custoTotal, precoVenda, arredondamento, descontoPercent]);

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

                {/* Sugestões de Desconto */}
                {sugestoesDesconto && sugestoesDesconto.length > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700 rounded-xl p-4 mt-4">
                    <h5 className="text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Sugestoes de Desconto
                    </h5>

                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Clique para aplicar um desconto. Seu lucro permanece o mesmo.
                    </p>

                    <div className="space-y-2">
                      {sugestoesDesconto.map((sugestao) => (
                        <button
                          key={sugestao.desconto}
                          type="button"
                          onClick={() => handleDescontoChange(String(sugestao.desconto))}
                          className={`w-full p-3 rounded-lg border transition-all text-left ${
                            sugestao.isAtual
                              ? 'border-purple-400 dark:border-purple-500 bg-purple-100 dark:bg-purple-900/40 ring-2 ring-purple-400 ring-offset-1'
                              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {/* Badge de Desconto */}
                              <div className={`px-2.5 py-1 rounded-full text-sm font-bold ${
                                sugestao.desconto >= 50
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  : sugestao.desconto >= 40
                                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              }`}>
                                {sugestao.desconto}% OFF
                              </div>

                              {/* Preço de Anúncio */}
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  Anunciar: R$ {sugestao.precoAnuncio.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Recebe: R$ {precoVenda?.toFixed(2)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Classificação */}
                              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${sugestao.corFundo}`}>
                                <span>{sugestao.icon}</span>
                                <span className={`text-xs font-medium ${sugestao.corTexto}`}>
                                  {sugestao.label}
                                </span>
                              </div>

                              {/* Badges especiais */}
                              {sugestao.isIdeal && !sugestao.isAtual && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full">
                                  <Target className="w-3 h-3" />
                                  <span className="text-xs font-medium">Ideal</span>
                                </div>
                              )}

                              {sugestao.isAtual && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded-full">
                                  <Check className="w-3 h-3" />
                                  <span className="text-xs font-medium">Atual</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Info de Lucro */}
                          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Lucro: R$ {sugestao.lucro.toFixed(2)}
                            </span>
                            <span className={`text-xs font-medium ${sugestao.corTexto}`}>
                              Margem: {sugestao.margem.toFixed(1)}%
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Aviso de margem */}
                    {sugestoesDesconto[0] && sugestoesDesconto[0].margem < 20 && (
                      <div className="flex items-start gap-2 mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Margem baixa. Considere aumentar o preco de venda para ter uma operacao mais segura.
                        </p>
                      </div>
                    )}
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
