import { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, Button } from '../../components/ui';
import { ProdutoConcorrente, VariacaoProduto, FormaPagamento, VendaManual } from '../../types';
import { searchProdutos, getProdutoBySku } from '../../services/produtosService';
import { createVendaManual, getVendasManuais } from '../../services/vendasManuaisService';
import { createPedido } from '../../services/pedidosService';
import {
  Store, Search, Package, Clock, Scale, DollarSign, CreditCard,
  Banknote, Smartphone, ShoppingCart, Send, Check, X, History
} from 'lucide-react';

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string; icon: typeof CreditCard }[] = [
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'cartao_credito', label: 'Cartao Credito', icon: CreditCard },
  { value: 'cartao_debito', label: 'Cartao Debito', icon: CreditCard },
  { value: 'outro', label: 'Outro', icon: DollarSign },
];

export function VendaDireta() {
  // Estados de busca
  const [termoBusca, setTermoBusca] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState<ProdutoConcorrente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  // Estados do produto selecionado
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoConcorrente | null>(null);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<VariacaoProduto | null>(null);

  // Estados da venda
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [observacao, setObservacao] = useState('');
  const [enviarParaProducao, setEnviarParaProducao] = useState(true);

  // Estados de UI
  const [salvando, setSalvando] = useState(false);
  const [vendaCriada, setVendaCriada] = useState<VendaManual | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Historico de vendas
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [historicoVendas, setHistoricoVendas] = useState<VendaManual[]>([]);

  // Busca com debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (termoBusca.length >= 2) {
        setBuscando(true);
        const resultados = await searchProdutos(termoBusca);
        setResultadosBusca(resultados);
        setMostrarResultados(true);
        setBuscando(false);
      } else {
        setResultadosBusca([]);
        setMostrarResultados(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [termoBusca]);

  // Carregar historico
  const carregarHistorico = useCallback(async () => {
    const vendas = await getVendasManuais();
    setHistoricoVendas(vendas.slice(0, 10)); // Ultimas 10 vendas
  }, []);

  useEffect(() => {
    if (mostrarHistorico) {
      carregarHistorico();
    }
  }, [mostrarHistorico, carregarHistorico]);

  // Buscar por SKU direto (Enter)
  const handleBuscarSku = async () => {
    if (!termoBusca.trim()) return;

    setBuscando(true);
    setErro(null);

    const resultado = await getProdutoBySku(termoBusca.trim());

    if (resultado) {
      selecionarProduto(resultado.produto, resultado.variacao || null);
      setTermoBusca('');
      setMostrarResultados(false);
    } else {
      setErro(`SKU "${termoBusca}" nao encontrado`);
    }

    setBuscando(false);
  };

  // Selecionar produto
  const selecionarProduto = (produto: ProdutoConcorrente, variacao: VariacaoProduto | null = null) => {
    setProdutoSelecionado(produto);
    setVariacaoSelecionada(variacao);
    setTermoBusca('');
    setMostrarResultados(false);
    setErro(null);
    setVendaCriada(null);

    // Preencher preco automaticamente
    if (variacao?.preco_mercado_livre) {
      setPrecoUnitario(variacao.preco_mercado_livre);
    } else if (variacao?.preco_shopee) {
      setPrecoUnitario(variacao.preco_shopee);
    } else if (produto.preco_mercado_livre) {
      setPrecoUnitario(produto.preco_mercado_livre);
    } else if (produto.preco_shopee) {
      setPrecoUnitario(produto.preco_shopee);
    }
  };

  // Calculos
  const pesoUnitario = variacaoSelecionada?.peso_filamento || produtoSelecionado?.peso_filamento || 0;
  const tempoUnitario = variacaoSelecionada?.tempo_impressao || produtoSelecionado?.tempo_impressao || 0;
  const pesoTotal = pesoUnitario * quantidade;
  const tempoTotal = tempoUnitario * quantidade;
  const precoTotal = precoUnitario * quantidade;

  // Formatar tempo
  const formatarTempo = (decimal: number) => {
    const horas = Math.floor(decimal);
    const minutos = Math.round((decimal - horas) * 60);
    if (horas === 0) return `${minutos}min`;
    if (minutos === 0) return `${horas}h`;
    return `${horas}h ${minutos}min`;
  };

  // Criar venda
  const handleCriarVenda = async () => {
    if (!produtoSelecionado) return;

    setSalvando(true);
    setErro(null);

    try {
      // Criar venda manual
      const venda = await createVendaManual({
        produto_id: produtoSelecionado.id,
        variacao_id: variacaoSelecionada?.id || null,
        quantidade,
        preco_unitario: precoUnitario,
        preco_total: precoTotal,
        forma_pagamento: formaPagamento,
        observacao: observacao || undefined,
        enviado_producao: enviarParaProducao,
      });

      if (!venda) {
        throw new Error('Erro ao criar venda');
      }

      // Se deve enviar para producao, criar pedido
      if (enviarParaProducao) {
        const pedido = await createPedido({
          produto_id: produtoSelecionado.id!,
          variacao_id: variacaoSelecionada?.id || null,
          quantidade,
          quantidade_produzida: 0,
          status: 'pendente',
          observacao: `Venda direta - ${FORMAS_PAGAMENTO.find(f => f.value === formaPagamento)?.label}`,
        });

        if (pedido) {
          // Atualizar venda com pedido_id
          // (opcional - pode ser feito depois se necessario)
        }
      }

      setVendaCriada(venda);

      // Limpar formulario apos sucesso
      setTimeout(() => {
        setProdutoSelecionado(null);
        setVariacaoSelecionada(null);
        setQuantidade(1);
        setPrecoUnitario(0);
        setObservacao('');
      }, 3000);

    } catch (error) {
      console.error('Erro ao criar venda:', error);
      setErro('Erro ao criar venda. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  // Limpar selecao
  const handleLimpar = () => {
    setProdutoSelecionado(null);
    setVariacaoSelecionada(null);
    setQuantidade(1);
    setPrecoUnitario(0);
    setObservacao('');
    setVendaCriada(null);
    setErro(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
            Venda Direta
          </h1>
          <p className="text-gray-500 mt-2">
            Registre vendas e envie direto para producao
          </p>
        </div>

        <button
          onClick={() => setMostrarHistorico(!mostrarHistorico)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            mostrarHistorico
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <History className="w-4 h-4" />
          Historico
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Busca de Produto */}
          <Card>
            <CardBody className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-blue-600" />
                Buscar Produto
              </h3>

              <div className="relative">
                <input
                  type="text"
                  value={termoBusca}
                  onChange={(e) => setTermoBusca(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscarSku()}
                  placeholder="Digite o nome ou SKU do produto..."
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

                {buscando && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Pressione Enter para buscar por SKU exato ou aguarde para buscar por nome
              </p>

              {/* Resultados da Busca */}
              {mostrarResultados && resultadosBusca.length > 0 && (
                <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  {resultadosBusca.map((produto) => (
                    <div key={produto.id}>
                      {/* Produto sem variações ou clique no produto principal */}
                      <button
                        onClick={() => selecionarProduto(produto, null)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 text-left"
                      >
                        {produto.imagem_url ? (
                          <img src={produto.imagem_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{produto.nome}</p>
                          <p className="text-sm text-gray-500">
                            {produto.sku && <span className="text-blue-600">SKU: {produto.sku}</span>}
                            {produto.peso_filamento && <span className="ml-2">{produto.peso_filamento}g</span>}
                          </p>
                        </div>
                        {(produto.preco_mercado_livre || produto.preco_shopee) && (
                          <span className="text-green-600 font-medium">
                            R$ {(produto.preco_mercado_livre || produto.preco_shopee)?.toFixed(2)}
                          </span>
                        )}
                      </button>

                      {/* Variações */}
                      {produto.variacoes && produto.variacoes.length > 0 && (
                        <div className="bg-gray-50">
                          {produto.variacoes.map((variacao) => (
                            <button
                              key={variacao.id}
                              onClick={() => selecionarProduto(produto, variacao)}
                              className="w-full px-4 py-2 pl-16 flex items-center gap-3 hover:bg-gray-100 text-left border-b border-gray-100"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700">{variacao.nome_variacao}</p>
                                {variacao.sku && (
                                  <p className="text-xs text-blue-600">SKU: {variacao.sku}</p>
                                )}
                              </div>
                              {(variacao.preco_mercado_livre || variacao.preco_shopee) && (
                                <span className="text-sm text-green-600 font-medium">
                                  R$ {(variacao.preco_mercado_livre || variacao.preco_shopee)?.toFixed(2)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {mostrarResultados && resultadosBusca.length === 0 && !buscando && termoBusca.length >= 2 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl text-center text-gray-500">
                  Nenhum produto encontrado
                </div>
              )}

              {erro && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
                  <X className="w-5 h-5" />
                  {erro}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Produto Selecionado */}
          {produtoSelecionado && (
            <Card>
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="w-5 h-5 text-green-600" />
                    Produto Selecionado
                  </h3>
                  <button
                    onClick={handleLimpar}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-start gap-4 mb-6">
                  {produtoSelecionado.imagem_url ? (
                    <img
                      src={produtoSelecionado.imagem_url}
                      alt=""
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center">
                      <Package className="w-10 h-10 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-gray-900">{produtoSelecionado.nome}</h4>
                    {variacaoSelecionada && (
                      <p className="text-sm text-purple-600 font-medium">
                        {variacaoSelecionada.nome_variacao}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {pesoUnitario > 0 && (
                        <span className="flex items-center gap-1">
                          <Scale className="w-4 h-4" />
                          {pesoUnitario}g
                        </span>
                      )}
                      {tempoUnitario > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatarTempo(tempoUnitario)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantidade e Preco */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantidade}
                      onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preco Unitario (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {FORMAS_PAGAMENTO.map((forma) => {
                      const Icon = forma.icon;
                      const isSelected = formaPagamento === forma.value;
                      return (
                        <button
                          key={forma.value}
                          type="button"
                          onClick={() => setFormaPagamento(forma.value)}
                          className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center justify-center gap-2 text-sm ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {forma.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Observacao */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observacao (opcional)
                  </label>
                  <input
                    type="text"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Ex: Cliente Instagram, Entrega em maos..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg
                      focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Enviar para Producao */}
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enviarParaProducao}
                      onChange={(e) => setEnviarParaProducao(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Enviar para Fila de Producao</span>
                      <p className="text-sm text-gray-500">
                        Cria um pedido automaticamente na fila de producao
                      </p>
                    </div>
                  </label>
                </div>

                {/* Botao de Criar Venda */}
                <Button
                  onClick={handleCriarVenda}
                  disabled={salvando || !precoUnitario}
                  className="w-full"
                >
                  {salvando ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Salvando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      {enviarParaProducao ? 'Criar Venda e Enviar para Producao' : 'Registrar Venda'}
                    </span>
                  )}
                </Button>
              </CardBody>
            </Card>
          )}

          {/* Confirmacao de Venda Criada */}
          {vendaCriada && (
            <Card className="border-green-200 bg-green-50">
              <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">Venda Registrada!</h3>
                    <p className="text-sm text-green-700">
                      {enviarParaProducao ? 'Pedido enviado para a fila de producao' : 'Venda registrada com sucesso'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Coluna Lateral - Resumo */}
        <div className="space-y-6">
          {/* Card de Resumo */}
          {produtoSelecionado && (
            <Card className="sticky top-6">
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-purple-600" />
                  Resumo da Venda
                </h3>

                <div className="space-y-4">
                  {/* Produto */}
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500">Produto</p>
                    <p className="font-medium text-gray-900">{produtoSelecionado.nome}</p>
                    {variacaoSelecionada && (
                      <p className="text-sm text-purple-600">{variacaoSelecionada.nome_variacao}</p>
                    )}
                  </div>

                  {/* Quantidade */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Quantidade</span>
                    <span className="font-semibold text-gray-900">{quantidade} un</span>
                  </div>

                  {/* Peso Total */}
                  {pesoTotal > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Scale className="w-4 h-4" />
                        Filamento Total
                      </span>
                      <span className="font-semibold text-gray-900">{pesoTotal}g</span>
                    </div>
                  )}

                  {/* Tempo Total */}
                  {tempoTotal > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Tempo Total
                      </span>
                      <span className="font-semibold text-gray-900">{formatarTempo(tempoTotal)}</span>
                    </div>
                  )}

                  {/* Preco Unitario */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Preco Unitario</span>
                    <span className="text-gray-900">R$ {precoUnitario.toFixed(2)}</span>
                  </div>

                  {/* Preco Total */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-green-600">
                        R$ {precoTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Forma de Pagamento */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-gray-600">
                      {(() => {
                        const forma = FORMAS_PAGAMENTO.find(f => f.value === formaPagamento);
                        const Icon = forma?.icon || CreditCard;
                        return (
                          <>
                            <Icon className="w-4 h-4" />
                            <span>{forma?.label}</span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Historico de Vendas */}
          {mostrarHistorico && (
            <Card>
              <CardBody className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-600" />
                  Ultimas Vendas
                </h3>

                {historicoVendas.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhuma venda registrada</p>
                ) : (
                  <div className="space-y-3">
                    {historicoVendas.map((venda) => (
                      <div
                        key={venda.id}
                        className="p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {venda.produto?.nome || 'Produto removido'}
                            </p>
                            {venda.variacao?.nome_variacao && (
                              <p className="text-xs text-purple-600">{venda.variacao.nome_variacao}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {venda.quantidade}x - {FORMAS_PAGAMENTO.find(f => f.value === venda.forma_pagamento)?.label}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              R$ {venda.preco_total.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(venda.created_at!).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
