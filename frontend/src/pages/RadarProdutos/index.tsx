import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Modal, Badge } from '../../components/ui';
import { ShopeeIcon, MercadoLivreIcon, Modelo3DIcon } from '../../components/ui/MarketplaceIcons';
import { ProdutoForm } from '../../components/forms';
import { getProdutos, deleteProduto } from '../../services/produtosService';
import { ProdutoConcorrente } from '../../types';
import { Plus, Trash2, Pencil, Package, AlertTriangle, Layers, Scale, Clock, Tag, Eye, X, ExternalLink, Printer, Search, Barcode } from 'lucide-react';
import { formatarTempoImpressao } from '../../components/ui';
import { getCategoriaById } from '../../constants/categorias';

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
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={onConfirm}>
              Excluir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewModal({
  isOpen,
  onClose,
  produto,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  produto: ProdutoConcorrente | null;
  onEdit: () => void;
}) {
  if (!isOpen || !produto) return null;

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const categoria = produto.categoria_id ? getCategoriaById(produto.categoria_id) : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Detalhes do Produto</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Imagem e Info Principal */}
            <div className="flex gap-6">
              {produto.imagem_url ? (
                <img
                  src={produto.imagem_url}
                  alt={produto.nome}
                  className="w-40 h-40 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-40 h-40 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <div className="flex-1">
                <div className="mb-2"><Badge variant={produto.status}>{produto.status}</Badge></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">{produto.nome}</h2>
                {produto.sku && (
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Barcode className="w-4 h-4" />
                    <span className="font-mono text-sm bg-blue-50 px-2 py-0.5 rounded">{produto.sku}</span>
                  </div>
                )}
                {categoria && (
                  <div className="flex items-center gap-2 text-yellow-700 mb-3">
                    <Tag className="w-4 h-4" />
                    <span>{categoria.nome}</span>
                    <span className="text-xs text-gray-500">
                      (Classico: {categoria.taxa_classico}% | Premium: {categoria.taxa_premium}%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Links */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Links</h4>
              <div className="flex flex-wrap gap-2">
                {produto.link_modelo && (
                  <a
                    href={produto.link_modelo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                  >
                    <Modelo3DIcon className="w-4 h-4" />
                    Modelo 3D
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {produto.link_shopee && (
                  <a
                    href={produto.link_shopee}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100"
                  >
                    <ShopeeIcon className="w-4 h-4" />
                    Shopee
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {produto.link_mercado_livre && (
                  <a
                    href={produto.link_mercado_livre}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100"
                  >
                    <MercadoLivreIcon className="w-4 h-4" />
                    Mercado Livre
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {!produto.link_modelo && !produto.link_shopee && !produto.link_mercado_livre && (
                  <span className="text-sm text-gray-400 italic">Nenhum link cadastrado</span>
                )}
              </div>
            </div>

            {/* Dados de Producao - só mostra se NÃO tiver variações */}
            {!(produto.variacoes && produto.variacoes.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700">Dados de Producao</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 mb-1">
                      <Scale className="w-4 h-4" />
                      <span className="text-sm">Peso</span>
                    </div>
                    <span className="text-lg font-bold text-green-800">
                      {produto.peso_filamento ? `${produto.peso_filamento}g` : '-'}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Tempo de Impressao</span>
                    </div>
                    <span className="text-lg font-bold text-blue-800">
                      {produto.tempo_impressao ? formatarTempoImpressao(produto.tempo_impressao) : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Precos */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Precos</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700 mb-1">
                    <ShopeeIcon className="w-4 h-4" />
                    <span className="text-sm">Shopee</span>
                  </div>
                  <span className="text-lg font-bold text-orange-800">
                    {formatPrice(produto.preco_shopee) || '-'}
                  </span>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-700 mb-1">
                    <MercadoLivreIcon className="w-4 h-4" />
                    <span className="text-sm">Mercado Livre</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-800">
                    {formatPrice(produto.preco_mercado_livre) || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Variacoes - só mostra se tiver variações criadas, ordenadas por peso */}
            {produto.variacoes && produto.variacoes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Variacoes ({produto.variacoes.length})
                </h4>
                <div className="space-y-2">
                  {[...produto.variacoes]
                    .sort((a, b) => (a.peso_filamento || 0) - (b.peso_filamento || 0))
                    .map((variacao) => (
                    <div
                      key={variacao.id}
                      className="p-3 bg-purple-50 rounded-lg"
                    >
                      <span className="font-medium text-purple-800">{variacao.nome_variacao}</span>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm">
                        {variacao.peso_filamento && (
                          <span className="flex items-center gap-1 text-green-700">
                            <Scale className="w-3.5 h-3.5" />
                            {variacao.peso_filamento}g
                          </span>
                        )}
                        {variacao.tempo_impressao && (
                          <span className="flex items-center gap-1 text-blue-700">
                            <Clock className="w-3.5 h-3.5" />
                            {formatarTempoImpressao(variacao.tempo_impressao)}
                          </span>
                        )}
                        {variacao.preco_shopee && (
                          <span className="flex items-center gap-1 text-orange-700">
                            <ShopeeIcon className="w-3.5 h-3.5" />
                            {formatPrice(variacao.preco_shopee)}
                          </span>
                        )}
                        {variacao.preco_mercado_livre && (
                          <span className="flex items-center gap-1 text-yellow-700">
                            <MercadoLivreIcon className="w-3.5 h-3.5" />
                            {formatPrice(variacao.preco_mercado_livre)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
            <Button onClick={onEdit} className="flex-1">
              <Pencil className="w-4 h-4 mr-2" />
              Editar Produto
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProdutoCard({
  produto,
  onEdit,
  onDelete,
  onView,
  onPrint,
}: {
  produto: ProdutoConcorrente;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onPrint: () => void;
}) {
  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const hasShopee = produto.link_shopee || produto.preco_shopee;
  const hasMercadoLivre = produto.link_mercado_livre || produto.preco_mercado_livre;
  const hasVariacoes = produto.variacoes && produto.variacoes.length > 0;
  const hasProducao = produto.peso_filamento || produto.tempo_impressao;

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      {/* Imagem */}
      <div className="aspect-video bg-gray-100 relative">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-200" />
          </div>
        )}

        {/* Badge de Status */}
        <div className="absolute top-3 left-3">
          <Badge variant={produto.status}>{produto.status}</Badge>
        </div>

        {/* Icones de Links */}
        <div className="absolute top-3 right-3 flex gap-1.5">
          {produto.link_modelo && (
            <a
              href={produto.link_modelo}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-lg"
              title="Abrir Modelo 3D"
            >
              <Modelo3DIcon className="w-4 h-4" />
            </a>
          )}
          {produto.link_shopee && (
            <a
              href={produto.link_shopee}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-lg"
              title="Ver na Shopee"
            >
              <ShopeeIcon className="w-4 h-4" />
            </a>
          )}
          {produto.link_mercado_livre && (
            <a
              href={produto.link_mercado_livre}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors shadow-lg"
              title="Ver no Mercado Livre"
            >
              <MercadoLivreIcon className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <CardBody className="p-4">
        {/* Nome */}
        <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
          {produto.nome}
        </h3>

        {/* SKU */}
        {produto.sku && (
          <div className="flex items-center gap-1.5 mb-2">
            <Barcode className="w-3.5 h-3.5 text-blue-600" />
            <span className="text-xs font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              {produto.sku}
            </span>
          </div>
        )}

        {/* Categoria */}
        {produto.categoria_id && (
          <div className="flex items-center gap-1.5 mb-3">
            <Tag className="w-3.5 h-3.5 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              {getCategoriaById(produto.categoria_id)?.nome || produto.categoria_id}
            </span>
          </div>
        )}

        {/* Dados de Producao - só mostra no topo se NÃO tiver variações */}
        {hasProducao && !hasVariacoes && (
          <div className="flex gap-3 mb-3">
            {produto.peso_filamento && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-lg">
                <Scale className="w-3.5 h-3.5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">
                  {produto.peso_filamento}g
                </span>
              </div>
            )}
            {produto.tempo_impressao && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-sm text-blue-700 font-medium">
                  {formatarTempoImpressao(produto.tempo_impressao)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Precos */}
        <div className="space-y-2 mb-4">
          {hasShopee && (
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2">
                <ShopeeIcon className="w-4 h-4 text-orange-600" />
                <span className="text-sm text-gray-600">Shopee</span>
              </div>
              <span className="font-semibold text-gray-900">
                {formatPrice(produto.preco_shopee) || '-'}
              </span>
            </div>
          )}

          {hasMercadoLivre && (
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MercadoLivreIcon className="w-4 h-4 text-yellow-600" />
                <span className="text-sm text-gray-600">Mercado Livre</span>
              </div>
              <span className="font-semibold text-gray-900">
                {formatPrice(produto.preco_mercado_livre) || '-'}
              </span>
            </div>
          )}

          {!hasShopee && !hasMercadoLivre && !hasVariacoes && (
            <p className="text-sm text-gray-400 italic">Nenhum preco cadastrado</p>
          )}
        </div>

        {/* Variacoes - só mostra se tiver variações criadas, ordenadas por peso */}
        {hasVariacoes && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">
                Variacoes ({produto.variacoes!.length})
              </span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {[...produto.variacoes!]
                .sort((a, b) => (a.peso_filamento || 0) - (b.peso_filamento || 0))
                .map((variacao) => (
                <div
                  key={variacao.id}
                  className="p-2 bg-purple-50 rounded-lg text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">
                      {variacao.nome_variacao}
                    </span>
                    <div className="flex items-center gap-2">
                      {variacao.preco_shopee && (
                        <span className="flex items-center gap-1 text-orange-600">
                          <ShopeeIcon className="w-3 h-3" />
                          {formatPrice(variacao.preco_shopee)}
                        </span>
                      )}
                      {variacao.preco_mercado_livre && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <MercadoLivreIcon className="w-3 h-3" />
                          {formatPrice(variacao.preco_mercado_livre)}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Peso e Tempo da variação */}
                  {(variacao.peso_filamento || variacao.tempo_impressao) && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      {variacao.peso_filamento && (
                        <span className="flex items-center gap-1">
                          <Scale className="w-3 h-3 text-green-600" />
                          {variacao.peso_filamento}g
                        </span>
                      )}
                      {variacao.tempo_impressao && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-600" />
                          {formatarTempoImpressao(variacao.tempo_impressao)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acoes */}
        <div className="flex gap-2 pt-3 border-t border-gray-100">
          <button
            onClick={onPrint}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            title="Registrar impressao"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={onView}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

export function RadarProdutos() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<ProdutoConcorrente | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; produto: ProdutoConcorrente | null }>({
    isOpen: false,
    produto: null,
  });
  const [viewingProduto, setViewingProduto] = useState<ProdutoConcorrente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar produtos pela busca
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    setLoading(true);
    const data = await getProdutos();
    setProdutos(data);
    setLoading(false);
  };

  const handleView = (produto: ProdutoConcorrente) => {
    setViewingProduto(produto);
  };

  const handleEdit = (produto: ProdutoConcorrente) => {
    setViewingProduto(null);
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
      loadProdutos();
    }
  };

  const handleSuccess = () => {
    setModalOpen(false);
    setEditingProduto(null);
    loadProdutos();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduto(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Radar de Produtos</h1>
          <p className="text-gray-500 mt-1">
            Monitore produtos da concorrencia
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto Concorrente
        </Button>
      </div>

      {/* Barra de Pesquisa */}
      {!loading && produtos.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {searchTerm && (
            <p className="text-sm text-gray-500 mt-2">
              {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </p>
          )}
        </div>
      )}

      {/* Lista de Produtos */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Carregando produtos...</p>
        </div>
      ) : produtosFiltrados.length === 0 && !searchTerm ? (
        <Card>
          <CardBody className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum produto cadastrado
            </h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Comece adicionando produtos da concorrencia para monitorar precos e tendencias
            </p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeiro Produto
            </Button>
          </CardBody>
        </Card>
      ) : produtosFiltrados.length === 0 && searchTerm ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-gray-500 mb-4">
              Nenhum produto corresponde a "{searchTerm}"
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpar busca
            </button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {produtosFiltrados.map((produto) => (
            <ProdutoCard
              key={produto.id}
              produto={produto}
              onView={() => handleView(produto)}
              onEdit={() => handleEdit(produto)}
              onDelete={() => handleDeleteClick(produto)}
              onPrint={() => handlePrint(produto)}
            />
          ))}
        </div>
      )}

      {/* Modal de Criar/Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingProduto ? 'Editar Produto' : 'Novo Produto Concorrente'}
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

      {/* Modal de Visualizacao */}
      <ViewModal
        isOpen={!!viewingProduto}
        onClose={() => setViewingProduto(null)}
        produto={viewingProduto}
        onEdit={() => viewingProduto && handleEdit(viewingProduto)}
      />
    </div>
  );
}
