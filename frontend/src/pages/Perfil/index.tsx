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
  Store,
  Copy,
  ExternalLink,
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
  const [saveError, setSaveError] = useState<string | null>(null);

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
  const [slugLoja, setSlugLoja] = useState(profile?.slug_loja || '');

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
      setSlugLoja(profile.slug_loja || '');
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
    setSaveError(null);

    const dadosParaSalvar = {
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
      slug_loja: slugLoja || null,
    };

    console.log('[Perfil] Salvando dados:', dadosParaSalvar);

    const { error } = await updateProfile(dadosParaSalvar);

    setSaving(false);

    if (error) {
      console.error('[Perfil] Erro ao salvar:', error);
      setSaveError(error.message || 'Erro ao salvar perfil');
      setTimeout(() => setSaveError(null), 5000);
    } else {
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
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'manutencao':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'inativa':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
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
        <h1 className="text-2xl font-bold text-[#f9fafb] flex items-center gap-2">
          <User className="w-7 h-7 text-emerald-500" />
          Meu Perfil
        </h1>
        <p className="text-[#9ca3af] mt-1">
          Configure seus dados pessoais e da empresa
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados Pessoais */}
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          <h2 className="text-lg font-semibold text-[#f9fafb] mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-500" />
            Dados Pessoais
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                Email (login)
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 bg-[#1f2937] border border-[#1f2937] rounded-lg text-[#6b7280] cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Dados da Empresa */}
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          <h2 className="text-lg font-semibold text-[#f9fafb] mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            Dados da Empresa
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              {/* Logo */}
              <div className="flex-shrink-0">
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  Logo
                </label>
                <div className="relative w-20 h-20">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="w-20 h-20 rounded-lg object-cover border border-[#1f2937]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-[#1f2937] border border-[#374151] flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-[#6b7280]" />
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 p-1.5 bg-emerald-600 rounded-full cursor-pointer hover:bg-emerald-500 transition-colors">
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
                  <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                    Nome da Empresa / Marca
                  </label>
                  <input
                    type="text"
                    value={nomeEmpresa}
                    onChange={(e) => setNomeEmpresa(e.target.value)}
                    placeholder="Razao social"
                    className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                    Nome Fantasia
                  </label>
                  <input
                    type="text"
                    value={nomeFantasia}
                    onChange={(e) => setNomeFantasia(e.target.value)}
                    placeholder="Nome que aparece em orcamentos"
                    className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  Tipo de Documento
                </label>
                <select
                  value={tipoDocumento}
                  onChange={(e) => {
                    setTipoDocumento(e.target.value as TipoDocumento);
                    setDocumento('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  {tipoDocumento === 'cpf' ? 'CPF' : 'CNPJ'}
                </label>
                <input
                  type="text"
                  value={documento}
                  onChange={(e) => setDocumento(formatDocumento(e.target.value, tipoDocumento))}
                  placeholder={tipoDocumento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                Regime Tributario
              </label>
              <select
                value={regimeTributario}
                onChange={(e) => setRegimeTributario(e.target.value as RegimeTributario)}
                className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer"
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
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          <h2 className="text-lg font-semibold text-[#f9fafb] mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-emerald-500" />
            Contato Comercial
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  Telefone
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                Email Comercial
              </label>
              <input
                type="email"
                value={emailComercial}
                onChange={(e) => setEmailComercial(e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Botao Salvar */}
            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Perfil
              </button>

              {success && (
                <span className="flex items-center gap-1 text-emerald-400 text-sm">
                  <Check className="w-4 h-4" />
                  Salvo com sucesso!
                </span>
              )}

              {saveError && (
                <span className="flex items-center gap-1 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  {saveError}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Configuracoes de Energia e Impressoras */}
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          {/* Valor do kWh */}
          <div className="mb-6 pb-6 border-b border-[#1f2937]">
            <h2 className="text-lg font-semibold text-[#f9fafb] mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Custo de Energia
            </h2>
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                Valor do kWh (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280]">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valorKwh}
                  onChange={(e) => setValorKwh(parseFloat(e.target.value) || 0)}
                  placeholder="0.85"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>
              <p className="text-xs text-[#6b7280] mt-1.5">
                Media nacional: R$ 0.85 a R$ 0.90. Consulte sua conta de luz.
              </p>
            </div>
          </div>

          {/* Impressoras */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#f9fafb] flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-500" />
              Minhas Impressoras
            </h2>
            <button
              onClick={() => {
                resetImpressoraForm();
                setShowAddImpressora(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>

          {loadingImpressoras ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : impressoras.length === 0 ? (
            <div className="text-center py-8 text-[#6b7280]">
              <Printer className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma impressora cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {impressoras.map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between p-4 bg-[#1f2937] rounded-lg border border-[#374151] hover:border-[#4b5563] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="w-8 h-8 text-[#6b7280]" />
                    <div>
                      <p className="font-medium text-[#f9fafb]">
                        {imp.apelido || imp.modelo}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
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
                    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(imp.status)}`}>
                      {getStatusIcon(imp.status)}
                      {imp.status === 'ativa' ? 'Ativa' : imp.status === 'manutencao' ? 'Manutencao' : 'Inativa'}
                    </span>
                    <button
                      onClick={() => handleEditImpressora(imp)}
                      className="p-2 text-[#6b7280] hover:text-emerald-400 hover:bg-[#374151] rounded-lg transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => imp.id && handleDeleteImpressora(imp.id)}
                      className="p-2 text-[#6b7280] hover:text-red-400 hover:bg-[#374151] rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catalogo / Loja Publica */}
        <div className="bg-[#111827] rounded-xl p-6 border border-[#1f2937] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Store className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-[#f9fafb]">Catalogo Publico</h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-[#9ca3af]">
              Configure o link da sua loja para compartilhar com clientes
            </p>

            <div>
              <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                Slug da Loja
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] text-sm">
                    /loja/
                  </span>
                  <input
                    type="text"
                    value={slugLoja}
                    onChange={(e) => setSlugLoja(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="minhaloja"
                    className="w-full pl-14 pr-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
              <p className="text-xs text-[#6b7280] mt-1.5">
                Use apenas letras minusculas, numeros e hifen
              </p>
            </div>

            {slugLoja && (
              <div className="bg-[#1f2937] rounded-lg p-4 border border-[#374151]">
                <p className="text-xs text-[#9ca3af] mb-2">Link da sua loja:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-emerald-400 bg-[#0f172a] px-3 py-2 rounded-lg truncate border border-[#1f2937]">
                    {window.location.origin}/loja/{slugLoja}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/loja/${slugLoja}`);
                    }}
                    className="p-2 text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#374151] rounded-lg transition-all"
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <a
                    href={`/loja/${slugLoja}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#9ca3af] hover:text-[#f9fafb] hover:bg-[#374151] rounded-lg transition-all"
                    title="Abrir loja"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300">
                <strong>Dica:</strong> O catalogo mostra todos os produtos precificados como "Venda Direta".
                Configure tambem seu WhatsApp nos dados de contato para receber pedidos.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar/Editar Impressora */}
      {showAddImpressora && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] rounded-xl p-6 w-full max-w-md border border-[#1f2937] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[#f9fafb]">
                {editingImpressora ? 'Editar Impressora' : 'Adicionar Impressora'}
              </h3>
              <button
                onClick={() => {
                  setShowAddImpressora(false);
                  resetImpressoraForm();
                }}
                className="p-2 text-[#6b7280] hover:text-[#f9fafb] hover:bg-[#1f2937] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  Modelo *
                </label>
                <select
                  value={modeloSelecionado}
                  onChange={(e) => handleModeloChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all cursor-pointer"
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
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  Apelido (opcional)
                </label>
                <input
                  type="text"
                  value={apelidoImpressora}
                  onChange={(e) => setApelidoImpressora(e.target.value)}
                  placeholder="Ex: Impressora do quarto"
                  className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={marcaImpressora}
                    onChange={(e) => setMarcaImpressora(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                    Consumo (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={consumoKwh}
                    onChange={(e) => setConsumoKwh(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  Status
                </label>
                <div className="flex gap-2">
                  {(['ativa', 'manutencao', 'inativa'] as StatusImpressora[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatusImpressora(s)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all duration-200 ${
                        statusImpressora === s
                          ? s === 'ativa'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : s === 'manutencao'
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-red-600 border-red-600 text-white'
                          : 'bg-[#1f2937] border-[#374151] text-[#9ca3af] hover:border-[#4b5563]'
                      }`}
                    >
                      {getStatusIcon(s)}
                      {s === 'ativa' ? 'Ativa' : s === 'manutencao' ? 'Manut.' : 'Inativa'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#f9fafb] mb-1.5">
                  Notas (opcional)
                </label>
                <textarea
                  value={notasImpressora}
                  onChange={(e) => setNotasImpressora(e.target.value)}
                  rows={2}
                  placeholder="Observacoes sobre a impressora..."
                  className="w-full px-3.5 py-2.5 bg-[#1e293b] border border-[#1f2937] rounded-lg text-[#f9fafb] placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddImpressora(false);
                    resetImpressoraForm();
                  }}
                  className="flex-1 px-4 py-2.5 border border-[#374151] text-[#9ca3af] rounded-lg hover:bg-[#1f2937] hover:text-[#f9fafb] transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingImpressora ? handleUpdateImpressora : handleAddImpressora}
                  disabled={!modeloSelecionado}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#374151] disabled:text-[#6b7280] text-white rounded-lg transition-all duration-200 hover:-translate-y-0.5"
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
