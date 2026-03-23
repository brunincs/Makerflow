import { MercadoLivreConfig as MercadoLivreConfigType, MercadoLivreAnuncioType, ProdutoSelecionado } from '../../types';
import { Toggle } from '../ui/Toggle';
import { DecimalInput } from '../ui/DecimalInput';
import { Input } from '../ui/Input';
import { ProdutoSelector } from './ProdutoSelector';
import { CATEGORIAS_MERCADO_LIVRE } from '../../constants/categorias';
import { Tag, Truck, Package, Award, Zap, ChevronDown, Scale, Ticket } from 'lucide-react';
import { useState } from 'react';

interface MercadoLivreConfigProps {
  value: MercadoLivreConfigType;
  onChange: (config: MercadoLivreConfigType) => void;
  produtoSelecionado: ProdutoSelecionado | null;
  onProdutoChange: (produto: ProdutoSelecionado | null) => void;
  modoKit?: boolean;
}

const CATEGORIAS = CATEGORIAS_MERCADO_LIVRE;

export function MercadoLivreConfigComponent({ value, onChange, produtoSelecionado, onProdutoChange, modoKit }: MercadoLivreConfigProps) {
  const [showCategorias, setShowCategorias] = useState(false);

  const categoriaAtual = CATEGORIAS.find(c => c.id === value.categoria_id) || CATEGORIAS[0];

  const handleAnuncioChange = (tipo: MercadoLivreAnuncioType) => {
    onChange({ ...value, tipo_anuncio: tipo });
  };

  const handleCategoriaChange = (categoriaId: string) => {
    onChange({ ...value, categoria_id: categoriaId });
    setShowCategorias(false);
  };

  const handleToggle = (field: 'frete_gratis' | 'frete_manual' | 'cupom_desconto', checked: boolean) => {
    onChange({ ...value, [field]: checked });
  };

  const handlePesoChange = (peso: number) => {
    onChange({ ...value, peso_kg: peso });
  };

  const handleFreteValorChange = (frete: number) => {
    onChange({ ...value, frete_valor: frete });
  };

  const handleCupomValor = (valor: string) => {
    onChange({ ...value, valor_cupom: valor ? parseFloat(valor) : undefined });
  };

  return (
    <div className="space-y-6">
      {/* Tipo de Anuncio */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tipo de anuncio
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleAnuncioChange('classico')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              value.tipo_anuncio === 'classico'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${value.tipo_anuncio === 'classico' ? 'bg-yellow-500/20' : 'bg-gray-700'}`}>
                <Award className={`w-5 h-5 ${value.tipo_anuncio === 'classico' ? 'text-yellow-500' : 'text-gray-500'}`} />
              </div>
              <span className="font-semibold text-white">Classico</span>
            </div>
            <p className="text-xs text-gray-400">9% - 14% de comissao</p>
            <p className="text-xs text-gray-500 mt-1">Dependendo da categoria</p>
          </button>

          <button
            type="button"
            onClick={() => handleAnuncioChange('premium')}
            className={`p-4 rounded-xl border-2 transition-all text-left ${
              value.tipo_anuncio === 'premium'
                ? 'border-yellow-500 bg-yellow-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${value.tipo_anuncio === 'premium' ? 'bg-yellow-500/20' : 'bg-gray-700'}`}>
                <Zap className={`w-5 h-5 ${value.tipo_anuncio === 'premium' ? 'text-yellow-500' : 'text-gray-500'}`} />
              </div>
              <span className="font-semibold text-white">Premium</span>
            </div>
            <p className="text-xs text-gray-400">14% - 19% de comissao</p>
            <p className="text-xs text-gray-500 mt-1">Maior visibilidade</p>
          </button>
        </div>
      </div>

      {/* Categoria */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Categoria do produto
        </h4>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategorias(!showCategorias)}
            className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-left hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{categoriaAtual.nome}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Classico: {categoriaAtual.taxa_classico}% | Premium: {categoriaAtual.taxa_premium}%
                </p>
              </div>
              <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCategorias ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {showCategorias && (
            <div className="absolute z-10 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {CATEGORIAS.map((categoria) => (
                <button
                  key={categoria.id}
                  type="button"
                  onClick={() => handleCategoriaChange(categoria.id)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-800 transition-colors ${
                    categoria.id === value.categoria_id ? 'bg-yellow-500/10' : ''
                  }`}
                >
                  <p className="font-medium text-white">{categoria.nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Classico: {categoria.taxa_classico}% | Premium: {categoria.taxa_premium}%
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Taxa Atual */}
        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            <strong>Taxa atual:</strong>{' '}
            {value.tipo_anuncio === 'classico' ? categoriaAtual.taxa_classico : categoriaAtual.taxa_premium}%
            ({value.tipo_anuncio === 'classico' ? 'Classico' : 'Premium'})
          </p>
        </div>
      </div>

      {/* Selecionar Produto do Radar (esconde em modo Kit) */}
      {!modoKit && (
        <ProdutoSelector
          value={produtoSelecionado}
          onChange={onProdutoChange}
        />
      )}

      {/* Configuracao de Frete */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4" />
          Configuracao de frete
        </h4>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-4">
          {/* Peso com embalagem */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Peso com embalagem (kg)
            </label>
            <div className="relative">
              <DecimalInput
                value={value.peso_kg}
                onChange={handlePesoChange}
                placeholder="0.35"
                className="w-full px-3 py-2 pr-10 border border-gray-600 rounded-lg bg-gray-800 text-white
                  focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                kg
              </span>
            </div>
          </div>

          {/* Opcoes de frete */}
          <div className="border-t border-yellow-500/30 pt-4 space-y-4">
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
                <label className="block text-sm font-medium text-gray-300 mb-1">
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
                    className="w-full pl-9 pr-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white
                      focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cupom Proprio */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Ticket className="w-4 h-4" />
          Cupom de desconto
        </h4>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <Toggle
            checked={value.cupom_desconto || false}
            onChange={(checked) => handleToggle('cupom_desconto', checked)}
            label="Cupom de desconto proprio"
            description="Desconto bancado pelo vendedor"
          />

          {value.cupom_desconto && (
            <div className="mt-3 ml-14">
              <Input
                label="Valor do cupom (R$)"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 5.00"
                value={value.valor_cupom?.toString() || ''}
                onChange={(e) => handleCupomValor(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { CATEGORIAS_MERCADO_LIVRE as CATEGORIAS };
