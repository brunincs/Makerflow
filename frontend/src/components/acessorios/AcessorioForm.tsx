import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Acessorio, UNIDADES_ACESSORIO } from '../../types/acessorio';

interface AcessorioFormProps {
  acessorio?: Acessorio | null;
  onSave: (data: Omit<Acessorio, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function AcessorioForm({ acessorio, onSave, onCancel, isLoading }: AcessorioFormProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [unidade, setUnidade] = useState('unidade');
  const [custoUnitario, setCustoUnitario] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState('');
  const [estoqueMinimo, setEstoqueMinimo] = useState('5');

  useEffect(() => {
    if (acessorio) {
      setNome(acessorio.nome);
      setDescricao(acessorio.descricao || '');
      setUnidade(acessorio.unidade);
      setCustoUnitario(acessorio.custo_unitario.toString());
      setEstoqueAtual(acessorio.estoque_atual.toString());
      setEstoqueMinimo(acessorio.estoque_minimo.toString());
    }
  }, [acessorio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSave({
      nome,
      descricao: descricao || undefined,
      unidade,
      custo_unitario: parseFloat(custoUnitario) || 0,
      estoque_atual: parseInt(estoqueAtual) || 0,
      estoque_minimo: parseInt(estoqueMinimo) || 5,
      ativo: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nome do Acessorio"
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Ex: LED Branco 5mm"
        required
      />

      <Input
        label="Descricao (opcional)"
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
        placeholder="Ex: LED de alto brilho para luminarias"
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Unidade
          </label>
          <select
            value={unidade}
            onChange={e => setUnidade(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white
              focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            {UNIDADES_ACESSORIO.map(u => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Custo Unitario (R$)"
          type="number"
          step="0.01"
          min="0"
          value={custoUnitario}
          onChange={e => setCustoUnitario(e.target.value)}
          placeholder="0.50"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Estoque Atual"
          type="number"
          min="0"
          value={estoqueAtual}
          onChange={e => setEstoqueAtual(e.target.value)}
          placeholder="0"
        />

        <Input
          label="Estoque Minimo (alerta)"
          type="number"
          min="0"
          value={estoqueMinimo}
          onChange={e => setEstoqueMinimo(e.target.value)}
          placeholder="5"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !nome}>
          {isLoading ? 'Salvando...' : acessorio ? 'Salvar' : 'Criar Acessorio'}
        </Button>
      </div>
    </form>
  );
}
