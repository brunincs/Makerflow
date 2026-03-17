import { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Phone,
  Save,
  Printer,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  AlertTriangle,
  Wrench,
  Power,
  Upload,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import {
  getImpressoras,
  createImpressora,
  updateImpressora,
  deleteImpressora,
} from '../../services/impressorasService';
import { Impressora, StatusImpressora, TipoDocumento, RegimeTributario } from '../../types';

const MODELOS_IMPRESSORA = [
  { value: 'a1_mini', label: 'Bambu Lab A1 Mini', marca: 'Bambu Lab', consumo: 0.12 },
  { value: 'a1', label: 'Bambu Lab A1', marca: 'Bambu Lab', consumo: 0.15 },
  { value: 'p1p', label: 'Bambu Lab P1P', marca: 'Bambu Lab', consumo: 0.15 },
  { value: 'p1s', label: 'Bambu Lab P1S', marca: 'Bambu Lab', consumo: 0.15 },
  { value: 'x1_carbon', label: 'Bambu Lab X1 Carbon', marca: 'Bambu Lab', consumo: 0.18 },
  { value: 'h2d', label: 'Bambu Lab H2D', marca: 'Bambu Lab', consumo: 0.20 },
  { value: 'ender3', label: 'Ender 3', marca: 'Creality', consumo: 0.12 },
  { value: 'ender3_v2', label: 'Ender 3 V2', marca: 'Creality', consumo: 0.12 },
  { value: 'ender3_s1', label: 'Ender 3 S1', marca: 'Creality', consumo: 0.14 },
  { value: 'k1', label: 'K1', marca: 'Creality', consumo: 0.15 },
  { value: 'k1_max', label: 'K1 Max', marca: 'Creality', consumo: 0.18 },
  { value: 'prusa_mk4', label: 'Prusa MK4', marca: 'Prusa', consumo: 0.12 },
  { value: 'prusa_mini', label: 'Prusa Mini', marca: 'Prusa', consumo: 0.10 },
  { value: 'outra', label: 'Outra', marca: '', consumo: 0.12 },
];

export function Perfil() {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Dados do perfil
  const [name, setName] = useState(profile?.name || '');
  const [nomeEmpresa, setNomeEmpresa] = useState(profile?.nome_empresa || '');
  const [nomeFantasia, setNomeFantasia] = useState(profile?.nome_fantasia || '');
  const [documento, setDocumento] = useState(profile?.documento || '');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumento>(profile?.tipo_documento || 'cpf');
  const [regimeTributario, setRegimeTributario] = useState<RegimeTributario | ''>(profile?.regime_tributario || '');
  const [telefone, setTelefone] = useState(profile?.telefone || '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '');
  const [emailComercial, setEmailComercial] = useState(profile?.email_comercial || '');
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url || '');
  const [valorKwh, setValorKwh] = useState(profile?.valor_kwh || 0.85);

  // Impressoras
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [loadingImpressoras, setLoadingImpressoras] = useState(true);
  const [showAddImpressora, setShowAddImpressora] = useState(false);
  const [editingImpressora, setEditingImpressora] = useState<Impressora | null>(null);

  // Form impressora
  const [modeloSelecionado, setModeloSelecionado] = useState('');
  const [apelidoImpressora, setApelidoImpressora] = useState('');
  const [marcaImpressora, setMarcaImpressora] = useState('');
  const [consumoKwh, setConsumoKwh] = useState(0.12);
  const [statusImpressora, setStatusImpressora] = useState<StatusImpressora>('ativa');
  const [notasImpressora, setNotasImpressora] = useState('');

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setNomeEmpresa(profile.nome_empresa || '');
      setNomeFantasia(profile.nome_fantasia || '');
      setDocumento(profile.documento || '');
      setTipoDocumento(profile.tipo_documento || 'cpf');
      setRegimeTributario(profile.regime_tributario || '');
      setTelefone(profile.telefone || '');
      setWhatsapp(profile.whatsapp || '');
      setEmailComercial(profile.email_comercial || '');
      setLogoUrl(profile.logo_url || '');
      setValorKwh(profile.valor_kwh || 0.85);
    }
  }, [profile]);

  useEffect(() => {
    loadImpressoras();
  }, []);

  const loadImpressoras = async () => {
    setLoadingImpressoras(true);
    const data = await getImpressoras();
    setImpressoras(data);
    setLoadingImpressoras(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setSuccess(false);

    const { error } = await updateProfile({
      name,
      nome_empresa: nomeEmpresa || null,
      nome_fantasia: nomeFantasia || null,
      documento: documento || null,
      tipo_documento: tipoDocumento,
      regime_tributario: regimeTributario || null,
      telefone: telefone || null,
      whatsapp: whatsapp || null,
      email_comercial: emailComercial || null,
      logo_url: logoUrl || null,
      valor_kwh: valorKwh || null,
    });

    setSaving(false);

    if (!error) {
      setSuccess(true);
      await refreshProfile();
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}_logo.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error } = await supabase.storage
      .from('imagens')
      .upload(filePath, file, { upsert: true });

    if (error) {
      console.error('Erro ao fazer upload:', error);
      return;
    }

    const { data } = supabase.storage.from('imagens').getPublicUrl(filePath);
    setLogoUrl(data.publicUrl);
  };

  const handleModeloChange = (modelo: string) => {
    setModeloSelecionado(modelo);
    const found = MODELOS_IMPRESSORA.find(m => m.value === modelo);
    if (found) {
      setMarcaImpressora(found.marca);
      setConsumoKwh(found.consumo);
    }
  };

  const resetImpressoraForm = () => {
    setModeloSelecionado('');
    setApelidoImpressora('');
    setMarcaImpressora('');
    setConsumoKwh(0.12);
    setStatusImpressora('ativa');
    setNotasImpressora('');
    setEditingImpressora(null);
  };

  const handleAddImpressora = async () => {
    if (!modeloSelecionado) return;

    const modeloInfo = MODELOS_IMPRESSORA.find(m => m.value === modeloSelecionado);
    const nomeModelo = modeloInfo?.label || modeloSelecionado;

    const nova = await createImpressora({
      modelo: nomeModelo,
      apelido: apelidoImpressora || null,
      marca: marcaImpressora || null,
      status: statusImpressora,
      consumo_kwh: consumoKwh,
      notas: notasImpressora || null,
    });

    if (nova) {
      setImpressoras([...impressoras, nova]);
      setShowAddImpressora(false);
      resetImpressoraForm();
    }
  };

  const handleEditImpressora = (imp: Impressora) => {
    setEditingImpressora(imp);
    const found = MODELOS_IMPRESSORA.find(m => m.label === imp.modelo);
    setModeloSelecionado(found?.value || 'outra');
    setApelidoImpressora(imp.apelido || '');
    setMarcaImpressora(imp.marca || '');
    setConsumoKwh(imp.consumo_kwh);
    setStatusImpressora(imp.status);
    setNotasImpressora(imp.notas || '');
    setShowAddImpressora(true);
  };

  const handleUpdateImpressora = async () => {
    if (!editingImpressora?.id) return;

    const modeloInfo = MODELOS_IMPRESSORA.find(m => m.value === modeloSelecionado);
    const nomeModelo = modeloInfo?.label || modeloSelecionado;

    const updated = await updateImpressora(editingImpressora.id, {
      modelo: nomeModelo,
      apelido: apelidoImpressora || null,
      marca: marcaImpressora || null,
      status: statusImpressora,
      consumo_kwh: consumoKwh,
      notas: notasImpressora || null,
    });

    if (updated) {
      setImpressoras(impressoras.map(i => i.id === updated.id ? updated : i));
      setShowAddImpressora(false);
      resetImpressoraForm();
    }
  };

  const handleDeleteImpressora = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta impressora?')) return;

    const success = await deleteImpressora(id);
    if (success) {
      setImpressoras(impressoras.filter(i => i.id !== id));
    }
  };

  const formatDocumento = (value: string, tipo: TipoDocumento) => {
    const numbers = value.replace(/\D/g, '');
    if (tipo === 'cpf') {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14);
    } else {
      return numbers
        .replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
        .slice(0, 18);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const getStatusColor = (status: StatusImpressora) => {
    switch (status) {
      case 'ativa':
        return 'bg-green-500/10 text-green-400';
      case 'manutencao':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'inativa':
        return 'bg-red-500/10 text-red-400';
    }
  };

  const getStatusIcon = (status: StatusImpressora) => {
    switch (status) {
      case 'ativa':
        return <Power className="w-4 h-4" />;
      case 'manutencao':
        return <Wrench className="w-4 h-4" />;
      case 'inativa':
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="w-7 h-7 text-blue-500" />
          Meu Perfil
        </h1>
        <p className="text-gray-400 mt-1">
          Configure seus dados pessoais e da empresa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Pessoais */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Dados Pessoais
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email (login)
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Dados da Empresa */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-500" />
            Dados da Empresa
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Logo
                </label>
                <div className="relative w-20 h-20">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-20 h-20 rounded-lg object-cover border border-gray-700"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 p-1 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700">
                    <Upload className="w-3 h-3 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome da Empresa / Marca
                  </label>
                  <input
                    type="text"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    placeholder="Razao social"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Nome que aparece em orcamentos"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tipo de Documento
                </label>
                <select
                  value={tipoDocumento}
                  onChange={(e) => {
                    setTipoDocumento(e.target.value as TipoDocumento);
                    setDocumento('');
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {tipoDocumento === 'cpf' ? 'CPF' : 'CNPJ'}
                </label>
                <input
                  type="text"
                  value={documento}
                  onChange={(e) => setDocumento(formatDocumento(e.target.value, tipoDocumento))}
                  placeholder={tipoDocumento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Regime Tributario
              </label>
              <select
                value={regimeTributario}
                onChange={(e) => setRegimeTributario(e.target.value as RegimeTributario)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione...</option>
                <option value="mei">MEI</option>
                <option value="simples">Simples Nacional</option>
                <option value="lucro_presumido">Lucro Presumido</option>
                <option value="lucro_real">Lucro Real</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-500" />
            Contato Comercial
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email Comercial
              </label>
              <input
                type="email"
                value={emailComercial}
                onChange={(e) => setEmailComercial(e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Botao Salvar */}
            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Perfil
              </button>

              {success && (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <Check className="w-4 h-4" />
                  Salvo com sucesso!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Configuracoes de Energia e Impressoras */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          {/* Valor do kWh */}
          <div className="mb-6 pb-6 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Custo de Energia
            </h2>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Valor do kWh (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorKwh}
                  onChange={(e) => setValorKwh(parseFloat(e.target.value) || 0)}
                  placeholder="0.85"
                  className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Media nacional: R$ 0.85 a R$ 0.90. Consulte sua conta de luz.
              </p>
            </div>
          </div>

          {/* Impressoras */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-500" />
              Minhas Impressoras
            </h2>
            <button
              onClick={() => {
                resetImpressoraForm();
                setShowAddImpressora(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {loadingImpressoras ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : impressoras.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Printer className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma impressora cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {impressoras.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-white">
                        {imp.apelido || imp.modelo}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {imp.apelido && <span>{imp.modelo}</span>}
                        {imp.marca && <span>({imp.marca})</span>}
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {imp.consumo_kwh} kWh
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(imp.status)}`}>
                      {getStatusIcon(imp.status)}
                      {imp.status === 'ativa' ? 'Ativa' : imp.status === 'manutencao' ? 'Manutencao' : 'Inativa'}
                    </span>
                    <button
                      onClick={() => handleEditImpressora(imp)}
                      className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => imp.id && handleDeleteImpressora(imp.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Adicionar/Editar Impressora */}
      {showAddImpressora && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingImpressora ? 'Editar Impressora' : 'Adicionar Impressora'}
              </h3>
              <button
                onClick={() => {
                  setShowAddImpressora(false);
                  resetImpressoraForm();
                }}
                className="p-1 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Modelo *
                </label>
                <select
                  value={modeloSelecionado}
                  onChange={(e) => handleModeloChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {MODELOS_IMPRESSORA.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Apelido (opcional)
                </label>
                <input
                  type="text"
                  value={apelidoImpressora}
                  onChange={(e) => setApelidoImpressora(e.target.value)}
                  placeholder="Ex: Impressora do quarto"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={marcaImpressora}
                    onChange={(e) => setMarcaImpressora(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Consumo (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={consumoKwh}
                    onChange={(e) => setConsumoKwh(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Status
                </label>
                <div className="flex gap-2">
                  {(['ativa', 'manutencao', 'inativa'] as StatusImpressora[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusImpressora(s)}
                      className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border transition-colors ${
                        statusImpressora === s
                          ? s === 'ativa'
                            ? 'bg-green-600 border-green-600 text-white'
                            : s === 'manutencao'
                            ? 'bg-yellow-600 border-yellow-600 text-white'
                            : 'bg-red-600 border-red-600 text-white'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {getStatusIcon(s)}
                      {s === 'ativa' ? 'Ativa' : s === 'manutencao' ? 'Manut.' : 'Inativa'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  value={notasImpressora}
                  onChange={(e) => setNotasImpressora(e.target.value)}
                  rows={2}
                  placeholder="Observacoes sobre a impressora..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddImpressora(false);
                    resetImpressoraForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingImpressora ? handleUpdateImpressora : handleAddImpressora}
                  disabled={!modeloSelecionado}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                >
                  {editingImpressora ? 'Salvar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
