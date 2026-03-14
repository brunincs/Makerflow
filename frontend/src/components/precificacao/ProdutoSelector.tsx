import { useState, useEffect, useRef } from 'react';
import { Search, Package, X, ChevronDown, Layers, Tag } from 'lucide-react';
import { ProdutoConcorrente, VariacaoProduto, ProdutoSelecionado } from '../../types';
import { getProdutos } from '../../services/produtosService';
import { formatarTempoImpressao } from '../ui';
import { ShopeeIcon, MercadoLivreIcon } from '../ui/MarketplaceIcons';
import { getCategoriaById } from '../../constants/categorias';

interface ProdutoSelectorProps {
  value: ProdutoSelecionado | null;
  onChange: (value: ProdutoSelecionado | null) => void;
}

export function ProdutoSelector({ value, onChange }: ProdutoSelectorProps) {
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showVariacoes, setShowVariacoes] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProdutos();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProdutos = async () => {
    setLoading(true);
    const data = await getProdutos();
    setProdutos(data);
    setLoading(false);
  };

  const filteredProdutos = produtos.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectProduto = (produto: ProdutoConcorrente) => {
    onChange({ produto, variacao: undefined });
    // Só abre seletor de variações se existirem variações criadas
    if (produto.variacoes && produto.variacoes.length > 0) {
      setShowVariacoes(true);
    }
    setIsOpen(false);
    setSearch('');
  };

  const handleSelectVariacao = (variacao: VariacaoProduto | null) => {
    if (value?.produto) {
      // variacao = null significa "Padrão" (usa dados do produto)
      onChange({ produto: value.produto, variacao: variacao || undefined });
    }
    setShowVariacoes(false);
  };

  // Retorna quantidade de variações criadas pelo usuário
  const getVariacoesCount = (produto: ProdutoConcorrente) => {
    return produto.variacoes?.length || 0;
  };

  const handleClear = () => {
    onChange(null);
    setShowVariacoes(false);
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
        <Package className="w-4 h-4" />
        Selecionar produto do Radar
      </h4>

      <div ref={containerRef} className="relative">
        {/* Campo de busca ou produto selecionado */}
        {value?.produto ? (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              {value.produto.imagem_url ? (
                <img
                  src={value.produto.imagem_url}
                  alt={value.produto.nome}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-semibold text-gray-900">{value.produto.nome}</h5>
                    {value.variacao && (
                      <p className="text-sm text-purple-600 mt-0.5">
                        Variacao: {value.variacao.nome_variacao}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {value.produto.categoria_id && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {getCategoriaById(value.produto.categoria_id)?.nome || value.produto.categoria_id}
                    </span>
                  )}
                  {value.produto.peso_filamento && (
                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                      {value.produto.peso_filamento}g
                    </span>
                  )}
                  {value.produto.tempo_impressao && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {formatarTempoImpressao(value.produto.tempo_impressao)}
                    </span>
                  )}
                  {(value.variacao?.preco_shopee || value.produto.preco_shopee) && (
                    <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded flex items-center gap-1">
                      <ShopeeIcon className="w-3 h-3" />
                      {formatPrice(value.variacao?.preco_shopee || value.produto.preco_shopee)}
                    </span>
                  )}
                  {(value.variacao?.preco_mercado_livre || value.produto.preco_mercado_livre) && (
                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded flex items-center gap-1">
                      <MercadoLivreIcon className="w-3 h-3" />
                      {formatPrice(value.variacao?.preco_mercado_livre || value.produto.preco_mercado_livre)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Seletor de variacao - só aparece se tiver variações criadas */}
            {value.produto.variacoes && value.produto.variacoes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowVariacoes(!showVariacoes)}
                  className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    {value.variacao
                      ? `Variacao: ${value.variacao.nome_variacao}`
                      : 'Selecionar variacao'}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({getVariacoesCount(value.produto)} {getVariacoesCount(value.produto) === 1 ? 'variacao' : 'variacoes'})
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showVariacoes ? 'rotate-180' : ''}`} />
                </button>

                {showVariacoes && (
                  <div className="mt-2 space-y-1">
                    {/* Variações criadas - ordenadas por peso */}
                    {[...value.produto.variacoes]
                      .sort((a, b) => (a.peso_filamento || 0) - (b.peso_filamento || 0))
                      .map((variacao) => (
                      <button
                        key={variacao.id}
                        type="button"
                        onClick={() => handleSelectVariacao(variacao)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-colors ${
                          value.variacao?.id === variacao.id
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span className="font-medium">{variacao.nome_variacao}</span>
                        <div className="flex gap-3 text-xs">
                          {variacao.peso_filamento && (
                            <span className="text-green-600">{variacao.peso_filamento}g</span>
                          )}
                          {variacao.tempo_impressao && (
                            <span className="text-blue-600">{formatarTempoImpressao(variacao.tempo_impressao)}</span>
                          )}
                          {variacao.preco_shopee && (
                            <span className="text-orange-600">{formatPrice(variacao.preco_shopee)}</span>
                          )}
                          {variacao.preco_mercado_livre && (
                            <span className="text-yellow-600">{formatPrice(variacao.preco_mercado_livre)}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            <div
              onClick={() => setIsOpen(true)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors flex items-center gap-3"
            >
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">Buscar produto cadastrado...</span>
            </div>

            {/* Dropdown de busca */}
            {isOpen && (
              <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Digite para buscar..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">Carregando...</div>
                  ) : filteredProdutos.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                    </div>
                  ) : (
                    filteredProdutos.map((produto) => (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => handleSelectProduto(produto)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                      >
                        {produto.imagem_url ? (
                          <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{produto.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {produto.categoria_id && (
                              <span className="text-xs text-yellow-700 flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {getCategoriaById(produto.categoria_id)?.nome || produto.categoria_id}
                              </span>
                            )}
                            {getVariacoesCount(produto) > 0 && (
                              <span className="text-xs text-purple-600">
                                {getVariacoesCount(produto)} {getVariacoesCount(produto) === 1 ? 'variacao' : 'variacoes'}
                              </span>
                            )}
                            {produto.peso_filamento && (
                              <span className="text-xs text-gray-500">{produto.peso_filamento}g</span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
