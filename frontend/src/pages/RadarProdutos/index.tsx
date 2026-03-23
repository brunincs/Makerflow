import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui';
import { ShopeeIcon, MercadoLivreIcon, Modelo3DIcon } from '../../components/ui/MarketplaceIcons';
import { ProdutoForm } from '../../components/forms';
import { getProdutos, deleteProduto } from '../../services/produtosService';
import { getPrecosVendaPorProduto, PrecosProduto } from '../../services/precificacoesService';
import { ProdutoConcorrente } from '../../types';
import { Plus, Trash2, Pencil, Package, AlertTriangle, Layers, Scale, Clock, Tag, Eye, X, ExternalLink, Printer, Search, Barcode, Ruler, ChevronRight, TrendingUp } from 'lucide-react';
import { formatarTempoImpressao } from '../../components/ui';
import { getCategoriaById } from '../../constants/categorias';

// Modal de confirmação de exclusão
function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <p className="text-gray-400 mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Side Panel para detalhes do produto
function SidePanel({
  isOpen,
  onClose,
  produto,
  precos,
  onEdit,
  onPrint,
}: {
  isOpen: boolean;
  onClose: () => void;
  produto: ProdutoConcorrente | null;
  precos: PrecosProduto | null;
  onEdit: () => void;
  onPrint: () => void;
}) {
  if (!produto) return null;

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const categoria = produto.categoria_id ? getCategoriaById(produto.categoria_id) : null;
  const hasVariacoes = produto.variacoes && produto.variacoes.length > 0;

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-lg bg-gray-900 border-l border-gray-800 z-50
          transform transition-transform duration-300 ease-out overflow-hidden flex flex-col
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Detalhes do Produto</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Hero Section */}
          <div className="relative">
            {produto.imagem_url ? (
              <img
                src={produto.imagem_url}
                alt={produto.nome}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
                <Package className="w-20 h-20 text-gray-700" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Info Principal */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  produto.status === 'validado' ? 'bg-emerald-500/10 text-emerald-400' :
                  produto.status === 'teste' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {produto.status}
                </span>
                {categoria && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gray-800 text-gray-400 rounded-full">
                    <Tag className="w-3 h-3" />
                    {categoria.nome}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-white leading-tight">
                {produto.nome}
              </h1>

              {produto.sku && (
                <div className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-gray-500" />
                  <span className="font-mono text-sm text-gray-400">{produto.sku}</span>
                </div>
              )}
            </div>

            {/* Preco de Venda (Principal) */}
            {precos?.tem_precificacao && (
              <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Preco de Venda</span>
                </div>
                <span className="text-2xl font-bold text-white">
                  {precos.preco_min === precos.preco_max
                    ? formatPrice(precos.preco_min!)
                    : `${formatPrice(precos.preco_min!)} – ${formatPrice(precos.preco_max!)}`
                  }
                </span>
              </div>
            )}

            {/* Links Externos */}
            {(produto.link_modelo || produto.link_shopee || produto.link_mercado_livre) && (
              <div className="flex flex-wrap gap-2">
                {produto.link_modelo && (
                  <a
                    href={produto.link_modelo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Modelo3DIcon className="w-4 h-4" />
                    Modelo 3D
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                )}
                {produto.link_shopee && (
                  <a
                    href={produto.link_shopee}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <ShopeeIcon className="w-4 h-4" />
                    Shopee
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                )}
                {produto.link_mercado_livre && (
                  <a
                    href={produto.link_mercado_livre}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <MercadoLivreIcon className="w-4 h-4" />
                    Mercado Livre
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                )}
              </div>
            )}

            {/* Referencia de Mercado (Precos Marketplace) */}
            {(produto.preco_shopee || produto.preco_mercado_livre) && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Referencia de Mercado
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {produto.preco_shopee && (
                    <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-800">
                      <div className="flex items-center gap-2 mb-1">
                        <ShopeeIcon className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-gray-500">Shopee</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-300">
                        {formatPrice(produto.preco_shopee)}
                      </span>
                    </div>
                  )}
                  {produto.preco_mercado_livre && (
                    <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-800">
                      <div className="flex items-center gap-2 mb-1">
                        <MercadoLivreIcon className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-gray-500">Mercado Livre</span>
                      </div>
                      <span className="text-lg font-semibold text-gray-300">
                        {formatPrice(produto.preco_mercado_livre)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dados de Producao (só se não tiver variações) */}
            {!hasVariacoes && (produto.peso_filamento || produto.tempo_impressao || produto.dimensoes) && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Producao
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {produto.peso_filamento && (
                    <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-800 text-center">
                      <Scale className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                      <span className="text-lg font-bold text-white block">{produto.peso_filamento}g</span>
                      <span className="text-xs text-gray-500">Peso</span>
                    </div>
                  )}
                  {produto.tempo_impressao && (
                    <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-800 text-center">
                      <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                      <span className="text-lg font-bold text-white block">{formatarTempoImpressao(produto.tempo_impressao)}</span>
                      <span className="text-xs text-gray-500">Tempo</span>
                    </div>
                  )}
                  {produto.dimensoes && (
                    <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-800 text-center">
                      <Ruler className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
                      <span className="text-sm font-bold text-white block">{produto.dimensoes}</span>
                      <span className="text-xs text-gray-500">Dimensoes</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Variacoes */}
            {hasVariacoes && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Variacoes ({produto.variacoes!.length})
                </h3>
                <div className="space-y-2">
                  {[...produto.variacoes!]
                    .sort((a, b) => (a.peso_filamento || 0) - (b.peso_filamento || 0))
                    .map((variacao) => (
                      <div
                        key={variacao.id}
                        className="p-4 bg-gray-800/50 rounded-xl border border-gray-800"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{variacao.nome_variacao}</span>
                            {variacao.sku && (
                              <span className="font-mono text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                                {variacao.sku}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dados de produção da variação */}
                        <div className="flex flex-wrap gap-4 mb-3">
                          {variacao.peso_filamento && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Scale className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-gray-300">{variacao.peso_filamento}g</span>
                            </div>
                          )}
                          {variacao.tempo_impressao && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Clock className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-gray-300">{formatarTempoImpressao(variacao.tempo_impressao)}</span>
                            </div>
                          )}
                          {variacao.dimensoes && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <Ruler className="w-3.5 h-3.5 text-purple-400" />
                              <span className="text-gray-300">{variacao.dimensoes}</span>
                            </div>
                          )}
                        </div>

                        {/* Preços de referência da variação */}
                        {(variacao.preco_shopee || variacao.preco_mercado_livre) && (
                          <div className="flex gap-4 pt-3 border-t border-gray-700">
                            <span className="text-xs text-gray-500">Ref. Mercado:</span>
                            {variacao.preco_shopee && (
                              <div className="flex items-center gap-1">
                                <ShopeeIcon className="w-3 h-3 text-orange-400" />
                                <span className="text-sm text-gray-400">{formatPrice(variacao.preco_shopee)}</span>
                              </div>
                            )}
                            {variacao.preco_mercado_livre && (
                              <div className="flex items-center gap-1">
                                <MercadoLivreIcon className="w-3 h-3 text-yellow-400" />
                                <span className="text-sm text-gray-400">{formatPrice(variacao.preco_mercado_livre)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-800 flex gap-3">
          <button
            onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Produzir
          </button>
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar
          </button>
        </div>
      </div>
    </>
  );
}

// Card simplificado do produto
function ProdutoCard({
  produto,
  precos,
  onEdit,
  onDelete,
  onView,
  onPrint,
}: {
  produto: ProdutoConcorrente;
  precos: PrecosProduto | null;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onPrint: () => void;
}) {
  const formatPrice = (price?: number | null) => {
    if (!price) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Exibir preco de venda (da precificacao)
  const renderPreco = () => {
    if (!precos?.tem_precificacao) {
      return <span className="text-gray-500 text-sm">Sem preco</span>;
    }

    if (precos.preco_min === precos.preco_max) {
      return (
        <span className="text-xl font-bold text-emerald-400">
          {formatPrice(precos.preco_min)}
        </span>
      );
    }

    // Faixa de precos (para produtos com variacoes)
    return (
      <span className="text-lg font-bold text-emerald-400">
        {formatPrice(precos.preco_min)} <span className="text-gray-500 font-normal">–</span> {formatPrice(precos.preco_max)}
      </span>
    );
  };

  return (
    <div
      className="group relative bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden
        hover:border-gray-700 hover:shadow-2xl hover:shadow-black/20 hover:-translate-y-1
        transition-all duration-300 ease-out cursor-pointer"
      onClick={onView}
    >
      {/* Imagem */}
      <div className="aspect-square bg-gray-800 relative overflow-hidden">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-700" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent opacity-60" />

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full backdrop-blur-sm ${
            produto.status === 'validado' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
            produto.status === 'teste' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
            'bg-red-500/20 text-red-300 border border-red-500/30'
          }`}>
            {produto.status}
          </span>
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-colors"
            title="Ver detalhes"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-3 bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/20 transition-colors"
            title="Editar"
          >
            <Pencil className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onPrint(); }}
            className="p-3 bg-emerald-500/80 backdrop-blur-sm text-white rounded-xl hover:bg-emerald-500 transition-colors"
            title="Produzir"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-3 bg-red-500/20 backdrop-blur-sm text-red-300 rounded-xl hover:bg-red-500/40 transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white text-base mb-2 line-clamp-2 leading-snug">
          {produto.nome}
        </h3>

        <div className="flex items-center justify-between">
          {renderPreco()}
          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </div>
  );
}

export function RadarProdutos() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [precosMap, setPrecosMap] = useState<Map<string, PrecosProduto>>(new Map());
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoConcorrente | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; produto: ProdutoConcorrente | null }>({
    isOpen: false,
    produto: null,
  });
  const [selectedProduto, setSelectedProduto] = useState<ProdutoConcorrente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar produtos pela busca
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Carregar produtos e precos em paralelo
    const [produtosData, precosData] = await Promise.all([
      getProdutos(),
      getPrecosVendaPorProduto(),
    ]);

    setProdutos(produtosData);
    setPrecosMap(precosData);
    setLoading(false);
  };

  const handleView = (produto: ProdutoConcorrente) => {
    setSelectedProduto(produto);
  };

  const handleEdit = (produto: ProdutoConcorrente) => {
    setSelectedProduto(null);
    setEditingProduto(produto);
    setModalOpen(true);
  };

  const handlePrint = (produto: ProdutoConcorrente) => {
    navigate(`/impressoes?produto=${produto.id}`);
  };

  const handleDeleteClick = (produto: ProdutoConcorrente) => {
    setDeleteConfirm({ isOpen: true, produto });
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm.produto?.id) {
      await deleteProduto(deleteConfirm.produto.id);
      setDeleteConfirm({ isOpen: false, produto: null });
      loadData();
    }
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditingProduto(null);
    loadData();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduto(null);
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Radar de Produtos</h1>
          <p className="text-gray-500 mt-1">
            {produtos.length} {produtos.length === 1 ? 'produto' : 'produtos'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Search */}
      {!loading && produtos.length > 0 && (
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white
                placeholder:text-gray-600 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-700
                transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-3">
              {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Carregando produtos...</p>
        </div>
      ) : produtosFiltrados.length === 0 && !searchTerm ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhum produto cadastrado
          </h3>
          <p className="text-gray-500 mb-8 text-center max-w-sm">
            Comece adicionando produtos para monitorar precos e gerenciar seu catalogo
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Primeiro Produto
          </button>
        </div>
      ) : produtosFiltrados.length === 0 && searchTerm ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            Nenhum resultado
          </h3>
          <p className="text-gray-500 mb-4">
            Nenhum produto corresponde a "{searchTerm}"
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Limpar busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          {produtosFiltrados.map((produto) => (
            <ProdutoCard
              key={produto.id}
              produto={produto}
              precos={produto.id ? precosMap.get(produto.id) || null : null}
              onView={() => handleView(produto)}
              onEdit={() => handleEdit(produto)}
              onDelete={() => handleDeleteClick(produto)}
              onPrint={() => handlePrint(produto)}
            />
          ))}
        </div>
      )}

      {/* Side Panel */}
      <SidePanel
        isOpen={!!selectedProduto}
        onClose={() => setSelectedProduto(null)}
        produto={selectedProduto}
        precos={selectedProduto?.id ? precosMap.get(selectedProduto.id) || null : null}
        onEdit={() => selectedProduto && handleEdit(selectedProduto)}
        onPrint={() => selectedProduto && handlePrint(selectedProduto)}
      />

      {/* Modal de Criar/Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingProduto ? 'Editar Produto' : 'Novo Produto'}
      >
        <ProdutoForm
          onSuccess={handleSuccess}
          onCancel={handleCloseModal}
          produto={editingProduto || undefined}
        />
      </Modal>

      {/* Modal de Confirmacao de Exclusao */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, produto: null })}
        onConfirm={handleDeleteConfirm}
        title="Excluir Produto"
        message={`Tem certeza que deseja excluir "${deleteConfirm.produto?.nome}"? Esta acao nao pode ser desfeita.`}
      />
    </div>
  );
}
