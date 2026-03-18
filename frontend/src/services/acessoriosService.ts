import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { Acessorio, AcessorioMovimentacao, TipoMovimentacaoAcessorio } from '../types/acessorio';

const STORAGE_KEY = 'makerflow_acessorios';
const STORAGE_KEY_MOV = 'makerflow_acessorios_movimentacoes';

// Local storage fallback
const getLocalAcessorios = (): Acessorio[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalAcessorios = (acessorios: Acessorio[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(acessorios));
};

const getLocalMovimentacoes = (): AcessorioMovimentacao[] => {
  const data = localStorage.getItem(STORAGE_KEY_MOV);
  return data ? JSON.parse(data) : [];
};

const setLocalMovimentacoes = (movs: AcessorioMovimentacao[]): void => {
  localStorage.setItem(STORAGE_KEY_MOV, JSON.stringify(movs));
};

// ============ ACESSORIOS ============

export const getAcessorios = async (apenasAtivos = true): Promise<Acessorio[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const acessorios = getLocalAcessorios();
    return apenasAtivos ? acessorios.filter(a => a.ativo) : acessorios;
  }

  let query = supabase
    .from('acessorios')
    .select('*')
    .order('nome', { ascending: true });

  if (apenasAtivos) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao buscar acessorios:', error);
    return [];
  }

  return data || [];
};

export const getAcessorioById = async (id: string): Promise<Acessorio | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const acessorios = getLocalAcessorios();
    return acessorios.find(a => a.id === id) || null;
  }

  const { data, error } = await supabase
    .from('acessorios')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar acessorio:', error);
    return null;
  }

  return data;
};

export const createAcessorio = async (
  acessorio: Omit<Acessorio, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Acessorio | null> => {
  const dadosParaSalvar = {
    nome: acessorio.nome,
    descricao: acessorio.descricao || undefined,
    unidade: acessorio.unidade || 'unidade',
    custo_unitario: acessorio.custo_unitario || 0,
    estoque_atual: acessorio.estoque_atual || 0,
    estoque_minimo: acessorio.estoque_minimo || 5,
    ativo: acessorio.ativo !== false,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: Acessorio = {
      ...dadosParaSalvar,
      id: crypto.randomUUID(),
      user_id: 'local',
      created_at: new Date().toISOString(),
    };

    const acessorios = getLocalAcessorios();
    acessorios.unshift(novo);
    setLocalAcessorios(acessorios);

    return novo;
  }

  const user_id = await getCurrentUserId();
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('acessorios')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar acessorio:', error);
    return null;
  }

  return data;
};

export const updateAcessorio = async (
  id: string,
  acessorio: Partial<Omit<Acessorio, 'id' | 'user_id' | 'created_at'>>
): Promise<Acessorio | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const acessorios = getLocalAcessorios();
    const index = acessorios.findIndex(a => a.id === id);
    if (index === -1) return null;

    acessorios[index] = { ...acessorios[index], ...acessorio };
    setLocalAcessorios(acessorios);
    return acessorios[index];
  }

  const { data, error } = await supabase
    .from('acessorios')
    .update(acessorio)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar acessorio:', error);
    return null;
  }

  return data;
};

export const deleteAcessorio = async (id: string): Promise<boolean> => {
  // Soft delete - apenas marca como inativo
  const result = await updateAcessorio(id, { ativo: false });
  return result !== null;
};

export const hardDeleteAcessorio = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const acessorios = getLocalAcessorios();
    const filtered = acessorios.filter(a => a.id !== id);
    setLocalAcessorios(filtered);
    return true;
  }

  const { error } = await supabase
    .from('acessorios')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar acessorio:', error);
    return false;
  }

  return true;
};

// ============ MOVIMENTACOES ============

