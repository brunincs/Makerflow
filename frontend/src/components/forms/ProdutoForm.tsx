import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { Button, Input, Select, ImageUpload, MarketplaceBlock, VariacoesEditor, variacoesToDB, variacoesFromDB, TempoImpressaoInput, tempoDecimalParaHorasMinutos, horasMinutosParaDecimal, STLUpload, DecimalInput } from '../ui';
import { Modelo3DIcon } from '../ui/MarketplaceIcons';
import { ProdutoConcorrente, StatusProduto } from '../../types';
import { createProduto, updateProduto, uploadImagem, uploadModelo3D } from '../../services/produtosService';
import { CATEGORIAS_MERCADO_LIVRE } from '../../constants/categorias';
import { Printer, Scale, Tag, Barcode, Ruler } from 'lucide-react';

interface VariacaoItem {
  id?: string;
  nome_variacao: string;
  sku: string;
  preco_shopee: string;
  preco_mercado_livre: string;
  peso_filamento: string;
  tempo_horas: number;
  tempo_minutos: number;
  dimensoes: string;
  herdaDoProduto?: boolean;
}

interface ProdutoFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  produto?: ProdutoConcorrente;
}

const statusOptions = [
  { value: 'teste', label: 'Teste' },
  { value: 'validado', label: 'Validado' },
  { value: 'rejeitado', label: 'Rejeitado' },
];

