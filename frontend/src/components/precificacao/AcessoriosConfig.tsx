import { useState, useEffect } from 'react';
import { Lightbulb, Loader2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Acessorio, AcessorioConfig } from '../../types/acessorio';
import { getAcessorios } from '../../services/acessoriosService';

interface AcessoriosConfigProps {
  acessoriosConfig?: AcessorioConfig[];
  onAcessoriosChange: (config: AcessorioConfig[], custoTotal: number) => void;
}

export function AcessoriosConfig({
  acessoriosConfig = [],
  onAcessoriosChange,
}: AcessoriosConfigProps) {
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAcessorios = async () => {
      setLoading(true);
      const data = await getAcessorios(true);
      setAcessorios(data);
      setLoading(false);
    };
    loadAcessorios();
  }, []);

  const getQuantidade = (acessorioId: string): number => {
    const config = acessoriosConfig.find(c => c.acessorio_id === acessorioId);
    return config?.quantidade || 0;
  };

  const handleQuantidadeChange = (acessorioId: string, delta: number) => {
    const atual = getQuantidade(acessorioId);
    const novaQuantidade = Math.max(0, atual + delta);

    let newConfig: AcessorioConfig[];

    if (novaQuantidade === 0) {
      // Remover do config
      newConfig = acessoriosConfig.filter(c => c.acessorio_id !== acessorioId);
    } else {
      const existingIndex = acessoriosConfig.findIndex(c => c.acessorio_id === acessorioId);
      if (existingIndex >= 0) {
        // Atualizar quantidade
        newConfig = [...acessoriosConfig];
        newConfig[existingIndex] = { ...newConfig[existingIndex], quantidade: novaQuantidade };
      } else {
        // Adicionar novo
        newConfig = [...acessoriosConfig, { acessorio_id: acessorioId, quantidade: novaQuantidade }];
      }
    }

    // Calcular custo total
    const custoTotal = newConfig.reduce((total, cfg) => {
      const acessorio = acessorios.find(a => a.id === cfg.acessorio_id);
      return total + (acessorio?.custo_unitario || 0) * cfg.quantidade;
    }, 0);

    onAcessoriosChange(newConfig, custoTotal);
  };

  const handleQuantidadeInputChange = (acessorioId: string, value: string) => {
    const novaQuantidade = Math.max(0, parseInt(value) || 0);

    let newConfig: AcessorioConfig[];

    if (novaQuantidade === 0) {
      newConfig = acessoriosConfig.filter(c => c.acessorio_id !== acessorioId);
    } else {
      const existingIndex = acessoriosConfig.findIndex(c => c.acessorio_id === acessorioId);
      if (existingIndex >= 0) {
        newConfig = [...acessoriosConfig];
        newConfig[existingIndex] = { ...newConfig[existingIndex], quantidade: novaQuantidade };
      } else {
        newConfig = [...acessoriosConfig, { acessorio_id: acessorioId, quantidade: novaQuantidade }];
      }
    }

    const custoTotal = newConfig.reduce((total, cfg) => {
      const acessorio = acessorios.find(a => a.id === cfg.acessorio_id);
      return total + (acessorio?.custo_unitario || 0) * cfg.quantidade;
    }, 0);

    onAcessoriosChange(newConfig, custoTotal);
  };

  // Calcular custo total atual
  const custoTotalAcessorios = acessoriosConfig.reduce((total, cfg) => {
    const acessorio = acessorios.find(a => a.id === cfg.acessorio_id);
    return total + (acessorio?.custo_unitario || 0) * cfg.quantidade;
  }, 0);

  const totalItens = acessoriosConfig.reduce((sum, cfg) => sum + cfg.quantidade, 0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isEstoqueBaixo = (acessorio: Acessorio) => {
    return acessorio.estoque_atual <= acessorio.estoque_minimo;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando acessorios...
      </div>
    );
  }

  if (acessorios.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-2">
        <p>Nenhum acessorio cadastrado.</p>
        <a href="/embalagens" className="text-orange-600 hover:underline">
          Cadastrar acessorios
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {acessorios.map((acessorio) => {
        const quantidade = getQuantidade(acessorio.id);
        const isSelected = quantidade > 0;
        const baixoEstoque = isEstoqueBaixo(acessorio);
        const custoItem = acessorio.custo_unitario * quantidade;

        return (
          <div
            key={acessorio.id}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
              isSelected
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              isSelected ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              <Lightbulb className={`w-4 h-4 ${
                isSelected ? 'text-purple-600' : 'text-gray-400'
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {acessorio.nome}
                </p>
                {baixoEstoque && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    Baixo
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                R$ {formatCurrency(acessorio.custo_unitario)}/{acessorio.unidade} · Estoque: {acessorio.estoque_atual}
              </p>
            </div>

            {/* Controle de quantidade */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleQuantidadeChange(acessorio.id, -1)}
                disabled={quantidade === 0}
                className={`p-1.5 rounded-lg transition-colors ${
                  quantidade === 0
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-purple-600 hover:bg-purple-100'
                }`}
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="0"
                value={quantidade || ''}
                onChange={(e) => handleQuantidadeInputChange(acessorio.id, e.target.value)}
                placeholder="0"
                className="w-12 text-center px-1 py-1 border border-gray-300 rounded-lg text-sm
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />

              <button
                type="button"
                onClick={() => handleQuantidadeChange(acessorio.id, 1)}
                className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Custo do item */}
            {isSelected && (
              <p className="text-sm font-semibold text-purple-700 flex-shrink-0 min-w-[80px] text-right">
                R$ {formatCurrency(custoItem)}
              </p>
            )}
          </div>
        );
      })}

      {/* Total dos acessorios */}
      {totalItens > 0 && (
        <div className="mt-3 p-3 bg-purple-100 border border-purple-300 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-purple-700">
              Total acessorios ({totalItens} itens)
            </span>
            <span className="text-lg font-bold text-purple-800">
              R$ {formatCurrency(custoTotalAcessorios)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