export const registrarMovimentacao = async (
  acessorio_id: string,
  tipo: TipoMovimentacaoAcessorio,
  quantidade: number,
  motivo?: string,
  referencia_id?: string,
  referencia_tipo?: string
): Promise<AcessorioMovimentacao | null> => {
  const dadosMovimentacao = {
    acessorio_id,
    tipo,
    quantidade: Math.abs(quantidade), // Sempre positivo, o trigger cuida do sinal
    motivo: motivo || undefined,
    referencia_id: referencia_id || undefined,
    referencia_tipo: referencia_tipo || 'manual',
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novaMovimentacao: AcessorioMovimentacao = {
      ...dadosMovimentacao,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    // Atualizar estoque local
    const acessorios = getLocalAcessorios();
    const index = acessorios.findIndex(a => a.id === acessorio_id);
    if (index !== -1) {
      if (tipo === 'entrada') {
        acessorios[index].estoque_atual += Math.abs(quantidade);
      } else if (tipo === 'saida') {
        acessorios[index].estoque_atual = Math.max(0, acessorios[index].estoque_atual - Math.abs(quantidade));
      } else if (tipo === 'ajuste') {
        acessorios[index].estoque_atual += quantidade; // Pode ser positivo ou negativo
      }
      setLocalAcessorios(acessorios);
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

  const { data, error } = await supabase
    .from('acessorios_movimentacoes')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao registrar movimentacao:', error);
    return null;
  }

  return data;
};

export const registrarEntrada = async (
  acessorio_id: string,
  quantidade: number,
  motivo?: string
): Promise<AcessorioMovimentacao | null> => {
  return registrarMovimentacao(acessorio_id, 'entrada', quantidade, motivo);
};

export const registrarSaida = async (
  acessorio_id: string,
  quantidade: number,
  motivo?: string,
  referencia_id?: string,
  referencia_tipo?: string
): Promise<AcessorioMovimentacao | null> => {
  return registrarMovimentacao(acessorio_id, 'saida', quantidade, motivo, referencia_id, referencia_tipo);
};

export const getMovimentacoes = async (acessorio_id: string): Promise<AcessorioMovimentacao[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const movs = getLocalMovimentacoes();
    return movs.filter(m => m.acessorio_id === acessorio_id);
  }

  const { data, error } = await supabase
    .from('acessorios_movimentacoes')
    .select(`
      *,
      acessorio:acessorios(nome, unidade)
    `)
    .eq('acessorio_id', acessorio_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar movimentacoes:', error);
    return [];
  }

  return data || [];
};

export const getTodasMovimentacoes = async (limit = 50): Promise<AcessorioMovimentacao[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const movs = getLocalMovimentacoes();
    return movs.slice(0, limit);
  }

  const { data, error } = await supabase
    .from('acessorios_movimentacoes')
    .select(`
      *,
      acessorio:acessorios(nome, unidade)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Erro ao buscar movimentacoes:', error);
    return [];
  }

  return data || [];
};

// ============ ALERTAS ============

export const getAcessoriosComEstoqueBaixo = async (): Promise<Acessorio[]> => {
  // Buscar todos os acessórios ativos e filtrar no cliente
  // (a query de comparação entre colunas não funciona bem com RLS)
  const todos = await getAcessorios(true);
  return todos.filter(a => a.estoque_atual <= a.estoque_minimo);
};

// ============ HELPERS ============

export const validarEstoqueAcessorios = async (
  acessoriosConfig: { acessorio_id: string; quantidade: number }[],
  quantidadeProdutos: number = 1
): Promise<{ valido: boolean; erros: string[] }> => {
  const erros: string[] = [];

  for (const config of acessoriosConfig) {
    const acessorio = await getAcessorioById(config.acessorio_id);
    if (!acessorio) {
      erros.push(`Acessorio ${config.acessorio_id} nao encontrado`);
      continue;
    }

    const quantidadeNecessaria = config.quantidade * quantidadeProdutos;
    if (acessorio.estoque_atual < quantidadeNecessaria) {
      erros.push(
        `${acessorio.nome}: necessario ${quantidadeNecessaria} ${acessorio.unidade}(s), disponivel ${acessorio.estoque_atual}`
      );
    }
  }

  return {
    valido: erros.length === 0,
    erros,
  };
};

export const deduzirEstoqueAcessorios = async (
  acessoriosConfig: { acessorio_id: string; quantidade: number }[],
  quantidadeProdutos: number = 1,
  referencia_id?: string,
  referencia_tipo?: string
): Promise<boolean> => {
  for (const config of acessoriosConfig) {
    const quantidadeTotal = config.quantidade * quantidadeProdutos;
    const result = await registrarSaida(
      config.acessorio_id,
      quantidadeTotal,
      `Producao de ${quantidadeProdutos} unidade(s)`,
      referencia_id,
      referencia_tipo
    );

    if (!result) {
      console.error(`Erro ao deduzir estoque do acessorio ${config.acessorio_id}`);
      return false;
    }
  }

  return true;
};

export const calcularCustoAcessorios = async (
  acessoriosConfig: { acessorio_id: string; quantidade: number }[]
): Promise<number> => {
  let custoTotal = 0;

  for (const config of acessoriosConfig) {
    const acessorio = await getAcessorioById(config.acessorio_id);
    if (acessorio) {
      custoTotal += acessorio.custo_unitario * config.quantidade;
    }
  }

  return custoTotal;
};
