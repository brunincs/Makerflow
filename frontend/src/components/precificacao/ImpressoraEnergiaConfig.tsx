import { useState, useEffect } from 'react';
import { ProdutoSelecionado, Impressora } from '../../types';
import { DecimalInput } from '../ui/DecimalInput';
import { Clock, Zap, Package, Printer, Layers, Info, AlertCircle, Settings } from 'lucide-react';
import { getImpressorasAtivas } from '../../services/impressorasService';
import { useAuth } from '../../contexts/AuthContext';

interface ImpressoraEnergiaConfigProps {
  tempoHoras: number;
  tempoMinutos: number;
  onTempoHorasChange: (value: number) => void;
  onTempoMinutosChange: (value: number) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  impressoraId?: string;
  onImpressoraChange: (id: string | undefined, consumo: number) => void;
  consumoKwh?: number;
  valorKwh?: number;
  onValorKwhChange: (value: number) => void;
  quantidadePecas?: number;
  onQuantidadePecasChange: (value: number) => void;
}

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
  impressoraId,
  onImpressoraChange,
  consumoKwh,
  valorKwh,
  onValorKwhChange,
  quantidadePecas,
  onQuantidadePecasChange,
}: ImpressoraEnergiaConfigProps) {
  const { profile } = useAuth();
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [loading, setLoading] = useState(true);
  const [valorKwhDoPerfil, setValorKwhDoPerfil] = useState<number | null>(null);

  // Carregar impressoras do usuário
  useEffect(() => {
    const carregarImpressoras = async () => {
      setLoading(true);
      const data = await getImpressorasAtivas();
      setImpressoras(data);
      setLoading(false);
    };
    carregarImpressoras();
  }, []);

  // Carregar valor_kwh do perfil
  useEffect(() => {
    if (profile?.valor_kwh && !valorKwh) {
      setValorKwhDoPerfil(profile.valor_kwh);
      onValorKwhChange(profile.valor_kwh);
    }
  }, [profile]);

  // Handler para mudança de impressora (atualiza id e consumo juntos)
  const handleSelectChange = (value: string) => {
    if (value) {
      const imp = impressoras.find(i => i.id === value);
      const novoConsumo = imp?.consumo_kwh || 0;
      onImpressoraChange(value, novoConsumo);
    } else {
      onImpressoraChange(undefined, 0);
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
        {/* Impressora */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <Printer className="w-4 h-4" />
            Impressora
          </label>

          {loading ? (
            <div className="text-sm text-gray-500">Carregando impressoras...</div>
          ) : impressoras.length === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700">
                Nenhuma impressora cadastrada. Cadastre suas impressoras no <a href="/perfil" className="underline font-medium">Perfil</a>.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={impressoraId || ''}
                onChange={(e) => handleSelectChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  min-w-[280px]"
              >
                <option value="">Selecione...</option>
                {impressoras.map((imp) => (
                  <option key={imp.id} value={imp.id}>
                    {imp.apelido || imp.modelo} {imp.marca ? `(${imp.marca})` : ''} — {imp.consumo_kwh} kWh/h
                  </option>
                ))}
              </select>

              {/* Mostrar consumo da impressora selecionada */}
              {impressoraId && consumoKwh !== undefined && consumoKwh > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 rounded-full">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">
                    Consumo: {consumoKwh} kWh/h
                  </span>
                </div>
              )}
            </div>
          )}
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

        {/* Quantidade de Pecas / Multiplas Pecas */}
        <div className="border-t border-blue-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Quantidade de pecas</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative max-w-[140px]">
              <input
                type="number"
                min="1"
                max="999"
                value={quantidadePecas || 1}
                onChange={(e) => onQuantidadePecasChange(parseInt(e.target.value) || 1)}
                placeholder="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-center text-lg font-semibold
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                un
              </span>
            </div>

            <div className="flex gap-1">
              {[1, 2, 5, 10].map((qtd) => (
                <button
                  key={qtd}
                  type="button"
                  onClick={() => onQuantidadePecasChange(qtd)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    quantidadePecas === qtd
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}
                >
                  {qtd}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Valor do kWh */}
        <div className="border-t border-blue-200 pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Valor do kWh (R$)
            </label>
            {valorKwhDoPerfil && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                <Settings className="w-3 h-3" />
                Do perfil
              </span>
            )}
          </div>
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
              {valorKwhDoPerfil
                ? 'Valor configurado no seu perfil. Pode alterar aqui se necessario.'
                : 'Media nacional ≈ R$0,85 · Configure no seu perfil'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
