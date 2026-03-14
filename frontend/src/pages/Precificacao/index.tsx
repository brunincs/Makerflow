import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardBody } from '../../components/ui';
import { MarketplaceSelector } from '../../components/precificacao';
import { MarketplaceState, PrecificacaoSalva, ProdutoSelecionado } from '../../types';
import { getProdutoById } from '../../services/produtosService';
import { Calculator, RotateCcw, Info, ArrowLeft } from 'lucide-react';

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
          peso_filamento_g: sim.peso_filamento_g || 0,
          preco_filamento_kg: sim.preco_filamento_kg || 0,
          consumo_kwh: sim.consumo_kwh || 0,
          valor_kwh: sim.valor_kwh || 0,
          custo_embalagem: sim.custo_embalagem || 0,
          imposto_aliquota: sim.imposto_aliquota || 0,
          outros_custos: sim.outros_custos || 0,
          tempo_impressao_horas: horasInteiras,
          tempo_impressao_minutos: minutosRestantes,
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
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3">
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
