import { useState, useEffect } from 'react';
import { Card, CardBody } from '../../components/ui';
import { Filamento } from '../../types';
import { getFilamentos, createFilamento, updateFilamento, deleteFilamento, adicionarEstoqueFilamento } from '../../services/filamentosService';
import { DecimalInput } from '../../components/ui/DecimalInput';
import {
  Cylinder,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Package
} from 'lucide-react';

const MATERIAIS = ['PLA', 'PETG', 'ABS', 'TPU'];

interface FilamentoForm {
  marca: string;
  nome_filamento: string;
  cor: string;
  material: string;
  preco_pago: number;
  quantidade_rolos: number;
}

interface EstoqueForm {
  quantidade_rolos: number;
  preco_por_rolo: number;
}

const initialForm: FilamentoForm = {
  marca: '',
  nome_filamento: '',
  cor: '',
  material: 'PLA',
  preco_pago: 0,
  quantidade_rolos: 1,
};

const initialEstoqueForm: EstoqueForm = {
  quantidade_rolos: 1,
  preco_por_rolo: 0,
};

export function Filamentos() {
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FilamentoForm>(initialForm);

  // Modal de adicionar estoque
  const [showEstoqueModal, setShowEstoqueModal] = useState(false);
  const [estoqueFilamentoId, setEstoqueFilamentoId] = useState<string | null>(null);
  const [estoqueForm, setEstoqueForm] = useState<EstoqueForm>(initialEstoqueForm);
  const [savingEstoque, setSavingEstoque] = useState(false);

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

    try {
      if (editingId) {
        // Na edição, não enviamos quantidade_rolos
        const { quantidade_rolos, ...formSemQuantidade } = form;
        const resultado = await updateFilamento(editingId, formSemQuantidade);
        if (resultado) {
          await loadFilamentos();
          setEditingId(null);
          setForm(initialForm);
          setShowForm(false);
        } else {
          alert('Erro ao salvar alteracoes. Verifique o console.');
        }
      } else {
        const resultado = await createFilamento(form);
        if (resultado) {
          await loadFilamentos();
          setForm(initialForm);
          setShowForm(false);
        } else {
          alert('Erro ao cadastrar filamento. Verifique o console.');
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar: ' + (error as Error).message);
    }

    setSaving(false);
  };

  const handleEdit = (filamento: Filamento) => {
    setForm({
      marca: filamento.marca,
      nome_filamento: filamento.nome_filamento,
      cor: filamento.cor,
      material: filamento.material,
      preco_pago: filamento.preco_por_kg, // Usar preço médio atual
      quantidade_rolos: 0, // Não usado na edição
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

  // Funções do modal de estoque
  const handleOpenEstoqueModal = (filamentoId: string) => {
    setEstoqueFilamentoId(filamentoId);
    setEstoqueForm(initialEstoqueForm);
    setShowEstoqueModal(true);
  };

  const handleCloseEstoqueModal = () => {
    setShowEstoqueModal(false);
    setEstoqueFilamentoId(null);
    setEstoqueForm(initialEstoqueForm);
  };

  const handleAdicionarEstoque = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!estoqueFilamentoId || estoqueForm.quantidade_rolos <= 0 || estoqueForm.preco_por_rolo <= 0) {
      alert('Preencha todos os campos corretamente.');
      return;
    }

    setSavingEstoque(true);

    try {
      const resultado = await adicionarEstoqueFilamento(
        estoqueFilamentoId,
        estoqueForm.quantidade_rolos,
        estoqueForm.preco_por_rolo
      );

      if (resultado) {
        await loadFilamentos();
        handleCloseEstoqueModal();
      } else {
        alert('Erro ao adicionar estoque. Verifique o console.');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao adicionar estoque: ' + (error as Error).message);
    }

    setSavingEstoque(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatEstoque = (gramas: number) => {
    const kg = gramas / 1000;
    return kg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const isEstoqueBaixo = (gramas: number) => gramas < 1000;

  // Calcular preview do novo preço médio
  const getFilamentoAtual = () => filamentos.find(f => f.id === estoqueFilamentoId);
  const calcularNovoPrecoMedio = () => {
    const filamento = getFilamentoAtual();
    if (!filamento) return 0;

    const estoqueAtualKg = (filamento.estoque_gramas || 0) / 1000;
    const valorEstoqueAtual = filamento.preco_por_kg * estoqueAtualKg;
    const valorCompra = estoqueForm.preco_por_rolo * estoqueForm.quantidade_rolos;
    const novoEstoqueKg = estoqueAtualKg + estoqueForm.quantidade_rolos;

    return novoEstoqueKg > 0 ? (valorEstoqueAtual + valorCompra) / novoEstoqueKg : estoqueForm.preco_por_rolo;
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

                {/* Preco Pago - apenas na criação ou edição de preço base */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingId ? 'Preco medio atual (R$/kg)' : 'Preco pago por rolo (R$) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                      R$
                    </span>
                    <DecimalInput
                      value={form.preco_pago}
                      onChange={(value) => setForm(prev => ({ ...prev, preco_pago: value }))}
                      placeholder="89.90"
                      disabled={editingId !== null}
                      className={`w-full pl-9 px-3 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                        ${editingId ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                    />
                  </div>
                  {editingId ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Use "Adicionar estoque" para atualizar o preco medio
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">
                      Preco por kg (todos os rolos sao considerados 1kg)
                    </p>
                  )}
                </div>

                {/* Quantidade de Rolos - apenas na criação */}
                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade de rolos inicial
                    </label>
                    <div className="relative">
                      <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.quantidade_rolos}
                        onChange={(e) => setForm(prev => ({ ...prev, quantidade_rolos: parseInt(e.target.value) || 1 }))}
                        placeholder="1"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white
                          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Estoque inicial: {(form.quantidade_rolos * 1000).toLocaleString('pt-BR')}g ({form.quantidade_rolos}kg)
                    </p>
                  </div>
                )}
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

                {/* Estoque */}
                <div className="text-center px-4 border-l border-gray-200">
                  <div className={`flex items-center gap-1 ${
                    isEstoqueBaixo(filamento.estoque_gramas || 0) ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isEstoqueBaixo(filamento.estoque_gramas || 0) && (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span className="text-lg font-bold">
                      {formatEstoque(filamento.estoque_gramas || 0)} kg
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">em estoque</p>
                </div>

                {/* Preco Medio */}
                <div className="text-right px-4 border-l border-gray-200">
                  <p className="text-lg font-bold text-purple-700">
                    R$ {formatCurrency(filamento.preco_por_kg)}
                  </p>
                  <p className="text-xs text-gray-500">preco medio/kg</p>
                </div>

                {/* Acoes */}
                <div className="flex items-center gap-1 border-l border-gray-200 pl-4">
                  <button
                    onClick={() => handleOpenEstoqueModal(filamento.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    title="Adicionar estoque"
                  >
                    <Plus className="w-4 h-4" />
                    Estoque
                  </button>
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
            <span className="text-gray-500">
              Estoque total: <strong className="text-gray-900">
                {formatEstoque(filamentos.reduce((acc, f) => acc + (f.estoque_gramas || 0), 0))} kg
              </strong>
            </span>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Estoque */}
      {showEstoqueModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50" onClick={handleCloseEstoqueModal} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Adicionar Estoque</h3>
                  <button onClick={handleCloseEstoqueModal} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                {getFilamentoAtual() && (
                  <p className="text-sm text-gray-500 mt-1">
                    {getFilamentoAtual()?.marca} - {getFilamentoAtual()?.nome_filamento}
                  </p>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleAdicionarEstoque} className="p-6 space-y-4">
                {/* Quantidade de Rolos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade de rolos *
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={estoqueForm.quantidade_rolos}
                      onChange={(e) => setEstoqueForm(prev => ({ ...prev, quantidade_rolos: parseInt(e.target.value) || 1 }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Cada rolo = 1kg ({(estoqueForm.quantidade_rolos * 1000).toLocaleString('pt-BR')}g)
                  </p>
                </div>

                {/* Preco por Rolo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preco pago por rolo (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                      R$
                    </span>
                    <DecimalInput
                      value={estoqueForm.preco_por_rolo}
                      onChange={(value) => setEstoqueForm(prev => ({ ...prev, preco_por_rolo: value }))}
                      placeholder="89.90"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white
                        focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Preview do calculo */}
                {estoqueForm.preco_por_rolo > 0 && getFilamentoAtual() && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Resultado da entrada:</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-700">Estoque atual:</span>
                        <span className="font-medium text-green-800">
                          {formatEstoque(getFilamentoAtual()?.estoque_gramas || 0)} kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Adicionando:</span>
                        <span className="font-medium text-green-800">
                          +{estoqueForm.quantidade_rolos} kg
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                        <span className="text-green-700">Novo estoque:</span>
                        <span className="font-bold text-green-800">
                          {formatEstoque((getFilamentoAtual()?.estoque_gramas || 0) + (estoqueForm.quantidade_rolos * 1000))} kg
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                        <span className="text-green-700">Preco medio atual:</span>
                        <span className="font-medium text-green-800">
                          R$ {formatCurrency(getFilamentoAtual()?.preco_por_kg || 0)}/kg
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Novo preco medio:</span>
                        <span className="font-bold text-green-800">
                          R$ {formatCurrency(calcularNovoPrecoMedio())}/kg
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botoes */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={savingEstoque}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {savingEstoque ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Adicionar
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEstoqueModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
