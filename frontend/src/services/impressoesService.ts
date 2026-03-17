import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { Impressao } from '../types';
import { descontarEstoqueFilamento, devolverEstoqueFilamento } from './filamentosService';
import { adicionarEstoqueComMovimentacao, removerEstoqueComMovimentacao } from './estoqueProdutosService';

const STORAGE_KEY = 'makerflow_impressoes';

// Local storage fallback
const getLocalImpressoes = (): Impressao[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalImpressoes = (impressoes: Impressao[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(impressoes));
};

export const createImpressao = async (
  impressao: Omit<Impressao, 'id' | 'created_at' | 'peso_total_g' | 'tempo_total_min' | 'produto' | 'variacao' | 'filamento'>
): Promise<Impressao | null> => {
  const pesoTotal = impressao.peso_peca_g * impressao.quantidade;
  const tempoTotal = (impressao.tempo_peca_min || 0) * impressao.quantidade;
  const isManual = impressao.produto_id === '__MANUAL__';

  const dadosParaSalvar = {
    produto_id: isManual ? null : impressao.produto_id,
    variacao_id: impressao.variacao_id || null,
    filamento_id: impressao.filamento_id,
    impressora_id: impressao.impressora_id || null,
    quantidade: impressao.quantidade,
    peso_peca_g: impressao.peso_peca_g,
    peso_total_g: pesoTotal,
    tempo_peca_min: impressao.tempo_peca_min || null,
    tempo_total_min: tempoTotal || null,
    impressora: impressao.impressora || null, // Legado
    nome_peca_manual: isManual ? impressao.nome_peca_manual : null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: Impressao = {
      produto_id: isManual ? '__MANUAL__' : impressao.produto_id,
      variacao_id: impressao.variacao_id,
      filamento_id: impressao.filamento_id,
      impressora_id: impressao.impressora_id,
      quantidade: impressao.quantidade,
      peso_peca_g: impressao.peso_peca_g,
      peso_total_g: pesoTotal,
      tempo_peca_min: impressao.tempo_peca_min,
      tempo_total_min: tempoTotal,
      impressora: impressao.impressora,
      nome_peca_manual: isManual ? impressao.nome_peca_manual : undefined,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const impressoes = getLocalImpressoes();
    impressoes.unshift(novo);
    setLocalImpressoes(impressoes);

    // Descontar estoque do filamento
    await descontarEstoqueFilamento(impressao.filamento_id, pesoTotal);

    // Adicionar ao estoque de produtos (se nao for impressao manual)
    if (!isManual && impressao.produto_id) {
      await adicionarEstoqueComMovimentacao(
        impressao.produto_id,
        impressao.variacao_id || null,
        impressao.quantidade,
        'producao',
        `Impressao de ${impressao.quantidade} unidade(s)`
      );
    }

    return novo;
  }

  const user_id = await getCurrentUserId();
  // Só inclui user_id se não for null (auth desabilitada temporariamente)
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  console.log('Enviando para Supabase:', dadosComUserId);

  const { data, error } = await supabase
    .from('impressoes')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar impressao:', error);
    console.error('Detalhes:', error.message, error.details, error.hint);
    alert(`Erro do Supabase: ${error.message}\n\nVoce ja criou a tabela 'impressoes' no Supabase?`);
    return null;
  }

  // Descontar estoque do filamento
  await descontarEstoqueFilamento(impressao.filamento_id, pesoTotal);

  // Adicionar ao estoque de produtos (se nao for impressao manual)
  if (!isManual && impressao.produto_id) {
    await adicionarEstoqueComMovimentacao(
      impressao.produto_id,
      impressao.variacao_id || null,
      impressao.quantidade,
      'producao',
      `Impressao de ${impressao.quantidade} unidade(s)`
    );
  }

  return data;
};

export const getImpressoes = async (): Promise<Impressao[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalImpressoes();
  }

  const { data, error } = await supabase
    .from('impressoes')
    .select(`
      *,
      produto:produtos_concorrentes!left(nome, imagem_url),
      variacao:variacoes_produto(nome_variacao),
      filamento:filamentos(nome_filamento, cor, material),
      impressora_info:impressoras(modelo, apelido)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar impressoes:', error);
    return [];
  }

  return data || [];
};

export const deleteImpressao = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const impressoes = getLocalImpressoes();
    const impressao = impressoes.find(i => i.id === id);

    // Devolver filamento ao estoque
    if (impressao) {
      await devolverEstoqueFilamento(impressao.filamento_id, impressao.peso_total_g);

      // Remover do estoque de produtos (se nao for impressao manual)
      if (impressao.produto_id && impressao.produto_id !== '__MANUAL__') {
        await removerEstoqueComMovimentacao(
          impressao.produto_id,
          impressao.variacao_id || null,
          impressao.quantidade,
          'ajuste',
          'Impressao excluida'
        );
      }
    }

    const filtered = impressoes.filter(i => i.id !== id);
    setLocalImpressoes(filtered);
    return true;
  }

  // Primeiro buscar a impressão para saber quanto devolver
  const { data: impressao, error: fetchError } = await supabase
    .from('impressoes')
    .select('filamento_id, peso_total_g, produto_id, variacao_id, quantidade')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Erro ao buscar impressao:', fetchError);
    return false;
  }

  // Deletar a impressão
  const { error } = await supabase
    .from('impressoes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar impressao:', error);
    return false;
  }

  // Devolver filamento ao estoque
  if (impressao) {
    await devolverEstoqueFilamento(impressao.filamento_id, impressao.peso_total_g);

    // Remover do estoque de produtos (se nao for impressao manual)
    if (impressao.produto_id) {
      await removerEstoqueComMovimentacao(
        impressao.produto_id,
        impressao.variacao_id || null,
        impressao.quantidade,
        'ajuste',
        'Impressao excluida'
      );
    }
  }

  return true;
};
