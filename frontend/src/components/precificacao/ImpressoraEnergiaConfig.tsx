import { ProdutoSelecionado, ImpressoraModelo } from '../../types';
import { Toggle } from '../ui/Toggle';
import { DecimalInput } from '../ui/DecimalInput';
import { Clock, Zap, Package, Printer, Layers, Info } from 'lucide-react';

interface ImpressoraEnergiaConfigProps {
  tempoHoras: number;
  tempoMinutos: number;
  onTempoHorasChange: (value: number) => void;
  onTempoMinutosChange: (value: number) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  impressoraModelo?: ImpressoraModelo;
  onImpressoraChange: (modelo: ImpressoraModelo | undefined, consumo: number) => void;
  consumoKwh?: number;
  onConsumoKwhChange: (value: number) => void;
  valorKwh?: number;
  onValorKwhChange: (value: number) => void;
  multiplasPecas?: boolean;
  onMultiplasPecasChange: (value: boolean) => void;
  quantidadePecas?: number;
  onQuantidadePecasChange: (value: number) => void;
}

// Modelos de impressoras com consumo energetico
const IMPRESSORAS = [
  { id: 'a1_mini' as ImpressoraModelo, nome: 'A1 Mini', consumo: 0.08 },
  { id: 'a1' as ImpressoraModelo, nome: 'A1', consumo: 0.10 },
  { id: 'p1p' as ImpressoraModelo, nome: 'P1P', consumo: 0.10 },
  { id: 'p1s' as ImpressoraModelo, nome: 'P1S', consumo: 0.10 },
  { id: 'x1_carbon' as ImpressoraModelo, nome: 'X1 Carbon', consumo: 0.11 },
  { id: 'h2d' as ImpressoraModelo, nome: 'H2D', consumo: 0.20 },
  { id: 'outra' as ImpressoraModelo, nome: 'Outra impressora (digitar kWh)', consumo: 0 },
];

// Converte tempo decimal (ex: 1.4166) para horas e minutos
function tempoDecimalParaHorasMinutos(decimal: number): { horas: number; minutos: number } {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  return { horas, minutos };
}

// Formata tempo para exibicao
function formatarTempo(horas: number, minutos: number): string {
  if (horas === 0 && minutos === 0) return '-';
  if (horas === 0) return `${minutos}min`;
  if (minutos === 0) return `${horas}h`;
  return `${horas}h ${minutos}min`;
}

export function ImpressoraEnergiaConfig({
  tempoHoras,
  tempoMinutos,
  onTempoHorasChange,
  onTempoMinutosChange,
  produtoSelecionado,
  impressoraModelo,
  onImpressoraChange,
  consumoKwh,
  onConsumoKwhChange,
  valorKwh,
  onValorKwhChange,
  multiplasPecas,
  onMultiplasPecasChange,
  quantidadePecas,
  onQuantidadePecasChange,
}: ImpressoraEnergiaConfigProps) {
  // Handler para mudança de impressora (atualiza modelo e consumo juntos)
  const handleSelectChange = (value: string) => {
    if (value) {
      const modelo = value as ImpressoraModelo;
      const imp = IMPRESSORAS.find(i => i.id === modelo);
      // Atualizar modelo e consumo de uma vez só
      const novoConsumo = (imp && modelo !== 'outra') ? imp.consumo : (consumoKwh || 0);
      onImpressoraChange(modelo, novoConsumo);
    }
  };

  // Obter tempo do produto selecionado (variacao tem prioridade)
  const getTempoFromProduto = (): { horas: number; minutos: number } | null => {
    if (!produtoSelecionado) return null;

    const tempoDecimal = produtoSelecionado.variacao?.tempo_impressao
      || produtoSelecionado.produto.tempo_impressao;

    if (!tempoDecimal) return null;

    return tempoDecimalParaHorasMinutos(tempoDecimal);
  };

  const tempoProduto = getTempoFromProduto();
  const hasTempoProduto = tempoProduto !== null;

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Impressora & Energia
      </h4>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-5">
        {/* Modelo da Impressora */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <Printer className="w-4 h-4" />
            Modelo da impressora
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={impressoraModelo || ''}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                min-w-[220px]"
            >
              <option value="">Selecione...</option>
              <option value="a1_mini">A1 Mini — 0.08 kWh/h</option>
              <option value="a1">A1 — 0.10 kWh/h</option>
              <option value="p1p">P1P — 0.10 kWh/h</option>
              <option value="p1s">P1S — 0.10 kWh/h</option>
              <option value="x1_carbon">X1 Carbon — 0.11 kWh/h</option>
              <option value="h2d">H2D — 0.20 kWh/h</option>
              <option value="outra">Outra impressora (digitar kWh)</option>
            </select>

            {/* Consumo manual (se "Outra impressora") */}
            {impressoraModelo === 'outra' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Consumo:</span>
                <DecimalInput
                  value={consumoKwh}
                  onChange={onConsumoKwhChange}
                  placeholder="0.10"
                  className="w-20 px-2 py-2 border border-gray-300 rounded-lg bg-white text-center text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-500">kWh/h</span>
              </div>
            )}
          </div>
        </div>

        {/* Tempo de Impressao */}
        <div className="border-t border-blue-200 pt-4">
          {hasTempoProduto ? (
            // Produto selecionado - mostrar tempo do produto
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Tempo de impressao</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 p-3 bg-white border border-blue-200 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">
                    {formatarTempo(tempoProduto.horas, tempoProduto.minutos)}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 rounded-full">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">
                    Tempo carregado do produto
                  </span>
                </div>
              </div>

              {produtoSelecionado?.variacao && (
                <p className="text-xs text-blue-600 mt-2">
                  Variacao: {produtoSelecionado.variacao.nome_variacao}
                </p>
              )}
            </div>
          ) : (
            // Sem produto - mostrar campos manuais
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Tempo de impressao</span>
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-xs">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Horas
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={tempoHoras || ''}
                      onChange={(e) => onTempoHorasChange(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      h
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Minutos
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={tempoMinutos || ''}
                      onChange={(e) => onTempoMinutosChange(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      min
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Multiplas Pecas */}
        <div className="border-t border-blue-200 pt-4">
          <Toggle
            checked={multiplasPecas || false}
            onChange={onMultiplasPecasChange}
            label="Multiplas pecas na mesa"
            description="Dividir o custo de energia entre as pecas"
          />

          {multiplasPecas && (
            <div className="mt-3 ml-14">
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                Quantidade de pecas
              </label>
              <div className="relative max-w-[120px]">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={quantidadePecas || ''}
                  onChange={(e) => onQuantidadePecasChange(parseInt(e.target.value) || 1)}
                  placeholder="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Valor do kWh */}
        <div className="border-t border-blue-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor do kWh (R$)
          </label>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              R$
            </span>
            <DecimalInput
              value={valorKwh}
              onChange={onValorKwhChange}
              placeholder="0.85"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-start gap-1.5 mt-2">
            <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              Media nacional ≈ R$0,85 · verifique sua conta
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
