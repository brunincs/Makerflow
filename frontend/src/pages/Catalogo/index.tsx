import { useEffect, useState } from 'react';
import { getProdutos } from '../../services/produtosService';
import { ProdutoConcorrente, VariacaoProduto } from '../../types';
import { Package, Search, X, MessageCircle, Eye, ChevronLeft, Layers } from 'lucide-react';

// Numero de WhatsApp para pedidos (pode ser configuravel no futuro)
const WHATSAPP_NUMBER = '5511999999999'; // Substituir pelo numero real

interface CatalogoCardProps {
  produto: ProdutoConcorrente;
  onViewDetails: () => void;
  onPedir: (variacao?: VariacaoProduto) => void;
}

function CatalogoCard({ produto, onViewDetails, onPedir }: CatalogoCardProps) {
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<VariacaoProduto | undefined>(undefined);

  const hasVariacoes = produto.variacoes && produto.variacoes.length > 0;

  // Pegar preco (da variacao selecionada ou do produto)
  const getPreco = () => {
    if (variacaoSelecionada) {
      return variacaoSelecionada.preco_mercado_livre || variacaoSelecionada.preco_shopee;
    }
    return produto.preco_mercado_livre || produto.preco_shopee;
  };

  const preco = getPreco();

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handlePedir = () => {
    onPedir(variacaoSelecionada);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Imagem */}
      <div className="aspect-square bg-gray-100 relative">
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
      </div>

      <div className="p-4">
        {/* Nome */}
        <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
          {produto.nome}
        </h3>

        {/* Variacoes */}
        {hasVariacoes && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              Selecione a variacao:
            </p>
            <div className="flex flex-wrap gap-2">
              {produto.variacoes!
                .sort((a, b) => (a.peso_filamento || 0) - (b.peso_filamento || 0))
                .map((variacao) => (
                <button
                  key={variacao.id}
                  onClick={() => setVariacaoSelecionada(
                    variacaoSelecionada?.id === variacao.id ? undefined : variacao
                  )}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    variacaoSelecionada?.id === variacao.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {variacao.nome_variacao}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preco */}
        <div className="mb-4">
          {preco ? (
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(preco)}
            </p>
          ) : (
            <p className="text-sm text-gray-400 italic">Consulte o preco</p>
          )}
        </div>

        {/* Botoes */}
        <div className="flex gap-2">
          <button
            onClick={onViewDetails}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4" />
            Detalhes
          </button>
          <button
            onClick={handlePedir}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Pedir
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetalhesProdutoProps {
  produto: ProdutoConcorrente;
  onClose: () => void;
  onPedir: (variacao?: VariacaoProduto) => void;
}

function DetalhesProduto({ produto, onClose, onPedir }: DetalhesProdutoProps) {
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<VariacaoProduto | undefined>(undefined);

  const hasVariacoes = produto.variacoes && produto.variacoes.length > 0;

  const getPreco = () => {
    if (variacaoSelecionada) {
      return variacaoSelecionada.preco_mercado_livre || variacaoSelecionada.preco_shopee;
    }
    return produto.preco_mercado_livre || produto.preco_shopee;
  };

  const preco = getPreco();

  const formatPrice = (price?: number) => {
    if (!price) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handlePedir = () => {
    onPedir(variacaoSelecionada);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 z-10">
        <button
          onClick={onClose}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h2 className="font-semibold text-gray-900 truncate flex-1">
          {produto.nome}
        </h2>
      </div>

      {/* Conteudo */}
      <div className="pb-24">
        {/* Imagem */}
        <div className="aspect-square bg-gray-100">
          {produto.imagem_url ? (
            <img
              src={produto.imagem_url}
              alt={produto.nome}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-24 h-24 text-gray-200" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Nome e Preco */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {produto.nome}
            </h1>
            {preco ? (
              <p className="text-3xl font-bold text-green-600">
                {formatPrice(preco)}
              </p>
            ) : (
              <p className="text-lg text-gray-400 italic">Consulte o preco</p>
            )}
          </div>

          {/* Variacoes */}
          {hasVariacoes && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Escolha a variacao
              </p>
              <div className="flex flex-wrap gap-2">
                {produto.variacoes!
                  .sort((a, b) => (a.peso_filamento || 0) - (b.peso_filamento || 0))
                  .map((variacao) => {
                  const varPreco = variacao.preco_mercado_livre || variacao.preco_shopee;
                  return (
                    <button
                      key={variacao.id}
                      onClick={() => setVariacaoSelecionada(
                        variacaoSelecionada?.id === variacao.id ? undefined : variacao
                      )}
                      className={`px-4 py-2 rounded-xl border-2 transition-all ${
                        variacaoSelecionada?.id === variacao.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <span className="font-medium">{variacao.nome_variacao}</span>
                      {varPreco && (
                        <span className={`block text-sm ${
                          variacaoSelecionada?.id === variacao.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatPrice(varPreco)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Descricao (placeholder para futuro) */}
          {produto.link_modelo && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm text-blue-700">
                Produto impresso em 3D com alta qualidade
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer Fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
        <button
          onClick={handlePedir}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 text-lg font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors active:scale-[0.98]"
        >
          <MessageCircle className="w-5 h-5" />
          Pedir pelo WhatsApp
        </button>
      </div>
    </div>
  );
}

export function Catalogo() {
  const [produtos, setProdutos] = useState<ProdutoConcorrente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoConcorrente | null>(null);

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    setLoading(true);
    const data = await getProdutos();
    // Filtrar apenas produtos validados com preco
    const produtosComPreco = data.filter(p => {
      const temPreco = p.preco_mercado_livre || p.preco_shopee ||
        (p.variacoes && p.variacoes.some(v => v.preco_mercado_livre || v.preco_shopee));
      const isAtivo = p.status === 'validado';
      return temPreco && isAtivo;
    });
    setProdutos(produtosComPreco);
    setLoading(false);
  };

  // Filtrar produtos pela busca
  const produtosFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePedir = (produto: ProdutoConcorrente, variacao?: VariacaoProduto) => {
    const nomeProduto = variacao
      ? `${produto.nome} - ${variacao.nome_variacao}`
      : produto.nome;

    const mensagem = encodeURIComponent(`Ola, quero esse produto: ${nomeProduto}`);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensagem}`;
    window.open(url, '_blank');
  };

  const handleViewDetails = (produto: ProdutoConcorrente) => {
    setProdutoSelecionado(produto);
  };

  // Se tem produto selecionado, mostrar tela de detalhes
  if (produtoSelecionado) {
    return (
      <DetalhesProduto
        produto={produtoSelecionado}
        onClose={() => setProdutoSelecionado(null)}
        onPedir={(variacao) => handlePedir(produtoSelecionado, variacao)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-xl font-bold text-gray-900 mb-3">
          Catalogo
        </h1>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              placeholder:text-gray-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Conteudo */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Carregando produtos...</p>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponivel'}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? `Nenhum produto corresponde a "${searchTerm}"`
                : 'Em breve teremos novidades!'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <>
            {searchTerm && (
              <p className="text-sm text-gray-500 mb-4">
                {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {produtosFiltrados.map((produto) => (
                <CatalogoCard
                  key={produto.id}
                  produto={produto}
                  onViewDetails={() => handleViewDetails(produto)}
                  onPedir={(variacao) => handlePedir(produto, variacao)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
