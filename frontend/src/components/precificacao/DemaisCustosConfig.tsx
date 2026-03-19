import { useState, useEffect, useRef } from 'react';
import { DecimalInput } from '../ui/DecimalInput';
import { Receipt, Percent, Package, PlusCircle, Info, Loader2, Check, Lightbulb } from 'lucide-react';
import { Embalagem, AcessorioConfigItem } from '../../types';
import { getEmbalagens } from '../../services/embalagensService';
import { AcessoriosConfig } from './AcessoriosConfig';
import { AcessorioConfig } from '../../types/acessorio';

interface DemaisCustosConfigProps {
  impostoAliquota?: number;
  onImpostoAliquotaChange: (value: number) => void;
  embalagensIds?: string[];
  onEmbalagensChange: (ids: string[], custoTotal: number) => void;
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
  embalagensIds = [],
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

  const handleEmbalagemToggle = (id: string) => {
    const isSelected = embalagensIds.includes(id);
    let newIds: string[];

    if (isSelected) {
      newIds = embalagensIds.filter(eid => eid !== id);
    } else {
      newIds = [...embalagensIds, id];
    }

    // Calcular custo total das embalagens selecionadas
    const custoTotal = newIds.reduce((total, eid) => {
      const emb = embalagens.find(e => e.id === eid);
      return total + (emb?.preco_unitario || 0);
    }, 0);

    onEmbalagensChange(newIds, custoTotal);
  };

  // Calcular custo total atual
  const custoTotalEmbalagens = embalagensIds.reduce((total, id) => {
    const emb = embalagens.find(e => e.id === id);
    return total + (emb?.preco_unitario || 0);
  }, 0);

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
                const isSelected = embalagensIds.includes(embalagem.id);
                const semEstoque = (embalagem.quantidade || 0) <= 0;
                return (
                  <button
                    key={embalagem.id}
                    type="button"
                    onClick={() => !semEstoque && handleEmbalagemToggle(embalagem.id)}
                    disabled={semEstoque}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      semEstoque
                        ? 'border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed'
                        : isSelected
                        ? 'border-orange-500 bg-orange-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      semEstoque
                        ? 'border-gray-300 bg-gray-200'
                        : isSelected
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-300 bg-white'
                    }`}>
                      {isSelected && !semEstoque && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${semEstoque ? 'text-gray-400' : 'text-gray-900'}`}>
                        {embalagem.nome_embalagem}
                      </p>
                      <p className="text-xs text-gray-500">
                        {embalagem.tipo}
                        {semEstoque && <span className="ml-2 text-red-500 font-medium">Sem estoque</span>}
                        {!semEstoque && <span className="ml-2 text-green-600">({embalagem.quantidade} un)</span>}
                      </p>
                    </div>

                    <p className={`text-sm font-semibold flex-shrink-0 ${semEstoque ? 'text-gray-400' : 'text-orange-700'}`}>
                      R$ {formatCurrency(embalagem.preco_unitario)}
                    </p>
                  </button>
                );
              })}

              {/* Total das embalagens */}
              {embalagensIds.length > 0 && (
                <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-orange-700">
                      Total embalagens ({embalagensIds.length})
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
