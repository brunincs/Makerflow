import { useState, useEffect, useRef } from 'react';
import { DecimalInput } from '../ui/DecimalInput';
import { Receipt, Percent, Package, PlusCircle, Info, Loader2, Lightbulb, Plus, Minus } from 'lucide-react';
import { Embalagem, AcessorioConfigItem, EmbalagemConfigItem } from '../../types';
import { getEmbalagens } from '../../services/embalagensService';
import { AcessoriosConfig } from './AcessoriosConfig';
import { AcessorioConfig } from '../../types/acessorio';

interface DemaisCustosConfigProps {
  impostoAliquota?: number;
  onImpostoAliquotaChange: (value: number) => void;
  embalagensConfig?: EmbalagemConfigItem[];
  onEmbalagensChange: (config: EmbalagemConfigItem[], custoTotal: number) => void;
  acessoriosConfig?: AcessorioConfigItem[];
  onAcessoriosChange: (config: AcessorioConfigItem[], custoTotal: number) => void;
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
  embalagensConfig = [],
  onEmbalagensChange,
  acessoriosConfig = [],
  onAcessoriosChange,
  outrosCustos,
  onOutrosCustosChange,
}: DemaisCustosConfigProps) {
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmbalagens = async () => {
      setLoading(true);
      const data = await getEmbalagens();
      setEmbalagens(data);
      setLoading(false);
    };
    loadEmbalagens();
  }, []);

  const getQuantidade = (embalagemId: string): number => {
    const config = embalagensConfig.find(c => c.embalagem_id === embalagemId);
    return config?.quantidade || 0;
  };

  const handleQuantidadeChange = (embalagemId: string, delta: number) => {
    const embalagem = embalagens.find(e => e.id === embalagemId);
    const estoqueDisponivel = embalagem?.quantidade || 0;

    // Se não tem estoque, não permite adicionar
    if (estoqueDisponivel <= 0 && delta > 0) return;

    const atual = getQuantidade(embalagemId);
    // Limita ao estoque disponível
    const novaQuantidade = Math.min(Math.max(0, atual + delta), estoqueDisponivel);

    let newConfig: EmbalagemConfigItem[];

    if (novaQuantidade === 0) {
      // Remover do config
      newConfig = embalagensConfig.filter(c => c.embalagem_id !== embalagemId);
    } else {
      const existingIndex = embalagensConfig.findIndex(c => c.embalagem_id === embalagemId);
      if (existingIndex >= 0) {
        // Atualizar quantidade
        newConfig = [...embalagensConfig];
        newConfig[existingIndex] = { ...newConfig[existingIndex], quantidade: novaQuantidade };
      } else {
        // Adicionar novo
        newConfig = [...embalagensConfig, { embalagem_id: embalagemId, quantidade: novaQuantidade }];
      }
    }

    // Calcular custo total
    const custoTotal = newConfig.reduce((total, cfg) => {
      const embalagem = embalagens.find(e => e.id === cfg.embalagem_id);
      return total + (embalagem?.preco_unitario || 0) * cfg.quantidade;
    }, 0);

    onEmbalagensChange(newConfig, custoTotal);
  };

  const handleQuantidadeInputChange = (embalagemId: string, value: string) => {
    const embalagem = embalagens.find(e => e.id === embalagemId);
    const estoqueDisponivel = embalagem?.quantidade || 0;

    // Limita ao estoque disponível
    const novaQuantidade = Math.min(Math.max(0, parseInt(value) || 0), estoqueDisponivel);

    let newConfig: EmbalagemConfigItem[];

    if (novaQuantidade === 0) {
      newConfig = embalagensConfig.filter(c => c.embalagem_id !== embalagemId);
    } else {
      const existingIndex = embalagensConfig.findIndex(c => c.embalagem_id === embalagemId);
      if (existingIndex >= 0) {
        newConfig = [...embalagensConfig];
        newConfig[existingIndex] = { ...newConfig[existingIndex], quantidade: novaQuantidade };
      } else {
        newConfig = [...embalagensConfig, { embalagem_id: embalagemId, quantidade: novaQuantidade }];
      }
    }

    const custoTotal = newConfig.reduce((total, cfg) => {
      const embalagem = embalagens.find(e => e.id === cfg.embalagem_id);
      return total + (embalagem?.preco_unitario || 0) * cfg.quantidade;
    }, 0);

    onEmbalagensChange(newConfig, custoTotal);
  };

  // Calcular custo total atual
  const custoTotalEmbalagens = embalagensConfig.reduce((total, cfg) => {
    const emb = embalagens.find(e => e.id === cfg.embalagem_id);
    return total + (emb?.preco_unitario || 0) * cfg.quantidade;
  }, 0);

  const totalItensEmbalagens = embalagensConfig.reduce((sum, cfg) => sum + cfg.quantidade, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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

        {/* Embalagens usadas */}
        <div className="border-t border-orange-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Embalagens usadas
          </label>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando embalagens...
            </div>
          ) : embalagens.length === 0 ? (
            <div className="text-sm text-gray-500 py-2">
              <p>Nenhuma embalagem cadastrada.</p>
              <a href="/embalagens" className="text-orange-600 hover:underline">
                Cadastrar embalagens
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {embalagens.map((embalagem) => {
                const quantidade = getQuantidade(embalagem.id);
                const isSelected = quantidade > 0;
                const semEstoque = (embalagem.quantidade || 0) <= 0;
                const custoItem = embalagem.preco_unitario * quantidade;
                const atingiuLimite = quantidade >= (embalagem.quantidade || 0);

                return (
                  <div
                    key={embalagem.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                      semEstoque
                        ? 'border-gray-200 bg-gray-100 opacity-60'
                        : isSelected
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      semEstoque ? 'bg-gray-200' : isSelected ? 'bg-orange-100' : 'bg-gray-100'
                    }`}>
                      <Package className={`w-4 h-4 ${
                        semEstoque ? 'text-gray-400' : isSelected ? 'text-orange-600' : 'text-gray-400'
                      }`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium truncate ${semEstoque ? 'text-gray-400' : 'text-gray-900'}`}>
                          {embalagem.nome_embalagem}
                        </p>
                        {semEstoque && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            Sem estoque
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        R$ {formatCurrency(embalagem.preco_unitario)}/un · {embalagem.tipo} · Estoque: {embalagem.quantidade}
                      </p>
                    </div>

                    {/* Controle de quantidade */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuantidadeChange(embalagem.id, -1)}
                        disabled={quantidade === 0}
                        className={`p-1.5 rounded-lg transition-colors ${
                          quantidade === 0
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-orange-600 hover:bg-orange-100'
                        }`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <input
                        type="number"
                        min="0"
                        max={embalagem.quantidade || 0}
                        value={quantidade || ''}
                        onChange={(e) => handleQuantidadeInputChange(embalagem.id, e.target.value)}
                        placeholder="0"
                        disabled={semEstoque}
                        className={`w-12 text-center px-1 py-1 border border-gray-300 rounded-lg text-sm
                          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
                          ${semEstoque ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />

                      <button
                        type="button"
                        onClick={() => handleQuantidadeChange(embalagem.id, 1)}
                        disabled={semEstoque || atingiuLimite}
                        className={`p-1.5 rounded-lg transition-colors ${
                          semEstoque || atingiuLimite
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-orange-600 hover:bg-orange-100'
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Custo do item */}
                    {isSelected && (
                      <p className="text-sm font-semibold text-orange-700 flex-shrink-0 min-w-[80px] text-right">
                        R$ {formatCurrency(custoItem)}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Total das embalagens */}
              {totalItensEmbalagens > 0 && (
                <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-700">
                      Total embalagens ({totalItensEmbalagens} itens)
                    </span>
                    <span className="text-lg font-bold text-orange-800">
                      R$ {formatCurrency(custoTotalEmbalagens)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Acessorios */}
        <div className="border-t border-orange-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Acessorios (LEDs, parafusos, etc.)
          </label>
          <AcessoriosConfig
            acessoriosConfig={acessoriosConfig as AcessorioConfig[]}
            onAcessoriosChange={(config, custoTotal) => {
              onAcessoriosChange(config as AcessorioConfigItem[], custoTotal);
            }}
          />
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
