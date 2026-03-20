import { useState, useEffect } from 'react';
import { ProdutoSelecionado, Filamento } from '../../types';
import { getFilamentos } from '../../services/filamentosService';
import { DecimalInput } from '../ui/DecimalInput';
import { Cylinder, Package, Info, Loader2, Lock } from 'lucide-react';

interface FilamentoConfigProps {
  precoFilamentoKg?: number;
  onPrecoFilamentoKgChange: (value: number) => void;
  pesoFilamentoG?: number;
  onPesoFilamentoGChange: (value: number) => void;
  filamentoId?: string;
  onFilamentoChange: (id: string | undefined, preco: number | undefined) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  // Modo Kit
  modoKit?: boolean;
  kitTotais?: { peso: number; tempo: number };
}

export function FilamentoConfig({
  precoFilamentoKg,
  onPrecoFilamentoKgChange,
  pesoFilamentoG,
  onPesoFilamentoGChange,
  filamentoId,
  onFilamentoChange,
  produtoSelecionado,
  modoKit,
  kitTotais,
}: FilamentoConfigProps) {
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar filamentos
  useEffect(() => {
    const loadFilamentos = async () => {
      setLoading(true);
      try {
        const data = await getFilamentos();
        setFilamentos(data);
      } catch (error) {
        console.error('Erro ao carregar filamentos:', error);
      }
      setLoading(false);
    };
    loadFilamentos();
  }, []);

  // Obter peso do produto selecionado ou do kit (variacao tem prioridade)
  const getPesoFromProduto = (): number | null => {
    // Modo Kit: usar peso total do kit
    if (modoKit && kitTotais && kitTotais.peso > 0) {
      return kitTotais.peso;
    }

    if (!produtoSelecionado) return null;

    const peso = produtoSelecionado.variacao?.peso_filamento
      || produtoSelecionado.produto.peso_filamento;

    return peso || null;
  };

  const pesoProduto = getPesoFromProduto();
  const hasPesoProduto = pesoProduto !== null;

  // Verificar se é modo manual (valor vazio = manual)
  const isModoManual = !filamentoId || filamentoId === '';

  // Encontrar filamento selecionado
  const filamentoSelecionado = filamentoId && filamentoId !== ''
    ? filamentos.find(f => f.id === filamentoId)
    : null;


  const handleFilamentoChange = (value: string) => {
    if (value === '') {
      // Modo manual - limpa o filamentoId
      onFilamentoChange(undefined, undefined);
      return;
    }

    // Selecionou um filamento - atualiza id E preço juntos
    const filamento = filamentos.find(f => f.id === value);
    if (filamento) {
      onFilamentoChange(value, filamento.preco_por_kg);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Cylinder className="w-4 h-4" />
        Filamento
      </h4>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-5">
        {/* Seletor de Filamento */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar filamento
          </label>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando filamentos...
            </div>
          ) : (
            <select
              value={filamentoId || ''}
              onChange={(e) => handleFilamentoChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                text-sm"
            >
              <option value="">Digitar valor manualmente</option>
              {filamentos.map((filamento) => (
                <option key={filamento.id} value={filamento.id}>
                  {filamento.marca} • {filamento.nome_filamento} • R${formatCurrency(filamento.preco_por_kg)}/kg
                </option>
              ))}
            </select>
          )}

          {filamentos.length === 0 && !loading && (
            <p className="text-xs text-purple-600 mt-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Cadastre filamentos no menu "Filamentos" para selecionar aqui
            </p>
          )}
        </div>

        {/* Mostrar info do filamento selecionado */}
        {filamentoSelecionado && (
          <div className="bg-white border border-purple-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium">{filamentoSelecionado.marca}</p>
                <p className="text-sm font-semibold text-gray-900">{filamentoSelecionado.nome_filamento}</p>
                <p className="text-xs text-gray-500">
                  {filamentoSelecionado.material} {filamentoSelecionado.cor && `• ${filamentoSelecionado.cor}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-purple-700">
                  R$ {filamentoSelecionado.preco_por_kg.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">/kg</p>
              </div>
            </div>
          </div>
        )}

        {/* Valor do kg - sempre visível, editável apenas no modo manual */}
        <div className="border-t border-purple-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            Valor do kg (R$)
            {!isModoManual && (
              <span className="flex items-center gap-1 text-xs text-purple-600 font-normal">
                <Lock className="w-3 h-3" />
                Valor do filamento selecionado
              </span>
            )}
          </label>
          <div className="relative max-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              R$
            </span>
            <DecimalInput
              value={precoFilamentoKg}
              onChange={onPrecoFilamentoKgChange}
              placeholder="89.90"
              disabled={!isModoManual}
              className={`w-full pl-9 pr-14 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                ${!isModoManual ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-white'}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              /kg
            </span>
          </div>
        </div>

        {/* Peso do Filamento */}
        <div className="border-t border-purple-200 pt-4">
          {hasPesoProduto ? (
            // Produto selecionado - mostrar peso do produto
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Peso usado na peca</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-white border border-purple-200 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">
                    {pesoProduto}g
                  </p>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 rounded-full">
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-700">
                    {modoKit ? 'Peso total do kit' : 'Peso carregado do produto'}
                  </span>
                </div>
              </div>

              {!modoKit && produtoSelecionado?.variacao && (
                <p className="text-xs text-purple-600 mt-2">
                  Variacao: {produtoSelecionado.variacao.nome_variacao}
                </p>
              )}
            </div>
          ) : (
            // Sem produto - mostrar campo manual
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso usado na peca (g)
              </label>
              <div className="relative max-w-[150px]">
                <DecimalInput
                  value={pesoFilamentoG}
                  onChange={onPesoFilamentoGChange}
                  placeholder="25"
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                  g
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
