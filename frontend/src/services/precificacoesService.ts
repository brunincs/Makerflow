import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { PrecificacaoSalva } from '../types';

const STORAGE_KEY = 'makerflow_precificacoes';

// Local storage fallback
const getLocalPrecificacoes = (): PrecificacaoSalva[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalPrecificacoes = (precificacoes: PrecificacaoSalva[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(precificacoes));
};

export const createPrecificacao = async (
  precificacao: Omit<PrecificacaoSalva, 'id' | 'created_at'>
): Promise<PrecificacaoSalva | null> => {
  // Preparar dados para inserção (remover undefined, converter para null)
  const dadosParaSalvar = {
    produto_id: precificacao.produto_id || null,
    marketplace: precificacao.marketplace,
    preco_venda: precificacao.preco_venda,
    custo_filamento: precificacao.custo_filamento || 0,
    custo_energia: precificacao.custo_energia || 0,
    custo_embalagem: precificacao.custo_embalagem || 0,
    taxa_marketplace: precificacao.taxa_marketplace || 0,
    frete_vendedor: precificacao.frete_vendedor || 0,
    lucro_liquido: precificacao.lucro_liquido,
    margem: precificacao.margem,
    lucro_por_hora: precificacao.lucro_por_hora || 0,
    tempo_impressao: precificacao.tempo_impressao || 0,
    // Inputs para restaurar simulacao
    filamento_id: precificacao.filamento_id || null,
    peso_filamento_g: precificacao.peso_filamento_g || 0,
    preco_filamento_kg: precificacao.preco_filamento_kg || 0,
    consumo_kwh: precificacao.consumo_kwh || 0,
    valor_kwh: precificacao.valor_kwh || 0,
    peso_kg: precificacao.peso_kg || 0,
    imposto_aliquota: precificacao.imposto_aliquota || 0,
    outros_custos: precificacao.outros_custos || 0,
    embalagens_config: precificacao.embalagens_config || [],
    embalagens_ids: precificacao.embalagens_ids || [], // Legado
    acessorios_config: precificacao.acessorios_config || [],
    custo_acessorios: precificacao.custo_acessorios || 0,
    impressora_modelo: precificacao.impressora_modelo || null,
    frete_gratis: precificacao.frete_gratis || false,
    tipo_anuncio: precificacao.tipo_anuncio || null,
    categoria_id: precificacao.categoria_id || null,
    multiplas_pecas: precificacao.multiplas_pecas || false,
    quantidade_pecas: precificacao.quantidade_pecas || 1,
    // Metadata
    nome_produto: precificacao.nome_produto || null,
    variacao_nome: precificacao.variacao_nome || null,
  };

  console.log('Salvando precificacao:', dadosParaSalvar);

  if (!isSupabaseConfigured() || !supabase) {
    const nova: PrecificacaoSalva = {
      ...dadosParaSalvar,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const precificacoes = getLocalPrecificacoes();
    precificacoes.unshift(nova);
    setLocalPrecificacoes(precificacoes);

    return nova;
  }

  const user_id = await getCurrentUserId();
  // Só inclui user_id se não for null (auth desabilitada temporariamente)
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('precificacoes')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar precificação:', error);
    console.error('Código:', error.code);
    console.error('Detalhes:', error.details);
    console.error('Mensagem:', error.message);
    return null;
  }

  console.log('Precificação salva com sucesso:', data);
  return data;
};

export const getPrecificacoes = async (): Promise<PrecificacaoSalva[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalPrecificacoes();
  }

  // Buscar precificacoes
  const { data, error } = await supabase
    .from('precificacoes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar precificações:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Buscar imagens dos produtos separadamente
  const produtoIds = data
    .filter(p => p.produto_id)
    .map(p => p.produto_id);

  if (produtoIds.length > 0) {
    const { data: produtos } = await supabase
      .from('produtos_concorrentes')
      .select('id, imagem_url')
      .in('id', produtoIds);

    if (produtos) {
      const produtosMap = new Map(produtos.map(p => [p.id, p]));
      return data.map(prec => ({
        ...prec,
        produto: prec.produto_id ? produtosMap.get(prec.produto_id) || null : null
      }));
    }
  }

  return data;
};

export const getPrecificacaoPorId = async (id: string): Promise<PrecificacaoSalva | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const precificacoes = getLocalPrecificacoes();
    return precificacoes.find(p => p.id === id) || null;
  }

  const { data, error } = await supabase
    .from('precificacoes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar precificação:', error);
    return null;
  }

  return data;
};

