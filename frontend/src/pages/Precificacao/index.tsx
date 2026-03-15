import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui';
import { MarketplaceSelector } from '../../components/precificacao';
import { MarketplaceState, PrecificacaoSalva, ProdutoSelecionado, Filamento } from '../../types';
import { getProdutoById } from '../../services/produtosService';
import { getFilamentos } from '../../services/filamentosService';
import { Calculator, RotateCcw, Info, ArrowLeft, AlertTriangle, RefreshCw, Lock } from 'lucide-react';

const initialMarketplaceState: MarketplaceState = {
  tipo: 'mercadolivre',
  shopee: {
    tipo_vendedor: 'cnpj',
    campanha_destaque: false,
    cupom_desconto: false,
  },
  mercadolivre: {
    tipo_anuncio: 'classico',
    categoria_id: 'casa_moveis',
    peso_kg: 0,
    frete_gratis: false,
    frete_manual: false,
  },
  venda_direta: {
    taxa_gateway: 0,
    taxa_cartao: 0,
    taxa_pix: 0,
  },
  produto_selecionado: undefined,
  custos_producao: {
    impressora_modelo: undefined,
    consumo_kwh: 0,
    valor_kwh: 0.85,
    tempo_impressao_horas: 0,
    tempo_impressao_minutos: 0,
    multiplas_pecas: false,
    quantidade_pecas: 1,
  },
  modo_precificacao: 'preco_manual',
};

interface LocationState {
  simulacao?: PrecificacaoSalva;
}

