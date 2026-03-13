import { ProdutoSelecionado, Filamento } from '../../types';
import { DecimalInput } from '../ui/DecimalInput';
import { Cylinder, Package, Info } from 'lucide-react';

interface FilamentoConfigProps {
  precoFilamentoKg?: number;
  onPrecoFilamentoKgChange: (value: number) => void;
  pesoFilamentoG?: number;
  onPesoFilamentoGChange: (value: number) => void;
  filamentoId?: string;
  onFilamentoIdChange: (id: string | undefined) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  // Futura integracao: lista de filamentos do sistema
  filamentos?: Filamento[];
}

export function FilamentoConfig({
  precoFilamentoKg,
  onPrecoFilamentoKgChange,
  pesoFilamentoG,
  onPesoFilamentoGChange,
  filamentoId,
  onFilamentoIdChange,
  produtoSelecionado,
  filamentos = [],
}: FilamentoConfigProps) {
  // Obter peso do produto selecionado (variacao tem prioridade)
  const getPesoFromProduto = (): number | null => {
    if (!produtoSelecionado) return null;

    const peso = produtoSelecionado.variacao?.peso_filamento
      || produtoSelecionado.produto.peso_filamento;

    return peso || null;
  };

  const pesoProduto = getPesoFromProduto();
  const hasPesoProduto = pesoProduto !== null;

  const handleFilamentoChange = (id: string) => {
    if (id === '') {
      onFilamentoIdChange(undefined);
      return;
    }

    onFilamentoIdChange(id);

    // Auto-preencher preco se filamento selecionado
    const filamento = filamentos.find(f => f.id === id);
    if (filamento) {
      onPrecoFilamentoKgChange(filamento.preco_kg);
    }
  };

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Cylinder className="w-4 h-4" />
        Filamento
      </h4>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-5">
        {/* Seletor de Filamento (futuro) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar filamento (opcional)
          </label>
          <select
            value={filamentoId || ''}
            onChange={(e) => handleFilamentoChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
              text-sm"
          >
            <option value="">Digitar manualmente</option>
            {filamentos.map((filamento) => (
              <option key={filamento.id} value={filamento.id}>
                {filamento.nome} {filamento.cor ? `(${filamento.cor})` : ''} — R$ {filamento.preco_kg.toFixed(2)}/kg
              </option>
            ))}
          </select>
          {filamentos.length === 0 && (
            <p className="text-xs text-purple-600 mt-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Cadastre filamentos no painel "Filamentos" para selecionar aqui
            </p>
          )}
        </div>

        {/* Custo do Filamento por kg */}
        <div className="border-t border-purple-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custo do filamento (R$/kg)
          </label>
          <div className="relative max-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
              R$
            </span>
            <DecimalInput
              value={precoFilamentoKg}
              onChange={onPrecoFilamentoKgChange}
              placeholder="89.90"
              className="w-full pl-9 pr-14 py-2 border border-gray-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                    Peso carregado do produto
                  </span>
                </div>
              </div>

              {produtoSelecionado?.variacao && (
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