export const getPrecificacoesPorProduto = async (produtoId: string): Promise<PrecificacaoSalva[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const precificacoes = getLocalPrecificacoes();
    return precificacoes.filter(p => p.produto_id === produtoId);
  }

  const { data, error } = await supabase
    .from('precificacoes')
    .select('*')
    .eq('produto_id', produtoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar precificações do produto:', error);
    return [];
  }

  return data || [];
};

export const updatePrecificacao = async (
  id: string,
  precificacao: Omit<PrecificacaoSalva, 'id' | 'created_at'>
): Promise<PrecificacaoSalva | null> => {
  const dadosParaAtualizar = {
    produto_id: precificacao.produto_id || null,
    marketplace: precificacao.marketplace,
    preco_venda: precificacao.preco_venda,
    custo_filamento: precificacao.custo_filamento || 0,
    custo_energia: precificacao.custo_energia || 0,
    custo_embalagem: precificacao.custo_embalagem || 0,
    taxa_marketplace: precificacao.taxa_marketplace || 0,
    frete_vendedor: precificacao.frete_vendedor || 0,
    lucro_liquido: precificacao.lucro_liquido,
    margem: precificacao.margem,
    lucro_por_hora: precificacao.lucro_por_hora || 0,
    tempo_impressao: precificacao.tempo_impressao || 0,
    filamento_id: precificacao.filamento_id || null,
    peso_filamento_g: precificacao.peso_filamento_g || 0,
    preco_filamento_kg: precificacao.preco_filamento_kg || 0,
    consumo_kwh: precificacao.consumo_kwh || 0,
    valor_kwh: precificacao.valor_kwh || 0,
    peso_kg: precificacao.peso_kg || 0,
    imposto_aliquota: precificacao.imposto_aliquota || 0,
    outros_custos: precificacao.outros_custos || 0,
    embalagens_config: precificacao.embalagens_config || [],
    embalagens_ids: precificacao.embalagens_ids || [], // Legado
    acessorios_config: precificacao.acessorios_config || [],
    custo_acessorios: precificacao.custo_acessorios || 0,
    impressora_modelo: precificacao.impressora_modelo || null,
    frete_gratis: precificacao.frete_gratis || false,
    tipo_anuncio: precificacao.tipo_anuncio || null,
    categoria_id: precificacao.categoria_id || null,
    multiplas_pecas: precificacao.multiplas_pecas || false,
    quantidade_pecas: precificacao.quantidade_pecas || 1,
    nome_produto: precificacao.nome_produto || null,
    variacao_nome: precificacao.variacao_nome || null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const precificacoes = getLocalPrecificacoes();
    const index = precificacoes.findIndex(p => p.id === id);
    if (index === -1) return null;

    const atualizada: PrecificacaoSalva = {
      ...dadosParaAtualizar,
      id,
      created_at: precificacoes[index].created_at,
    };
    precificacoes[index] = atualizada;
    setLocalPrecificacoes(precificacoes);
    return atualizada;
  }

  const { data, error } = await supabase
    .from('precificacoes')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar precificação:', error);
    return null;
  }

  return data;
};

// Buscar precificação mais recente de um produto (para obter config de acessórios)
export const getPrecificacaoByProduto = async (produtoId: string): Promise<PrecificacaoSalva | null> => {
  const precificacoes = await getPrecificacoesPorProduto(produtoId);
  return precificacoes.length > 0 ? precificacoes[0] : null;
};

export const deletePrecificacao = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const precificacoes = getLocalPrecificacoes();
    const filtered = precificacoes.filter(p => p.id !== id);
    setLocalPrecificacoes(filtered);
    return true;
  }

  const { error } = await supabase
    .from('precificacoes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar precificação:', error);
    return false;
  }

  return true;
};

// Deletar todas as precificações de um produto
export const deletePrecificacoesPorProduto = async (produtoId: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const precificacoes = getLocalPrecificacoes();
    const filtered = precificacoes.filter(p => p.produto_id !== produtoId);
    setLocalPrecificacoes(filtered);
    return true;
  }

  const { error } = await supabase
    .from('precificacoes')
    .delete()
    .eq('produto_id', produtoId);

  if (error) {
    console.error('Erro ao deletar precificações do produto:', error);
    return false;
  }

  return true;
};
