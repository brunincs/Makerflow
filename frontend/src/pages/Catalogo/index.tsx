import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPrecificacoesVendaDiretaByUser, getLojaBySlug, CatalogoItem, LojaInfo } from '../../services/precificacoesService';
import { Package, Search, X, MessageCircle, ChevronLeft, Share2, Store, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CatalogoCardProps {
  item: CatalogoItem;
  onViewDetails: () => void;
  onPedir: () => void;
}

function CatalogoCard({ item, onViewDetails, onPedir }: CatalogoCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {/* Imagem */}
      <div className="aspect-square bg-gray-100 relative" onClick={onViewDetails}>
        {item.imagem_url ? (
          <img
            src={item.imagem_url}
            alt={item.nome_produto}
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center cursor-pointer">
            <Package className="w-16 h-16 text-gray-200" />
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Nome */}
        <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-2">
          {item.nome_produto}
        </h3>

        {/* Variacao */}
        {item.variacao_nome && (
          <p className="text-sm text-gray-500 mb-2">
            {item.variacao_nome}
          </p>
        )}

        {/* Preco */}
        <p className="text-xl font-bold text-green-600 mb-3">
          {formatPrice(item.preco_venda)}
        </p>

        {/* Botao Pedir */}
        <button
          onClick={onPedir}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors active:scale-[0.98]"
        >
          <MessageCircle className="w-4 h-4" />
          Pedir
        </button>
      </div>
    </div>
  );
}

interface DetalhesProdutoProps {
  item: CatalogoItem;
  onClose: () => void;
  onPedir: () => void;
}

function DetalhesProduto({ item, onClose, onPedir }: DetalhesProdutoProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
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
          {item.nome_produto}
        </h2>
      </div>

      {/* Conteudo */}
      <div className="pb-24">
        {/* Imagem */}
        <div className="aspect-square bg-gray-100">
          {item.imagem_url ? (
            <img
              src={item.imagem_url}
              alt={item.nome_produto}
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
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {item.nome_produto}
            </h1>
            {item.variacao_nome && (
              <p className="text-gray-500 mb-2">
                {item.variacao_nome}
              </p>
            )}
            <p className="text-3xl font-bold text-green-600">
              {formatPrice(item.preco_venda)}
            </p>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-700">
              Produto impresso em 3D com alta qualidade. Entre em contato para mais informacoes.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
        <button
          onClick={onPedir}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 text-lg font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors active:scale-[0.98]"
        >
          <MessageCircle className="w-5 h-5" />
          Pedir pelo WhatsApp
        </button>
      </div>
    </div>
  );
}

// Componente de erro - loja nao encontrada
function LojaNaoEncontrada() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Loja nao encontrada
        </h1>
        <p className="text-gray-500">
          Verifique se o link esta correto
        </p>
      </div>
    </div>
  );
}

// Componente principal do Catalogo Publico
interface CatalogoContentProps {
  slug?: string;
  isPublic?: boolean;
}

function CatalogoContent({ slug, isPublic = false }: CatalogoContentProps) {
  const { profile } = useAuth();
  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [lojaInfo, setLojaInfo] = useState<LojaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemSelecionado, setItemSelecionado] = useState<CatalogoItem | null>(null);

  useEffect(() => {
    loadData();
  }, [slug, profile]);

  const loadData = async () => {
    setLoading(true);
    setNotFound(false);

    if (isPublic && slug) {
      // Rota publica - buscar loja pelo slug
      const loja = await getLojaBySlug(slug);
      if (!loja) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLojaInfo(loja.info);
      const data = await getPrecificacoesVendaDiretaByUser(loja.userId);
      setItems(data);
    } else if (profile?.id) {
      // Rota privada - usar id do usuario logado
      setLojaInfo({
        nome: profile.nome_fantasia || profile.name || 'Minha Loja',
        whatsapp: profile.whatsapp || undefined,
        logo_url: profile.logo_url || undefined,
      });
      const data = await getPrecificacoesVendaDiretaByUser(profile.id);
      setItems(data);
    }

    setLoading(false);
  };

  // Filtrar items pela busca
  const itemsFiltrados = items.filter(item =>
    item.nome_produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.variacao_nome && item.variacao_nome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePedir = (item: CatalogoItem) => {
    const nomeProduto = item.variacao_nome
      ? `${item.nome_produto} - ${item.variacao_nome}`
      : item.nome_produto;

    const whatsapp = lojaInfo?.whatsapp || '5511999999999';
    const mensagem = encodeURIComponent(`Ola, quero esse produto: ${nomeProduto}`);
    const url = `https://wa.me/${whatsapp}?text=${mensagem}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: lojaInfo?.nome || 'Catalogo',
          url: url,
        });
      } catch {
        // Usuario cancelou ou erro
      }
    } else {
      // Fallback: copiar link
      await navigator.clipboard.writeText(url);
      alert('Link copiado!');
    }
  };

  if (notFound) {
    return <LojaNaoEncontrada />;
  }

  // Se tem item selecionado, mostrar tela de detalhes
  if (itemSelecionado) {
    return (
      <DetalhesProduto
        item={itemSelecionado}
        onClose={() => setItemSelecionado(null)}
        onPedir={() => handlePedir(itemSelecionado)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {lojaInfo?.logo_url ? (
              <img
                src={lojaInfo.logo_url}
                alt={lojaInfo.nome}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Store className="w-5 h-5 text-green-600" />
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {lojaInfo?.nome || 'Catalogo'}
            </h1>
          </div>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Compartilhar"
          >
            <Share2 className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl bg-gray-50
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
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
            <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">Carregando produtos...</p>
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhum produto encontrado' : 'Catalogo vazio'}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? `Nenhum produto corresponde a "${searchTerm}"`
                : 'Nenhum produto disponivel no momento'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-green-600 hover:text-green-700 font-medium"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <>
            {searchTerm && (
              <p className="text-sm text-gray-500 mb-4">
                {itemsFiltrados.length} {itemsFiltrados.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
              </p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {itemsFiltrados.map((item) => (
                <CatalogoCard
                  key={item.id}
                  item={item}
                  onViewDetails={() => setItemSelecionado(item)}
                  onPedir={() => handlePedir(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Aviso de configuracao (apenas na rota privada) */}
      {!isPublic && !profile?.slug_loja && items.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-lg">
          <p className="text-sm text-yellow-800">
            <strong>Dica:</strong> Configure o slug da sua loja no perfil para ter uma URL publica como{' '}
            <span className="font-mono bg-yellow-100 px-1 rounded">makerflow.vercel.app/loja/seu-nome</span>
          </p>
        </div>
      )}
    </div>
  );
}

// Componente de pagina privada (dentro do layout protegido)
export function Catalogo() {
  return <CatalogoContent isPublic={false} />;
}

// Componente de pagina publica (sem layout, sem autenticacao)
export function CatalogoPublico() {
  const { slug } = useParams<{ slug: string }>();

  return (
    <div className="min-h-screen bg-gray-50">
      <CatalogoContent slug={slug} isPublic={true} />
    </div>
  );
}