export function Precificacao() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as LocationState | null;
  const [marketplace, setMarketplace] = useState<MarketplaceState>(initialMarketplaceState);
  const [simulacaoCarregada, setSimulacaoCarregada] = useState<PrecificacaoSalva | null>(null);
  const [veioDeSimulacoes, setVeioDeSimulacoes] = useState(false);
  const [canSave, setCanSave] = useState(true); // Nova precificação pode salvar imediatamente
  const isInitialLoad = useRef(true);

  // Estado para aviso de mudança de preço do filamento
  const [filamentoMudou, setFilamentoMudou] = useState(false);
  const [precoFilamentoSalvo, setPrecoFilamentoSalvo] = useState<number>(0);
  const [precoFilamentoAtual, setPrecoFilamentoAtual] = useState<number>(0);
  const [filamentoAtual, setFilamentoAtual] = useState<Filamento | null>(null);

  // Carregar dados da simulação quando vem da página de Simulações
  useEffect(() => {
    const carregarSimulacao = async () => {
      if (!locationState?.simulacao) return;

      const sim = locationState.simulacao;
      setSimulacaoCarregada(sim);
      setVeioDeSimulacoes(true);

      // Converter tempo decimal para horas e minutos
      const horasInteiras = Math.floor(sim.tempo_impressao);
      const minutosRestantes = Math.round((sim.tempo_impressao - horasInteiras) * 60);

      // Carregar produto do radar se existir
      let produtoSelecionado: ProdutoSelecionado | undefined;
      if (sim.produto_id) {
        const produto = await getProdutoById(sim.produto_id);
        if (produto) {
          // Se tem variação, tentar encontrar pelo nome
          let variacao;
          if (sim.variacao_nome && produto.variacoes) {
            variacao = produto.variacoes.find(v => v.nome_variacao === sim.variacao_nome);
          }
          produtoSelecionado = { produto, variacao };
        }
      }

      // Verificar se o preço do filamento mudou
      if (sim.filamento_id && sim.preco_filamento_kg) {
        const filamentos = await getFilamentos();
        const filamento = filamentos.find(f => f.id === sim.filamento_id);
        if (filamento) {
          setFilamentoAtual(filamento);
          setPrecoFilamentoSalvo(sim.preco_filamento_kg);
          setPrecoFilamentoAtual(filamento.preco_por_kg);

          // Verificar se houve mudança significativa (mais de 1 centavo)
          const diferenca = Math.abs(filamento.preco_por_kg - sim.preco_filamento_kg);
          if (diferenca > 0.01) {
            setFilamentoMudou(true);
          }
        }
      }

      setMarketplace(prev => ({
        ...prev,
        tipo: sim.marketplace,
        preco_venda: sim.preco_venda,
        produto_selecionado: produtoSelecionado,
        mercadolivre: {
          ...prev.mercadolivre,
          tipo_anuncio: (sim.tipo_anuncio as 'classico' | 'premium') || 'classico',
          categoria_id: sim.categoria_id || 'casa_moveis',
          peso_kg: sim.peso_kg || 0,
          frete_gratis: sim.frete_gratis || false,
        },
        custos_producao: {
          ...prev.custos_producao,
          filamento_id: sim.filamento_id || undefined,
          peso_filamento_g: sim.peso_filamento_g || 0,
          preco_filamento_kg: sim.preco_filamento_kg || 0,
          consumo_kwh: sim.consumo_kwh || 0,
          valor_kwh: sim.valor_kwh || 0.85,
          imposto_aliquota: sim.imposto_aliquota || 0,
          outros_custos: sim.outros_custos || 0,
          embalagens_ids: sim.embalagens_ids || [],
          impressora_modelo: sim.impressora_modelo as any || undefined,
          tempo_impressao_horas: horasInteiras,
          tempo_impressao_minutos: minutosRestantes,
          multiplas_pecas: sim.multiplas_pecas || false,
          quantidade_pecas: sim.quantidade_pecas || 1,
        },
        modo_precificacao: 'preco_manual',
      }));

      // Simulação carregada: não pode salvar até fazer alterações
      setCanSave(false);

      // Limpar o state da navegação para evitar recarregar ao atualizar
      window.history.replaceState({}, document.title);
    };

    carregarSimulacao();
  }, [locationState]);

  // Detectar mudanças no formulário
  const handleMarketplaceChange = (newState: MarketplaceState) => {
    setMarketplace(newState);
    if (!isInitialLoad.current) {
      setCanSave(true); // Qualquer alteração habilita o salvamento
    }
  };

  // Após carregar simulação, permitir detecção de mudanças
  useEffect(() => {
    if (locationState?.simulacao) {
      // Aguardar o carregamento inicial antes de detectar mudanças
      const timer = setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
      return () => clearTimeout(timer);
    } else {
      isInitialLoad.current = false;
    }
  }, [locationState]);

  const handleResetForm = () => {
    setMarketplace(initialMarketplaceState);
    setSimulacaoCarregada(null);
    setCanSave(true); // Novo formulário pode salvar
    isInitialLoad.current = true;
    setTimeout(() => {
      isInitialLoad.current = false;
    }, 100);
  };

  const handleSaveSuccess = () => {
    setCanSave(false); // Após salvar, desabilita até nova alteração
  };

  // Manter o custo antigo do filamento
  const handleManterCustoAntigo = () => {
    setFilamentoMudou(false);
  };

  // Recalcular com o preço atual do filamento
  const handleRecalcularPreco = () => {
    if (filamentoAtual) {
      setMarketplace(prev => ({
        ...prev,
        custos_producao: {
          ...prev.custos_producao,
          preco_filamento_kg: filamentoAtual.preco_por_kg,
        },
      }));
      setFilamentoMudou(false);
      setCanSave(true); // Habilitar salvamento após recálculo
    }
  };

  return (
    <div>
      {/* Botao Voltar */}
      {veioDeSimulacoes && (
        <button
          onClick={() => navigate('/simulacoes')}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Voltar para Simulacoes</span>
        </button>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            Precificacao
          </h1>
          <p className="text-gray-500 mt-2">
            Calcule o preco ideal considerando todas as taxas e custos
          </p>
        </div>

        {/* Botao Reset */}
        <button
          onClick={handleResetForm}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Limpar
        </button>
      </div>

      {/* Banner de Simulacao Carregada */}
      {simulacaoCarregada && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-800">
                Simulacao carregada: {simulacaoCarregada.nome_produto || 'Simulacao manual'}
                {simulacaoCarregada.variacao_nome && ` (${simulacaoCarregada.variacao_nome})`}
              </p>
              <p className="text-xs text-purple-600">
                Modifique os valores para criar uma nova simulacao
              </p>
            </div>
            <button
              onClick={handleResetForm}
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              Limpar
            </button>
          </div>

          {/* Aviso de mudanca no preco do filamento (dentro do banner) */}
          {filamentoMudou && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">
                    O preco do filamento mudou desde esta simulacao.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-amber-700">
                      <Lock className="w-3.5 h-3.5 inline mr-1" />
                      Salvo: <strong>R$ {precoFilamentoSalvo.toFixed(2)}</strong>/kg
                    </span>
                    <span className="text-amber-700">
                      <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
                      Atual: <strong>R$ {precoFilamentoAtual.toFixed(2)}</strong>/kg
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleManterCustoAntigo}
                      className="px-3 py-1.5 text-sm bg-white border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      Manter custo antigo
                    </button>
                    <button
                      onClick={handleRecalcularPreco}
                      className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Recalcular custos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <Card>
        <CardBody className="p-6">
          <MarketplaceSelector
            value={marketplace}
            onChange={handleMarketplaceChange}
            canSave={canSave}
            onSaveSuccess={handleSaveSuccess}
            nomeProdutoCarregado={simulacaoCarregada?.nome_produto || undefined}
            simulacaoId={simulacaoCarregada?.id}
            produtoIdOriginal={simulacaoCarregada?.produto_id || undefined}
          />
        </CardBody>
      </Card>
    </div>
  );
}
