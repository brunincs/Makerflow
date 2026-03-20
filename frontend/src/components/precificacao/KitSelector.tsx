import { useState, useEffect, useRef } from 'react';
import { Search, Package, X, Plus, Minus, Layers, Trash2 } from 'lucide-react';
import { ProdutoConcorrente, VariacaoProduto, KitItem } from '../../types';
import { getProdutos } from '../../services/produtosService';
import { formatarTempoImpressao } from '../ui';

interface KitSelectorProps {
  itens: KitItem[];
  onChange: (itens: KitItem[]) => void;
}

export function KitSelector({ itens, onChange }: KitSelectorProps) {
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState<ProdutoConcorrente | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProdutos();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setProdutoParaAdicionar(null);
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
    if (p.nome.toLowerCase().includes(searchLower)) return true;
    if (p.sku?.toLowerCase().includes(searchLower)) return true;
    if (p.variacoes?.some(v => v.sku?.toLowerCase().includes(searchLower))) return true;
    return false;
  });

  const handleSelectProduto = (produto: ProdutoConcorrente) => {
    if (produto.variacoes && produto.variacoes.length > 0) {
      setProdutoParaAdicionar(produto);
    } else {
      adicionarItem(produto, undefined);
    }
  };

  const handleSelectVariacao = (variacao: VariacaoProduto | null) => {
    if (produtoParaAdicionar) {
      adicionarItem(produtoParaAdicionar, variacao || undefined);
    }
  };

  const adicionarItem = (produto: ProdutoConcorrente, variacao?: VariacaoProduto) => {
    const novoItem: KitItem = {
      id: `${produto.id}-${variacao?.id || 'base'}-${Date.now()}`,
      produto,
      variacao,
      quantidade: 1,
    };
    onChange([...itens, novoItem]);
    setIsOpen(false);
    setSearch('');
    setProdutoParaAdicionar(null);
  };

  const removerItem = (id: string) => {
    onChange(itens.filter(item => item.id !== id));
  };

  const atualizarQuantidade = (id: string, quantidade: number) => {
    if (quantidade < 1) return;
    onChange(itens.map(item =>
      item.id === id ? { ...item, quantidade } : item
    ));
  };

  // Calcular totais do kit
  const totais = itens.reduce((acc, item) => {
    const peso = (item.variacao?.peso_filamento || item.produto.peso_filamento || 0) * item.quantidade;
    const tempo = (item.variacao?.tempo_impressao || item.produto.tempo_impressao || 0) * item.quantidade;
    return {
      peso: acc.peso + peso,
      tempo: acc.tempo + tempo,
      quantidade: acc.quantidade + item.quantidade,
    };
  }, { peso: 0, tempo: 0, quantidade: 0 });

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Itens do Kit
      </h4>

      {/* Lista de itens do kit */}
      {itens.length > 0 && (
        <div className="space-y-2">
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              {item.produto.imagem_url ? (
                <img
                  src={item.produto.imagem_url}
                  alt={item.produto.nome}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {item.produto.nome}
                </p>
                {item.variacao && (
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {item.variacao.nome_variacao}
                  </p>
                )}
                <div className="flex gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {(item.variacao?.peso_filamento || item.produto.peso_filamento) && (
                    <span>{(item.variacao?.peso_filamento || item.produto.peso_filamento)}g</span>
                  )}
                  {(item.variacao?.tempo_impressao || item.produto.tempo_impressao) && (
                    <span>{formatarTempoImpressao(item.variacao?.tempo_impressao || item.produto.tempo_impressao || 0)}</span>
                  )}
                </div>
              </div>

              {/* Controle de quantidade */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => atualizarQuantidade(item.id, item.quantidade - 1)}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => atualizarQuantidade(item.id, parseInt(e.target.value) || 1)}
                  className="w-10 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded text-center text-sm
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => atualizarQuantidade(item.id, item.quantidade + 1)}
                  className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 dark:border-gray-600
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Remover item */}
              <button
                type="button"
                onClick={() => removerItem(item.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Resumo do kit */}
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-indigo-900 dark:text-indigo-300">
                Total do Kit ({totais.quantidade} {totais.quantidade === 1 ? 'peca' : 'pecas'})
              </span>
              <div className="flex gap-4 text-indigo-700 dark:text-indigo-400">
                <span>{totais.peso.toFixed(0)}g</span>
                <span>{formatarTempoImpressao(totais.tempo)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botao para adicionar item */}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl
            hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10
            transition-colors flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400"
        >
          <Plus className="w-5 h-5" />
          <span>Adicionar produto ao kit</span>
        </button>

        {/* Dropdown de busca */}
        {isOpen && !produtoParaAdicionar && (
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                    focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">Carregando...</div>
              ) : filteredProdutos.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  {search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                </div>
              ) : (
                filteredProdutos.map((produto) => (
                  <button
                    key={produto.id}
                    type="button"
                    onClick={() => handleSelectProduto(produto)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    {produto.imagem_url ? (
                      <img
                        src={produto.imagem_url}
                        alt={produto.nome}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-gray-300 dark:text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">{produto.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {produto.variacoes && produto.variacoes.length > 0 && (
                          <span className="text-purple-600 dark:text-purple-400">
                            {produto.variacoes.length} {produto.variacoes.length === 1 ? 'variacao' : 'variacoes'}
                          </span>
                        )}
                        {produto.peso_filamento && <span>{produto.peso_filamento}g</span>}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Seletor de variacao */}
        {isOpen && produtoParaAdicionar && (
          <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Selecionar variacao de {produtoParaAdicionar.nome}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setProdutoParaAdicionar(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto p-2 space-y-1">
              {/* Opcao sem variacao (produto base) */}
              <button
                type="button"
                onClick={() => handleSelectVariacao(null)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-left transition-colors"
              >
                <span className="font-medium text-gray-700 dark:text-gray-300">Produto base (sem variacao)</span>
                <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {produtoParaAdicionar.peso_filamento && <span>{produtoParaAdicionar.peso_filamento}g</span>}
                  {produtoParaAdicionar.tempo_impressao && (
                    <span>{formatarTempoImpressao(produtoParaAdicionar.tempo_impressao)}</span>
                  )}
                </div>
              </button>

              {/* Variacoes */}
              {produtoParaAdicionar.variacoes?.map((variacao) => (
                <button
                  key={variacao.id}
                  type="button"
                  onClick={() => handleSelectVariacao(variacao)}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-left transition-colors"
                >
                  <span className="font-medium text-purple-700 dark:text-purple-300">{variacao.nome_variacao}</span>
                  <div className="flex gap-3 text-xs text-purple-600 dark:text-purple-400">
                    {variacao.peso_filamento && <span>{variacao.peso_filamento}g</span>}
                    {variacao.tempo_impressao && <span>{formatarTempoImpressao(variacao.tempo_impressao)}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
