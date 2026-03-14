import { useState, useEffect } from 'react';
import { Card, CardBody } from '../../components/ui';
import { Embalagem, TipoEmbalagem } from '../../types';
import { getEmbalagens, createEmbalagem, updateEmbalagem, deleteEmbalagem } from '../../services/embalagensService';
import { DecimalInput } from '../../components/ui/DecimalInput';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  AlertCircle,
  Mail,
  Shield,
  BoxIcon
} from 'lucide-react';

const TIPOS_EMBALAGEM: { value: TipoEmbalagem; label: string; icon: typeof Mail }[] = [
  { value: 'Envelope', label: 'Envelope', icon: Mail },
  { value: 'Proteção', label: 'Protecao', icon: Shield },
  { value: 'Caixa', label: 'Caixa', icon: BoxIcon },
];

interface EmbalagemForm {
  tipo: TipoEmbalagem;
  nome_embalagem: string;
  preco_unitario: number;
}

const initialForm: EmbalagemForm = {
  tipo: 'Envelope',
  nome_embalagem: '',
  preco_unitario: 0,
};

export function Embalagens() {
  const [embalagens, setEmbalagens] = useState<Embalagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EmbalagemForm>(initialForm);

  useEffect(() => {
    loadEmbalagens();
  }, []);

  const loadEmbalagens = async () => {
    setLoading(true);
    const data = await getEmbalagens();
    setEmbalagens(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.nome_embalagem.trim() || form.preco_unitario <= 0) {
      alert('Preencha todos os campos obrigatorios.');
      return;
    }

    setSaving(true);

    if (editingId) {
      const resultado = await updateEmbalagem(editingId, form);
      if (resultado) {
        setEmbalagens(prev => prev.map(e => e.id === editingId ? resultado : e));
        setEditingId(null);
      }
    } else {
      const resultado = await createEmbalagem(form);
      if (resultado) {
        setEmbalagens(prev => [resultado, ...prev]);
      }
    }

    setForm(initialForm);
    setShowForm(false);
    setSaving(false);
  };

  const handleEdit = (embalagem: Embalagem) => {
    setForm({
      tipo: embalagem.tipo,
      nome_embalagem: embalagem.nome_embalagem,
      preco_unitario: embalagem.preco_unitario,
    });
    setEditingId(embalagem.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta embalagem?')) return;

    setDeletingId(id);
    const success = await deleteEmbalagem(id);
    if (success) {
      setEmbalagens(prev => prev.filter(e => e.id !== id));
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

  const getTipoIcon = (tipo: TipoEmbalagem) => {
    const found = TIPOS_EMBALAGEM.find(t => t.value === tipo);
    return found?.icon || Package;
  };

  const getTipoColor = (tipo: TipoEmbalagem) => {
    switch (tipo) {
      case 'Envelope': return 'bg-amber-100 text-amber-600';
      case 'Proteção': return 'bg-blue-100 text-blue-600';
      case 'Caixa': return 'bg-emerald-100 text-emerald-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            Embalagens
          </h1>
          <p className="text-gray-500 mt-2">
            Cadastre suas embalagens para usar na precificacao
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
            <div className="p-2 bg-amber-100 rounded-lg">
              <Package className="w-6 h-6 text-amber-600" />
            </div>
            Embalagens
          </h1>
          <p className="text-gray-500 mt-2">
            Cadastre suas embalagens para usar na precificacao
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova embalagem
          </button>
        )}
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="mb-6">
          <CardBody className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingId ? 'Editar embalagem' : 'Nova embalagem'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tipo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm(prev => ({ ...prev, tipo: e.target.value as TipoEmbalagem }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    {TIPOS_EMBALAGEM.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Nome da Embalagem */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da embalagem *
                  </label>
                  <input
                    type="text"
                    value={form.nome_embalagem}
                    onChange={(e) => setForm(prev => ({ ...prev, nome_embalagem: e.target.value }))}
                    placeholder="Ex: Envelope kraft P, Plastico bolha 20x30..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                {/* Preco Unitario */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preco unitario (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                      R$
                    </span>
                    <DecimalInput
                      value={form.preco_unitario}
                      onChange={(value) => setForm(prev => ({ ...prev, preco_unitario: value }))}
                      placeholder="0.80"
                      className="w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Botoes */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingId ? 'Salvar alteracoes' : 'Cadastrar embalagem'}
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

      {/* Lista de Embalagens */}
      {embalagens.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma embalagem cadastrada
            </h3>
            <p className="text-gray-500 mb-4">
              Cadastre suas embalagens para selecionar na calculadora de precificacao.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Cadastrar embalagem
              </button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {embalagens.map((embalagem) => {
            const TipoIcon = getTipoIcon(embalagem.tipo);
            const tipoColor = getTipoColor(embalagem.tipo);

            return (
              <Card key={embalagem.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* Icone */}
                  <div className={`p-3 rounded-xl ${tipoColor}`}>
                    <TipoIcon className="w-6 h-6" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${tipoColor}`}>
                        {embalagem.tipo}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {embalagem.nome_embalagem}
                    </h3>
                  </div>

                  {/* Preco */}
                  <div className="text-right">
                    <p className="text-2xl font-bold text-amber-700">
                      R$ {formatCurrency(embalagem.preco_unitario)}
                    </p>
                    <p className="text-xs text-gray-500">/unidade</p>
                  </div>

                  {/* Acoes */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(embalagem)}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(embalagem.id)}
                      disabled={deletingId === embalagem.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {deletingId === embalagem.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {embalagens.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              <strong className="text-gray-900">{embalagens.length}</strong> {embalagens.length === 1 ? 'embalagem cadastrada' : 'embalagens cadastradas'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
