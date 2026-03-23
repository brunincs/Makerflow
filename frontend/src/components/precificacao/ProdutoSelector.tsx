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

  const filteredProdutos = produtos.filter((p) => {
    const searchLower = search.toLowerCase();
    // Busca por nome
    if (p.nome.toLowerCase().includes(searchLower)) return true;
    // Busca por SKU do produto
    if (p.sku?.toLowerCase().includes(searchLower)) return true;
    // Busca por SKU das variações
    if (p.variacoes?.some(v => v.sku?.toLowerCase().includes(searchLower))) return true;
    return false;
  });

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
      <h4 className="text-sm font-medium text-white flex items-center gap-2">
        <Package className="w-4 h-4" />
        Selecionar produto do Radar
      </h4>

      <div ref={containerRef} className="relative">
        {/* Campo de busca ou produto selecionado */}
        {value?.produto ? (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <div className="flex items-start gap-3">
              {value.produto.imagem_url ? (
                <img
                  src={value.produto.imagem_url}
                  alt={value.produto.nome}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-8 h-8 text-gray-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-semibold text-white">{value.produto.nome}</h5>
                    {value.variacao && (
                      <p className="text-sm text-purple-400 mt-0.5">
                        Variacao: {value.variacao.nome_variacao}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {value.produto.categoria_id && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {getCategoriaById(value.produto.categoria_id)?.nome || value.produto.categoria_id}
                    </span>
                  )}
                  {value.produto.peso_filamento && (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                      {value.produto.peso_filamento}g
                    </span>
                  )}
                  {value.produto.tempo_impressao && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                      {formatarTempoImpressao(value.produto.tempo_impressao)}
                    </span>
                  )}
                  {(value.variacao?.preco_shopee || value.produto.preco_shopee) && (
                    <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded flex items-center gap-1">
                      <ShopeeIcon className="w-3 h-3" />
                      {formatPrice(value.variacao?.preco_shopee || value.produto.preco_shopee)}
                    </span>
                  )}
                  {(value.variacao?.preco_mercado_livre || value.produto.preco_mercado_livre) && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded flex items-center gap-1">
                      <MercadoLivreIcon className="w-3 h-3" />
                      {formatPrice(value.variacao?.preco_mercado_livre || value.produto.preco_mercado_livre)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Seletor de variacao - só aparece se tiver variações criadas */}
            {value.produto.variacoes && value.produto.variacoes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowVariacoes(!showVariacoes)}
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    {value.variacao
                      ? `Variacao: ${value.variacao.nome_variacao}`
                      : 'Selecionar variacao'}
                  </span>
                  <span className="text-xs text-gray-500">
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
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        <span className="font-medium">{variacao.nome_variacao}</span>
                        <div className="flex gap-3 text-xs">
                          {variacao.peso_filamento && (
                            <span className="text-green-400">{variacao.peso_filamento}g</span>
                          )}
                          {variacao.tempo_impressao && (
                            <span className="text-blue-400">{formatarTempoImpressao(variacao.tempo_impressao)}</span>
                          )}
                          {variacao.preco_shopee && (
                            <span className="text-orange-400">{formatPrice(variacao.preco_shopee)}</span>
                          )}
                          {variacao.preco_mercado_livre && (
                            <span className="text-yellow-400">{formatPrice(variacao.preco_mercado_livre)}</span>
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
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl cursor-pointer hover:border-gray-600 transition-colors flex items-center gap-3"
            >
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500">Buscar por nome ou SKU...</span>
            </div>

            {/* Dropdown de busca */}
            {isOpen && (
              <div className="absolute z-20 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-lg overflow-hidden">
                <div className="p-3 border-b border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Digite nome ou SKU..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-800 transition-colors text-left"
                      >
                        {produto.imagem_url ? (
                          <img
                            src={produto.imagem_url}
                            alt={produto.nome}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{produto.nome}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {produto.sku && (
                              <span className="text-xs text-blue-400 font-medium">
                                SKU: {produto.sku}
                              </span>
                            )}
                            {produto.categoria_id && (
                              <span className="text-xs text-yellow-400 flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {getCategoriaById(produto.categoria_id)?.nome || produto.categoria_id}
                              </span>
                            )}
                            {getVariacoesCount(produto) > 0 && (
                              <span className="text-xs text-purple-400">
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
