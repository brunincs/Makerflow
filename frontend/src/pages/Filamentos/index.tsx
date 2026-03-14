import { useState, useEffect } from 'react';
import { Card, CardBody } from '../../components/ui';
import { Filamento } from '../../types';
import { getFilamentos, createFilamento, updateFilamento, deleteFilamento } from '../../services/filamentosService';
import { DecimalInput } from '../../components/ui/DecimalInput';
import {
  Cylinder,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  AlertCircle
} from 'lucide-react';

const MATERIAIS = ['PLA', 'PETG', 'ABS', 'TPU'];

interface FilamentoForm {
  marca: string;
  nome_filamento: string;
  cor: string;
  material: string;
  preco_pago: number;
}

const initialForm: FilamentoForm = {
  marca: '',
  nome_filamento: '',
  cor: '',
  material: 'PLA',
  preco_pago: 0,
};

export function Filamentos() {
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FilamentoForm>(initialForm);

  useEffect(() => {
    loadFilamentos();
  }, []);

  const loadFilamentos = async () => {
    setLoading(true);
    const data = await getFilamentos();
    setFilamentos(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.marca.trim() || !form.nome_filamento.trim() || form.preco_pago <= 0) {
      alert('Preencha todos os campos obrigatorios.');
      return;
    }

    setSaving(true);

    if (editingId) {
      const resultado = await updateFilamento(editingId, form);
      if (resultado) {
        setFilamentos(prev => prev.map(f => f.id === editingId ? resultado : f));
        setEditingId(null);
      }
    } else {
      const resultado = await createFilamento(form);
      if (resultado) {
        setFilamentos(prev => [resultado, ...prev]);
      }
    }

    setForm(initialForm);
    setShowForm(false);
    setSaving(false);
  };

  const handleEdit = (filamento: Filamento) => {
    setForm({
      marca: filamento.marca,
      nome_filamento: filamento.nome_filamento,
      cor: filamento.cor,
      material: filamento.material,
      preco_pago: filamento.preco_pago,
    });
    setEditingId(filamento.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este filamento?')) return;

    setDeletingId(id);
    const success = await deleteFilamento(id);
    if (success) {
      setFilamentos(prev => prev.filter(f => f.id !== id));
    }
    setDeletingId(null);
  };

  const handleCancel = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Cylinder className="w-6 h-6 text-purple-600" />
            </div>
            Filamentos
          </h1>
          <p className="text-gray-500 mt-2">
            Cadastre seus filamentos para usar na precificacao
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Cylinder className="w-6 h-6 text-purple-600" />
            </div>
            Filamentos
          </h1>
          <p className="text-gray-500 mt-2">
            Cadastre seus filamentos para usar na precificacao
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo filamento
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="mb-6">
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar filamento' : 'Novo filamento'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Marca */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca *
                  </label>
                  <input
                    type="text"
                    value={form.marca}
                    onChange={(e) => setForm(prev => ({ ...prev, marca: e.target.value }))}
                    placeholder="Ex: Voolt, 3D Fila, Flashforge..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Material */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material *
                  </label>
                  <select
                    value={form.material}
                    onChange={(e) => setForm(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    {MATERIAIS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Nome do Filamento */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Filamento *
                  </label>
                  <input
                    type="text"
                    value={form.nome_filamento}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_filamento: e.target.value }))}
                    placeholder="Ex: PLA Aluminio V-Silk High Speed Premium"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Cor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <input
                    type="text"
                    value={form.cor}
                    onChange={(e) => setForm(prev => ({ ...prev, cor: e.target.value }))}
                    placeholder="Ex: Aluminio, Preto, Branco..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Preco Pago */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preco pago (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                      R$
                    </span>
                    <DecimalInput
                      value={form.preco_pago}
                      onChange={(value) => setForm(prev => ({ ...prev, preco_pago: value }))}
                      placeholder="89.90"
                      className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Preco por kg (todos os rolos sao considerados 1kg)
                  </p>
                </div>
              </div>

              {/* Botoes */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingId ? 'Salvar alteracoes' : 'Cadastrar filamento'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Lista de Filamentos */}
      {filamentos.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum filamento cadastrado
            </h3>
            <p className="text-gray-500 mb-4">
              Cadastre seus filamentos para selecionar na calculadora de precificacao.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Cadastrar filamento
              </button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {filamentos.map((filamento) => (
            <Card key={filamento.id} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Icone */}
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Cylinder className="w-6 h-6 text-purple-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-purple-600">{filamento.marca}</span>
                    <span className="text-gray-300">•</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                      {filamento.material}
                    </span>
                    {filamento.cor && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">{filamento.cor}</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 truncate">
                    {filamento.nome_filamento}
                  </h3>
                </div>

                {/* Preco */}
                <div className="text-right">
                  <p className="text-2xl font-bold text-purple-700">
                    R$ {formatCurrency(filamento.preco_por_kg)}
                  </p>
                  <p className="text-xs text-gray-500">/kg</p>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(filamento)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(filamento.id)}
                    disabled={deletingId === filamento.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Excluir"
                  >
                    {deletingId === filamento.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Resumo */}
      {filamentos.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              <strong className="text-gray-900">{filamentos.length}</strong> {filamentos.length === 1 ? 'filamento cadastrado' : 'filamentos cadastrados'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
