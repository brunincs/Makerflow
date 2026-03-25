import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui';
import { PrecificacaoSalva, MarketplaceType } from '../../types';
import { getPrecificacoes, deletePrecificacao, createPrecificacao } from '../../services/precificacoesService';
import {
  LineChart,
  TrendingUp,
  Calendar,
  Trash2,
  ExternalLink,
  AlertCircle,
  Loader2,
  Copy,
  ImageOff,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { ShopeeIcon, MercadoLivreIcon } from '../../components/ui/MarketplaceIcons';
import { Store } from 'lucide-react';

const MARKETPLACE_INFO: Record<MarketplaceType, { nome: string; icon: React.ElementType; color: string; bgColor: string }> = {
  mercadolivre: { nome: 'Mercado Livre', icon: MercadoLivreIcon, color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  shopee: { nome: 'Shopee', icon: ShopeeIcon, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  venda_direta: { nome: 'Venda Direta', icon: Store, color: 'text-blue-600', bgColor: 'bg-blue-50' },
};

const MARKETPLACE_ORDER: MarketplaceType[] = ['mercadolivre', 'shopee', 'venda_direta'];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMargemColor(margem: number): { text: string; bg: string } {
  if (margem < 10) return { text: 'text-red-700', bg: 'bg-red-100' };
  if (margem < 20) return { text: 'text-orange-700', bg: 'bg-orange-100' };
  if (margem < 30) return { text: 'text-yellow-700', bg: 'bg-yellow-100' };
  if (margem < 40) return { text: 'text-green-700', bg: 'bg-green-100' };
  return { text: 'text-emerald-700', bg: 'bg-emerald-100' };
}

interface ProdutoAgrupado {
  key: string;
  nome: string;
  imagemUrl?: string;
  simulacoes: PrecificacaoSalva[];
}

export function Simulacoes() {
  const navigate = useNavigate();
  const [simulacoes, setSimulacoes] = useState<PrecificacaoSalva[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSimulacoes();
  }, []);

  const loadSimulacoes = async () => {
    setLoading(true);
    const data = await getPrecificacoes();
    setSimulacoes(data);
    // Expandir todos por padrão
    const keys = new Set(data.map(s => s.produto_id || s.nome_produto || 'manual'));
    setExpandedProducts(keys);
    setLoading(false);
  };

  // Agrupar simulações por produto_id (produtos do radar) ou por id individual (manuais)
  const produtosAgrupados = useMemo(() => {
    const grupos = new Map<string, ProdutoAgrupado>();

    simulacoes.forEach(sim => {
      // Se tem produto_id, agrupa pelo produto do radar
      // Se não tem, cada simulação manual é seu próprio grupo (usa o id da simulação)
      const key = sim.produto_id || `manual_${sim.id}`;

      if (!grupos.has(key)) {
        grupos.set(key, {
          key,
          nome: sim.nome_produto || 'Simulacao manual',
          imagemUrl: sim.produto?.imagem_url,
          simulacoes: []
        });
      }

      grupos.get(key)!.simulacoes.push(sim);
    });

    // Ordenar simulações dentro de cada grupo por marketplace
    grupos.forEach(grupo => {
      grupo.simulacoes.sort((a, b) => {
        const orderA = MARKETPLACE_ORDER.indexOf(a.marketplace);
        const orderB = MARKETPLACE_ORDER.indexOf(b.marketplace);
        return orderA - orderB;
      });
    });

    return Array.from(grupos.values());
  }, [simulacoes]);

  // Filtrar produtos pela pesquisa
  const produtosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return produtosAgrupados;

    const termo = searchTerm.toLowerCase().trim();
    return produtosAgrupados.filter(produto => {
      // Busca no nome do produto
      if (produto.nome.toLowerCase().includes(termo)) return true;

      // Busca nas variações
      if (produto.simulacoes.some(s => s.variacao_nome?.toLowerCase().includes(termo))) return true;

      return false;
    });
  }, [produtosAgrupados, searchTerm]);

  const toggleExpanded = (key: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta simulacao?')) return;

    setDeletingId(id);
    const success = await deletePrecificacao(id);
    if (success) {
      setSimulacoes(prev => prev.filter(s => s.id !== id));
    }
    setDeletingId(null);
  };

  const handleDuplicate = async (simulacao: PrecificacaoSalva, e: React.MouseEvent) => {
    e.stopPropagation();
    setDuplicatingId(simulacao.id!);

    const { id, created_at, produto, ...dadosParaCopiar } = simulacao;
    const novaPrecificacao = {
      ...dadosParaCopiar,
      nome_produto: simulacao.nome_produto,
    };

    const resultado = await createPrecificacao(novaPrecificacao);
    if (resultado) {
      await loadSimulacoes();
    }
    setDuplicatingId(null);
  };

  const handleOpenSimulacao = (simulacao: PrecificacaoSalva) => {
    navigate('/precificacao', {
      state: { simulacao }
    });
  };

  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <LineChart className="w-6 h-6 text-purple-400" />
            </div>
            Simulacoes
          </h1>
          <p className="text-gray-500 mt-2">
            Historico de precificacoes salvas
          </p>
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <LineChart className="w-6 h-6 text-purple-400" />
            </div>
            Simulacoes
          </h1>
          <p className="text-gray-500 mt-2">
            Historico de precificacoes salvas
          </p>
        </div>

        <button
          onClick={() => navigate('/precificacao')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
        >
          <TrendingUp className="w-4 h-4" />
          Nova simulacao
        </button>
      </div>

      {/* Barra de Pesquisa */}
      {simulacoes.length > 0 && (
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome do produto..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-600 rounded-lg bg-gray-900
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
                placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de Produtos */}
      {produtosFiltrados.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            {searchTerm ? (
              <>
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Nenhum resultado encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  Nao encontramos simulacoes para "{searchTerm}"
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Limpar pesquisa
                </button>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Nenhuma simulacao salva
                </h3>
                <p className="text-gray-500 mb-4">
                  Use a calculadora de precificacao para criar e salvar simulacoes.
                </p>
                <button
                  onClick={() => navigate('/precificacao')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Ir para Precificacao
                </button>
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {produtosFiltrados.map((produto) => {
            const isExpanded = expandedProducts.has(produto.key);

            return (
              <Card key={produto.key} className="overflow-hidden">
                {/* Header do Produto */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-800 transition-colors"
                  onClick={() => toggleExpanded(produto.key)}
                >
                  {/* Imagem */}
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden">
                    {produto.imagemUrl ? (
                      <img
                        src={produto.imagemUrl}
                        alt={produto.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Nome e Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {produto.nome}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {produto.simulacoes.length} {produto.simulacoes.length === 1 ? 'simulacao' : 'simulacoes'}
                    </p>
                  </div>

                  {/* Marketplaces resumo */}
                  <div className="flex items-center gap-2">
                    {MARKETPLACE_ORDER.map(mp => {
                      const hasMarketplace = produto.simulacoes.some(s => s.marketplace === mp);
                      if (!hasMarketplace) return null;
                      const info = MARKETPLACE_INFO[mp];
                      const Icon = info.icon;
                      return (
                        <div key={mp} className={`p-1.5 rounded ${info.bgColor}`}>
                          <Icon className={`w-4 h-4 ${info.color}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Expand Icon */}
                  <div className="text-gray-400">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Simulacoes do Produto */}
                {isExpanded && (
                  <div className="border-t border-gray-800">
                    {produto.simulacoes.map((simulacao, index) => {
                      const marketplace = MARKETPLACE_INFO[simulacao.marketplace];
                      const MarketIcon = marketplace.icon;
                      const margemColor = getMargemColor(simulacao.margem);

                      return (
                        <div
                          key={simulacao.id}
                          className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-800 transition-colors ${
                            index > 0 ? 'border-t border-gray-50' : ''
                          }`}
                        >
                          {/* Marketplace Badge */}
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${marketplace.bgColor} min-w-[140px]`}>
                            <MarketIcon className={`w-4 h-4 ${marketplace.color}`} />
                            <span className={`text-sm font-medium ${marketplace.color}`}>
                              {marketplace.nome}
                            </span>
                          </div>

                          {/* Variacao */}
                          {simulacao.variacao_nome && (
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                              {simulacao.variacao_nome}
                            </span>
                          )}

                          {/* Metricas */}
                          <div className="flex-1 flex items-center justify-end gap-6">
                            {/* Preco */}
                            <div className="text-right min-w-[120px]">
                              {simulacao.promocao_ativa && simulacao.preco_anuncio ? (
                                <>
                                  <p className="text-xs text-purple-400">Anunciar por</p>
                                  <p className="font-semibold text-purple-300">
                                    R$ {formatCurrency(simulacao.preco_anuncio)}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Vender: R$ {formatCurrency(simulacao.preco_venda)}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-xs text-gray-400">Preco</p>
                                  <p className="font-semibold text-white">
                                    R$ {formatCurrency(simulacao.preco_venda)}
                                  </p>
                                </>
                              )}
                            </div>

                            {/* Lucro */}
                            <div className="text-right min-w-[100px]">
                              <p className="text-xs text-gray-400">Lucro</p>
                              <p className={`font-semibold ${simulacao.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                R$ {formatCurrency(simulacao.lucro_liquido)}
                              </p>
                            </div>

                            {/* Margem */}
                            <div className={`text-center px-3 py-1.5 rounded-lg min-w-[80px] ${margemColor.bg}`}>
                              <p className={`text-sm font-bold ${margemColor.text}`}>
                                {simulacao.margem.toFixed(1)}%
                              </p>
                            </div>

                            {/* Data */}
                            <div className="text-right min-w-[120px]">
                              <p className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                <Calendar className="w-3 h-3" />
                                {simulacao.created_at ? formatDate(simulacao.created_at) : '-'}
                              </p>
                            </div>
                          </div>

                          {/* Acoes */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenSimulacao(simulacao);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Abrir na calculadora"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDuplicate(simulacao, e)}
                              disabled={duplicatingId === simulacao.id}
                              className="p-2 text-gray-400 hover:text-purple-400 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Duplicar simulacao"
                            >
                              {duplicatingId === simulacao.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => handleDelete(simulacao.id!, e)}
                              disabled={deletingId === simulacao.id}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Excluir simulacao"
                            >
                              {deletingId === simulacao.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Resumo */}
      {produtosFiltrados.length > 0 && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {searchTerm ? (
                <>
                  <strong className="text-white">{produtosFiltrados.length}</strong> de {produtosAgrupados.length} {produtosAgrupados.length === 1 ? 'produto' : 'produtos'}
                </>
              ) : (
                <>
                  <strong className="text-white">{produtosAgrupados.length}</strong> {produtosAgrupados.length === 1 ? 'produto' : 'produtos'} · <strong className="text-white">{simulacoes.length}</strong> {simulacoes.length === 1 ? 'simulacao' : 'simulacoes'}
                </>
              )}
            </span>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" /> Abrir
              </span>
              <span className="flex items-center gap-1">
                <Copy className="w-3 h-3" /> Duplicar
              </span>
              <span className="flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Excluir
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
