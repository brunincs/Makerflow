import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { Embalagem } from '../types';

const STORAGE_KEY = 'makerflow_embalagens';
const STORAGE_KEY_MOV = 'makerflow_embalagens_movimentacoes';

// Tipo para movimentação de embalagem
export interface EmbalagemMovimentacao {
  id: string;
  user_id?: string;
  embalagem_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  motivo?: string;
  created_at: string;
  embalagem?: {
    nome_embalagem: string;
    tipo: string;
  };
}

// Local storage para movimentações
const getLocalMovimentacoes = (): EmbalagemMovimentacao[] => {
  const data = localStorage.getItem(STORAGE_KEY_MOV);
  return data ? JSON.parse(data) : [];
};

const setLocalMovimentacoes = (movs: EmbalagemMovimentacao[]): void => {
  localStorage.setItem(STORAGE_KEY_MOV, JSON.stringify(movs));
};

// Local storage fallback
const getLocalEmbalagens = (): Embalagem[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalEmbalagens = (embalagens: Embalagem[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(embalagens));
};

export const createEmbalagem = async (
  embalagem: Omit<Embalagem, 'id' | 'created_at'>
): Promise<Embalagem | null> => {
  const dadosParaSalvar = {
    tipo: embalagem.tipo,
    nome_embalagem: embalagem.nome_embalagem,
    tamanho: embalagem.tamanho || undefined,
    quantidade: embalagem.quantidade || 0,
    preco_unitario: embalagem.preco_unitario,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: Embalagem = {
      ...dadosParaSalvar,
      quantidade: dadosParaSalvar.quantidade,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const embalagens = getLocalEmbalagens();
    embalagens.unshift(novo);
    setLocalEmbalagens(embalagens);

    return novo;
  }

  const user_id = await getCurrentUserId();
  // Só inclui user_id se não for null (auth desabilitada temporariamente)
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('embalagens')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar embalagem:', error);
    return null;
  }

  return data;
};

export const getEmbalagens = async (): Promise<Embalagem[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalEmbalagens();
  }

  const { data, error } = await supabase
    .from('embalagens')
    .select('*')
    .order('tipo', { ascending: true })
    .order('nome_embalagem', { ascending: true });

  if (error) {
    console.error('Erro ao buscar embalagens:', error);
    return [];
  }

  return data || [];
};

export const updateEmbalagem = async (
  id: string,
  embalagem: Partial<Omit<Embalagem, 'id' | 'created_at'>>
): Promise<Embalagem | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const embalagens = getLocalEmbalagens();
    const index = embalagens.findIndex(e => e.id === id);
    if (index === -1) return null;

    embalagens[index] = { ...embalagens[index], ...embalagem };
    setLocalEmbalagens(embalagens);
    return embalagens[index];
  }

  const { data, error } = await supabase
    .from('embalagens')
    .update(embalagem)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar embalagem:', error);
    return null;
  }

  return data;
};

export const deleteEmbalagem = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const embalagens = getLocalEmbalagens();
    const filtered = embalagens.filter(e => e.id !== id);
    setLocalEmbalagens(filtered);
    return true;
  }

  const { error } = await supabase
    .from('embalagens')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar embalagem:', error);
    return false;
  }

  return true;
};

// Adicionar estoque de embalagem
export const adicionarEstoqueEmbalagem = async (
  id: string,
  quantidade: number
): Promise<Embalagem | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const embalagens = getLocalEmbalagens();
    const index = embalagens.findIndex(e => e.id === id);
    if (index === -1) return null;

    embalagens[index].quantidade = (embalagens[index].quantidade || 0) + quantidade;
    setLocalEmbalagens(embalagens);
    return embalagens[index];
  }

  // Primeiro buscar a quantidade atual
  const { data: current, error: fetchError } = await supabase
    .from('embalagens')
    .select('quantidade')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Erro ao buscar embalagem:', fetchError);
    return null;
  }

  const novaQuantidade = (current?.quantidade || 0) + quantidade;

  const { data, error } = await supabase
    .from('embalagens')
    .update({ quantidade: novaQuantidade })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao adicionar estoque:', error);
    return null;
  }

  return data;
};

// Remover estoque de embalagem
export const removerEstoqueEmbalagem = async (
  id: string,
  quantidade: number
): Promise<Embalagem | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const embalagens = getLocalEmbalagens();
    const index = embalagens.findIndex(e => e.id === id);
    if (index === -1) return null;

    const novaQtd = Math.max(0, (embalagens[index].quantidade || 0) - quantidade);
    embalagens[index].quantidade = novaQtd;
    setLocalEmbalagens(embalagens);
    return embalagens[index];
  }

  // Primeiro buscar a quantidade atual
  const { data: current, error: fetchError } = await supabase
    .from('embalagens')
    .select('quantidade')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('Erro ao buscar embalagem:', fetchError);
    return null;
  }

  const novaQuantidade = Math.max(0, (current?.quantidade || 0) - quantidade);

  const { data, error } = await supabase
    .from('embalagens')
    .update({ quantidade: novaQuantidade })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao remover estoque:', error);
    return null;
  }

  return data;
};

