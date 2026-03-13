import { Clock } from 'lucide-react';

interface TempoImpressaoInputProps {
  horas: number;
  minutos: number;
  onHorasChange: (horas: number) => void;
  onMinutosChange: (minutos: number) => void;
}

export function TempoImpressaoInput({
  horas,
  minutos,
  onHorasChange,
  onMinutosChange,
}: TempoImpressaoInputProps) {
  const handleHorasChange = (value: string) => {
    const num = parseInt(value) || 0;
    onHorasChange(Math.max(0, num));
  };

  const handleMinutosChange = (value: string) => {
    const num = parseInt(value) || 0;
    onMinutosChange(Math.min(59, Math.max(0, num)));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Tempo de Impressao
      </label>
      <div className="flex gap-3">
        <div className="flex-1">
          <div className="relative">
            <input
              type="number"
              min="0"
              value={horas || ''}
              onChange={(e) => handleHorasChange(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              horas
            </span>
          </div>
        </div>
        <div className="flex-1">
          <div className="relative">
            <input
              type="number"
              min="0"
              max="59"
              value={minutos || ''}
              onChange={(e) => handleMinutosChange(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              min
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utilitarios para conversao
export function tempoDecimalParaHorasMinutos(decimal: number): { horas: number; minutos: number } {
  const horas = Math.floor(decimal);
  const minutos = Math.round((decimal - horas) * 60);
  return { horas, minutos };
}

export function horasMinutosParaDecimal(horas: number, minutos: number): number {
  return horas + (minutos / 60);
}

export function formatarTempoImpressao(decimal?: number): string {
  if (!decimal) return '-';
  const { horas, minutos } = tempoDecimalParaHorasMinutos(decimal);
  if (horas === 0) return `${minutos}min`;
  if (minutos === 0) return `${horas}h`;
  return `${horas}h ${minutos}min`;
}