export function ProdutoForm({ onSuccess, onCancel, produto }: ProdutoFormProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [stlFile, setStlFile] = useState<File | null>(null);
  const [existingStlUrl, setExistingStlUrl] = useState<string | null>(null);
  const [variacoes, setVariacoes] = useState<VariacaoItem[]>([]);
  const [tempoHoras, setTempoHoras] = useState(0);
  const [tempoMinutos, setTempoMinutos] = useState(0);
  const [formData, setFormData] = useState({
    nome: '',
    sku: '',
    link_modelo: '',
    link_shopee: '',
    preco_shopee: '',
    link_mercado_livre: '',
    preco_mercado_livre: '',
    peso_filamento: '',
    dimensoes: '',
    categoria_id: '',
    status: 'teste' as StatusProduto,
  });

  const isEditing = !!produto;

  useEffect(() => {
    if (produto) {
      setFormData({
        nome: produto.nome || '',
        sku: produto.sku || '',
        link_modelo: produto.link_modelo || '',
        link_shopee: produto.link_shopee || '',
        preco_shopee: produto.preco_shopee?.toString() || '',
        link_mercado_livre: produto.link_mercado_livre || '',
        preco_mercado_livre: produto.preco_mercado_livre?.toString() || '',
        peso_filamento: produto.peso_filamento?.toString() || '',
        dimensoes: produto.dimensoes || '',
        categoria_id: produto.categoria_id || '',
        status: produto.status || 'teste',
      });
      if (produto.imagem_url) {
        setImagePreview(produto.imagem_url);
      }
      if (produto.arquivo_stl) {
        setExistingStlUrl(produto.arquivo_stl);
      }
      if (produto.variacoes) {
        setVariacoes(variacoesFromDB(produto.variacoes));
      }
      if (produto.tempo_impressao) {
        const { horas, minutos } = tempoDecimalParaHorasMinutos(produto.tempo_impressao);
        setTempoHoras(horas);
        setTempoMinutos(minutos);
      }
    }
  }, [produto]);

  // Sincronizar primeira variação com dados do produto base quando eles mudam
  useEffect(() => {
    if (variacoes.length > 0 && variacoes[0].herdaDoProduto) {
      const newVariacoes = [...variacoes];
      newVariacoes[0] = {
        ...newVariacoes[0],
        peso_filamento: formData.peso_filamento,
        tempo_horas: tempoHoras,
        tempo_minutos: tempoMinutos,
      };
      // Só atualiza se realmente mudou para evitar loop infinito
      if (
        newVariacoes[0].peso_filamento !== variacoes[0].peso_filamento ||
        newVariacoes[0].tempo_horas !== variacoes[0].tempo_horas ||
        newVariacoes[0].tempo_minutos !== variacoes[0].tempo_minutos
      ) {
        setVariacoes(newVariacoes);
      }
    }
  }, [formData.peso_filamento, tempoHoras, tempoMinutos]);

  const handleImageChange = (file: File | null, preview: string | null) => {
    setImageFile(file);
    setImagePreview(preview);
  };

  const handleStlChange = (file: File | null, _url: string | null) => {
    setStlFile(file);
    if (!file) {
      setExistingStlUrl(null);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl: string | undefined = produto?.imagem_url;
      let stlUrl: string | undefined = existingStlUrl || produto?.arquivo_stl;

      if (imageFile) {
        const url = await uploadImagem(imageFile);
        if (url) imageUrl = url;
      }

      if (stlFile) {
        const url = await uploadModelo3D(stlFile);
        if (url) stlUrl = url;
      } else if (!existingStlUrl) {
        stlUrl = undefined;
      }

      const tempoImpressao = horasMinutosParaDecimal(tempoHoras, tempoMinutos);

      const produtoData = {
        nome: formData.nome,
        sku: formData.sku || undefined,
        link_modelo: formData.link_modelo || undefined,
        link_shopee: formData.link_shopee || undefined,
        preco_shopee: formData.preco_shopee ? parseFloat(formData.preco_shopee) : undefined,
        link_mercado_livre: formData.link_mercado_livre || undefined,
        preco_mercado_livre: formData.preco_mercado_livre ? parseFloat(formData.preco_mercado_livre) : undefined,
        peso_filamento: formData.peso_filamento ? parseFloat(formData.peso_filamento) : undefined,
        tempo_impressao: tempoImpressao > 0 ? tempoImpressao : undefined,
        dimensoes: formData.dimensoes || undefined,
        categoria_id: formData.categoria_id || undefined,
        status: formData.status,
        imagem_url: imageUrl,
        arquivo_stl: stlUrl,
      };

      const variacoesData = variacoesToDB(variacoes);

      let resultado;
      if (isEditing && produto?.id) {
        resultado = await updateProduto(produto.id, produtoData, variacoesData);
      } else {
        resultado = await createProduto(produtoData, variacoesData);
      }

      if (resultado) {
        onSuccess();
      } else {
        alert('Erro ao salvar produto. Verifique o console para mais detalhes.');
      }
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      alert('Erro ao salvar produto: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Upload de Imagem Melhorado */}
      <ImageUpload
        value={imageFile}
        preview={imagePreview}
        onChange={handleImageChange}
      />

      {/* Nome do Produto */}
      <Input
        label="Nome do Produto"
        name="nome"
        value={formData.nome}
        onChange={handleChange}
        required
        placeholder="Ex: Suporte para Celular"
      />

      {/* SKU do Produto */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Barcode className="w-5 h-5 text-[#9ca3af]" />
          <h3 className="font-medium text-[#f9fafb]">SKU do Produto</h3>
          <span className="text-xs text-[#6b7280] ml-auto">Opcional</span>
        </div>
        <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-4">
          <input
            type="text"
            name="sku"
            value={formData.sku}
            onChange={handleChange}
            placeholder="Ex: GATO-001"
            className="w-full px-3 py-2 border border-[#374151] rounded-lg bg-[#1e293b] text-[#f9fafb] placeholder-[#6b7280]
              focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 uppercase"
          />
          <p className="text-xs text-[#6b7280] mt-2">
            Use o mesmo SKU configurado no Mercado Livre para importar pedidos automaticamente.
            Se o produto tiver variacoes, configure o SKU em cada variacao.
          </p>
        </div>
      </div>

      {/* Categoria do Produto */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#9ca3af]" />
          <h3 className="font-medium text-[#f9fafb]">Categoria (Mercado Livre)</h3>
          <span className="text-xs text-[#6b7280] ml-auto">Opcional</span>
        </div>
        <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-4">
          <select
            name="categoria_id"
            value={formData.categoria_id}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-[#374151] rounded-lg bg-[#1e293b] text-[#f9fafb]
              focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
          >
            <option value="">Selecione uma categoria</option>
            {CATEGORIAS_MERCADO_LIVRE.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
          <p className="text-xs text-[#6b7280] mt-2">
            A categoria sera usada automaticamente na calculadora de precificacao
          </p>
        </div>
      </div>

      {/* Link do Modelo 3D */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Modelo3DIcon className="w-5 h-5 text-[#9ca3af]" />
          <h3 className="font-medium text-[#f9fafb]">Modelo 3D</h3>
        </div>
        <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-4 space-y-4">
          <Input
            label="Link do Modelo (Makerworld, Thingiverse, etc)"
            name="link_modelo"
            value={formData.link_modelo}
            onChange={handleChange}
            placeholder="https://makerworld.com/..."
          />
          <STLUpload
            value={stlFile}
            existingUrl={existingStlUrl || undefined}
            onChange={handleStlChange}
          />
        </div>
      </div>

      {/* Dados de Producao */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Printer className="w-5 h-5 text-[#9ca3af]" />
          <h3 className="font-medium text-[#f9fafb]">Dados de Producao</h3>
          <span className="text-xs text-[#6b7280] ml-auto">(para produto base sem variacoes)</span>
        </div>

        <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-[#f9fafb] mb-2 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#9ca3af]" />
                Peso da Peca (g)
              </label>
              <div className="relative">
                <DecimalInput
                  value={formData.peso_filamento ? parseFloat(formData.peso_filamento) : undefined}
                  onChange={(val) => setFormData(prev => ({ ...prev, peso_filamento: val > 0 ? String(val) : '' }))}
                  placeholder="22.46"
                  className="w-full px-3 py-2 pr-16 border border-[#374151] rounded-lg bg-[#1e293b] text-[#f9fafb] placeholder-[#6b7280]
                    focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#6b7280]">
                  gramas
                </span>
              </div>
            </div>

            <TempoImpressaoInput
              horas={tempoHoras}
              minutos={tempoMinutos}
              onHorasChange={setTempoHoras}
              onMinutosChange={setTempoMinutos}
            />
          </div>

          {/* Dimensões */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#f9fafb] mb-2 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-[#9ca3af]" />
              Dimensoes (opcional)
            </label>
            <input
              type="text"
              name="dimensoes"
              value={formData.dimensoes}
              onChange={handleChange}
              placeholder="Ex: 10x5x3 cm"
              className="w-full px-3 py-2 border border-[#374151] rounded-lg bg-[#1e293b] text-[#f9fafb] placeholder-[#6b7280]
                focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Blocos de Marketplace */}
      <div className="space-y-3">
        <h3 className="font-medium text-[#f9fafb]">Precos Marketplace (produto base)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MarketplaceBlock
            type="shopee"
            link={formData.link_shopee}
            preco={formData.preco_shopee}
            onLinkChange={(value) => setFormData((prev) => ({ ...prev, link_shopee: value }))}
            onPrecoChange={(value) => setFormData((prev) => ({ ...prev, preco_shopee: value }))}
          />

          <MarketplaceBlock
            type="mercadolivre"
            link={formData.link_mercado_livre}
            preco={formData.preco_mercado_livre}
            onLinkChange={(value) => setFormData((prev) => ({ ...prev, link_mercado_livre: value }))}
            onPrecoChange={(value) => setFormData((prev) => ({ ...prev, preco_mercado_livre: value }))}
          />
        </div>
      </div>

      {/* Variacoes */}
      <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-4">
        <VariacoesEditor
          value={variacoes}
          onChange={setVariacoes}
          produtoBase={{
            peso_filamento: formData.peso_filamento,
            tempo_horas: tempoHoras,
            tempo_minutos: tempoMinutos,
          }}
        />
      </div>

      {/* Status */}
      <Select
        label="Status"
        name="status"
        value={formData.status}
        onChange={handleChange}
        options={statusOptions}
      />

      {/* Botoes */}
      <div className="flex gap-3 pt-4 border-t border-[#1f2937]">
        <Button type="submit" disabled={loading || !formData.nome}>
          {loading ? 'Salvando...' : isEditing ? 'Atualizar Produto' : 'Salvar Produto'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