// ============ MOVIMENTACOES ============

export const registrarMovimentacaoEmbalagem = async (
  embalagem_id: string,
  tipo: 'entrada' | 'saida' | 'ajuste',
  quantidade: number,
  motivo?: string
): Promise<EmbalagemMovimentacao | null> => {
  console.log('[Embalagem] registrarMovimentacaoEmbalagem chamada:', { embalagem_id, tipo, quantidade, motivo });

  const dadosMovimentacao = {
    embalagem_id,
    tipo,
    quantidade: Math.abs(quantidade),
    motivo: motivo || undefined,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novaMovimentacao: EmbalagemMovimentacao = {
      ...dadosMovimentacao,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    // Atualizar estoque local
    const embalagens = getLocalEmbalagens();
    const index = embalagens.findIndex(e => e.id === embalagem_id);
    if (index !== -1) {
      if (tipo === 'entrada') {
        embalagens[index].quantidade = (embalagens[index].quantidade || 0) + Math.abs(quantidade);
      } else if (tipo === 'saida') {
        embalagens[index].quantidade = Math.max(0, (embalagens[index].quantidade || 0) - Math.abs(quantidade));
      } else if (tipo === 'ajuste') {
        embalagens[index].quantidade = (embalagens[index].quantidade || 0) + quantidade;
      }
      setLocalEmbalagens(embalagens);
    }

    const movs = getLocalMovimentacoes();
    movs.unshift(novaMovimentacao);
    setLocalMovimentacoes(movs);

    return novaMovimentacao;
  }

  const user_id = await getCurrentUserId();
  const dadosComUserId = user_id
    ? { ...dadosMovimentacao, user_id }
    : dadosMovimentacao;

  // Atualizar estoque
  console.log('[Embalagem] Atualizando estoque:', { tipo, embalagem_id, quantidade });
  if (tipo === 'entrada') {
    const resultadoEstoque = await adicionarEstoqueEmbalagem(embalagem_id, quantidade);
    console.log('[Embalagem] Resultado adicionar estoque:', resultadoEstoque);
  } else if (tipo === 'saida') {
    const resultadoEstoque = await removerEstoqueEmbalagem(embalagem_id, quantidade);
    console.log('[Embalagem] Resultado remover estoque:', resultadoEstoque);
  }

  // Registrar movimentação
  const { data, error } = await supabase
    .from('embalagens_movimentacoes')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar movimentacao:', error);
    return null;
  }

  return data;
};

export const getMovimentacoesEmbalagem = async (embalagem_id: string): Promise<EmbalagemMovimentacao[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const movs = getLocalMovimentacoes();
    return movs.filter(m => m.embalagem_id === embalagem_id);
  }

  const { data, error } = await supabase
    .from('embalagens_movimentacoes')
    .select(`
      *,
      embalagem:embalagens(nome_embalagem, tipo)
    `)
    .eq('embalagem_id', embalagem_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar movimentacoes:', error);
    return [];
  }

  return data || [];
};

// Buscar embalagem por ID
export const getEmbalagemById = async (id: string): Promise<Embalagem | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const embalagens = getLocalEmbalagens();
    return embalagens.find(e => e.id === id) || null;
  }

  const { data, error } = await supabase
    .from('embalagens')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar embalagem:', error);
    return null;
  }

  return data;
};

// Validar estoque de embalagens (para uso na fila de produção)
export const validarEstoqueEmbalagens = async (
  embalagensConfig: { embalagem_id: string; quantidade: number }[],
  quantidadeProdutos: number = 1
): Promise<{ valido: boolean; erros: string[] }> => {
  const erros: string[] = [];

  for (const config of embalagensConfig) {
    const embalagem = await getEmbalagemById(config.embalagem_id);
    if (!embalagem) {
      erros.push(`Embalagem ${config.embalagem_id} nao encontrada`);
      continue;
    }

    const quantidadeNecessaria = config.quantidade * quantidadeProdutos;
    if ((embalagem.quantidade || 0) < quantidadeNecessaria) {
      erros.push(
        `${embalagem.nome_embalagem}: necessario ${quantidadeNecessaria}, disponivel ${embalagem.quantidade || 0}`
      );
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
};

// Deduzir estoque de embalagens (para uso na fila de produção)
export const deduzirEstoqueEmbalagens = async (
  embalagensConfig: { embalagem_id: string; quantidade: number }[],
  quantidadeProdutos: number = 1,
  motivo?: string
): Promise<boolean> => {
  for (const config of embalagensConfig) {
    const quantidadeTotal = config.quantidade * quantidadeProdutos;
    const result = await registrarMovimentacaoEmbalagem(
      config.embalagem_id,
      'saida',
      quantidadeTotal,
      motivo || `Producao de ${quantidadeProdutos} unidade(s)`
    );

    if (!result) {
      console.error(`Erro ao deduzir estoque da embalagem ${config.embalagem_id}`);
      return false;
    }
  }

  return true;
};
