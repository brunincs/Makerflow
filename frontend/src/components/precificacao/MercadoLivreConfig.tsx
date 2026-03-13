import { MercadoLivreConfig as MercadoLivreConfigType, MercadoLivreAnuncioType, ProdutoSelecionado } from '../../types';
import { Toggle } from '../ui/Toggle';
import { DecimalInput } from '../ui/DecimalInput';
import { ProdutoSelector } from './ProdutoSelector';
import { CATEGORIAS_MERCADO_LIVRE } from '../../constants/categorias';
import { Tag, Truck, Package, Award, Zap, ChevronDown, Scale } from 'lucide-react';
import { useState } from 'react';

interface MercadoLivreConfigProps {
  value: MercadoLivreConfigType;
  onChange: (config: MercadoLivreConfigType) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  onProdutoChange: (produto: ProdutoSelecionado | null) => void;
}

const CATEGORIAS = CATEGORIAS_MERCADO_LIVRE;

export function MercadoLivreConfigComponent({ value, onChange, produtoSelecionado, onProdutoChange }: MercadoLivreConfigProps) {
  const [showCategorias, setShowCategorias] = useState(false);

  const categoriaAtual = CATEGORIAS.find(c => c.id === value.categoria_id) || CATEGORIAS[0];

  const handleAnuncioChange = (tipo: MercadoLivreAnuncioType) => {
    onChange({ ...value, tipo_anuncio: tipo });
  };

  const handleCategoriaChange = (categoriaId: string) => {
    onChange({ ...value, categoria_id: categoriaId });
    setShowCategorias(false);
  };

  const handleToggle = (field: 'frete_gratis' | 'frete_manual', checked: boolean) => {
    onChange({ ...value, [field]: checked });
  };

  const handlePesoChange = (peso: number) => {
    onChange({ ...value, peso_kg: peso });
  };

  const handleFreteValorChange = (frete: number) => {
    onChange({ ...value, frete_valor: frete });
  };

  return (
    <div className="space-y-6">
      {/* Tipo de Anuncio */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tipo de anuncio
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAnuncioChange('classico')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              value.tipo_anuncio === 'classico'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${value.tipo_anuncio === 'classico' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <Award className={`w-5 h-5 ${value.tipo_anuncio === 'classico' ? 'text-yellow-600' : 'text-gray-500'}`} />
              </div>
              <span className="font-semibold text-gray-900">Classico</span>
            </div>
            <p className="text-xs text-gray-500">9% - 14% de comissao</p>
            <p className="text-xs text-gray-400 mt-1">Dependendo da categoria</p>
          </button>

          <button
            type="button"
            onClick={() => handleAnuncioChange('premium')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              value.tipo_anuncio === 'premium'
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${value.tipo_anuncio === 'premium' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                <Zap className={`w-5 h-5 ${value.tipo_anuncio === 'premium' ? 'text-yellow-600' : 'text-gray-500'}`} />
              </div>
              <span className="font-semibold text-gray-900">Premium</span>
            </div>
            <p className="text-xs text-gray-500">14% - 19% de comissao</p>
            <p className="text-xs text-gray-400 mt-1">Maior visibilidade</p>
          </button>
        </div>
      </div>

      {/* Categoria */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Categoria do produto
        </h4>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategorias(!showCategorias)}
            className="w-full p-4 bg-white border border-gray-200 rounded-xl text-left hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{categoriaAtual.nome}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Classico: {categoriaAtual.taxa_classico}% | Premium: {categoriaAtual.taxa_premium}%
                </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCategorias ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showCategorias && (
            <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {CATEGORIAS.map((categoria) => (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => handleCategoriaChange(categoria.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    categoria.id === value.categoria_id ? 'bg-yellow-50' : ''
                  }`}
                >
                  <p className="font-medium text-gray-900">{categoria.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Classico: {categoria.taxa_classico}% | Premium: {categoria.taxa_premium}%
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Taxa Atual */}
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Taxa atual:</strong>{' '}
            {value.tipo_anuncio === 'classico' ? categoriaAtual.taxa_classico : categoriaAtual.taxa_premium}%
            ({value.tipo_anuncio === 'classico' ? 'Classico' : 'Premium'})
          </p>
        </div>
      </div>

      {/* Selecionar Produto do Radar */}
      <ProdutoSelector
        value={produtoSelecionado}
        onChange={onProdutoChange}
      />

      {/* Configuracao de Frete */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Configuracao de frete
        </h4>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-4">
          {/* Peso com embalagem */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Peso com embalagem (kg)
            </label>
            <div className="relative">
              <DecimalInput
                value={value.peso_kg}
                onChange={handlePesoChange}
                placeholder="0.35"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg shadow-sm bg-white
                  focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                kg
              </span>
            </div>
          </div>

          {/* Opcoes de frete */}
          <div className="border-t border-yellow-200 pt-4 space-y-4">
            <Toggle
              checked={value.frete_gratis}
              onChange={(checked) => handleToggle('frete_gratis', checked)}
              label="Oferecer frete gratis"
              description="O custo do frete sera descontado do seu lucro"
            />

            <Toggle
              checked={value.frete_manual}
              onChange={(checked) => handleToggle('frete_manual', checked)}
              label="Digitar frete manualmente"
              description="Informar o custo do frete em vez de calcular automaticamente"
            />

            {value.frete_manual && (
              <div className="ml-14">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custo do frete (R$)
                </label>
                <div className="relative max-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                    R$
                  </span>
                  <DecimalInput
                    value={value.frete_valor}
                    onChange={handleFreteValorChange}
                    placeholder="15.00"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white
                      focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { CATEGORIAS_MERCADO_LIVRE as CATEGORIAS };
