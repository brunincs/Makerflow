import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { Filamento, FilamentoEntrada, FilamentoMovimentacao, TipoMovimentacao } from '../types';

const STORAGE_KEY = 'makerflow_filamentos';
const IMPRESSOES_STORAGE_KEY = 'makerflow_impressoes';
const ENTRADAS_STORAGE_KEY = 'makerflow_filamento_entradas';
const MOVIMENTACOES_STORAGE_KEY = 'makerflow_filamento_movimentacoes';

// Função auxiliar para calcular consumo total de um filamento (exportada para uso futuro)
export const calcularConsumoFilamento = async (filamentoId: string): Promise<number> => {
  if (!isSupabaseConfigured() || !supabase) {
    // Fallback local: ler impressões do localStorage
    const impressoesData = localStorage.getItem(IMPRESSOES_STORAGE_KEY);
    if (!impressoesData) return 0;

    const impressoes = JSON.parse(impressoesData);
    return impressoes
      .filter((imp: { filamento_id: string }) => imp.filamento_id === filamentoId)
      .reduce((acc: number, imp: { peso_total_g: number }) => acc + (imp.peso_total_g || 0), 0);
  }

  // Buscar do Supabase
  const { data, error } = await supabase
    .from('impressoes')
    .select('peso_total_g')
    .eq('filamento_id', filamentoId);

  if (error) {
    console.error('Erro ao buscar consumo do filamento:', error);
    return 0;
  }

  return (data || []).reduce((acc, imp) => acc + (imp.peso_total_g || 0), 0);
};

// Local storage fallback
const getLocalFilamentos = (): Filamento[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalFilamentos = (filamentos: Filamento[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filamentos));
};

export const createFilamento = async (
  filamento: Omit<Filamento, 'id' | 'created_at' | 'preco_por_kg' | 'estoque_gramas'>
): Promise<Filamento | null> => {
  const estoqueGramas = (filamento.quantidade_rolos || 0) * 1000;

  const dadosParaSalvar = {
    marca: filamento.marca,
    nome_filamento: filamento.nome_filamento,
    cor: filamento.cor,
    material: filamento.material,
    preco_pago: filamento.preco_pago,
    preco_por_kg: filamento.preco_pago, // Todos sao 1kg
    quantidade_rolos: filamento.quantidade_rolos || 0,
    estoque_gramas: estoqueGramas,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const novo: Filamento = {
      ...dadosParaSalvar,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    const filamentos = getLocalFilamentos();
    filamentos.unshift(novo);
    setLocalFilamentos(filamentos);

    return novo;
  }

  const user_id = await getCurrentUserId();
  // Só inclui user_id se não for null (auth desabilitada temporariamente)
  const dadosComUserId = user_id
    ? { ...dadosParaSalvar, user_id }
    : dadosParaSalvar;

  const { data, error } = await supabase
    .from('filamentos')
    .insert([dadosComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar filamento:', error);
    return null;
  }

  return data;
};

export const getFilamentos = async (): Promise<Filamento[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getLocalFilamentos();
  }

  const { data, error } = await supabase
    .from('filamentos')
    .select('*')
    .order('marca', { ascending: true })
    .order('nome_filamento', { ascending: true });

  if (error) {
    console.error('Erro ao buscar filamentos:', error);
    return [];
  }

  return data || [];
};

export const updateFilamento = async (
  id: string,
  filamento: Partial<Omit<Filamento, 'id' | 'created_at' | 'preco_por_kg' | 'estoque_gramas' | 'quantidade_rolos'>>
): Promise<Filamento | null> => {
  const dadosParaAtualizar: Record<string, unknown> = { ...filamento };

  // Remover campos que não devem ser atualizados diretamente
  delete dadosParaAtualizar.quantidade_rolos;
  delete dadosParaAtualizar.estoque_gramas;
  delete dadosParaAtualizar.preco_por_kg; // Preço médio só atualiza via adição de estoque

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === id);
    if (index === -1) return null;

    filamentos[index] = { ...filamentos[index], ...dadosParaAtualizar } as Filamento;
    setLocalFilamentos(filamentos);
    return filamentos[index];
  }

  const { data, error } = await supabase
    .from('filamentos')
    .update(dadosParaAtualizar)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar filamento:', error);
    console.error('Detalhes:', error.message, error.details, error.hint);
    alert(`Erro do Supabase: ${error.message}\n\nVoce ja adicionou as colunas 'quantidade_rolos' e 'estoque_gramas' na tabela 'filamentos'?`);
    return null;
  }

  return data;
};

// Devolver estoque de um filamento (usado ao excluir impressão)
export const devolverEstoqueFilamento = async (
  id: string,
  gramasDevolvidos: number
): Promise<Filamento | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === id);
    if (index === -1) return null;

    filamentos[index].estoque_gramas = filamentos[index].estoque_gramas + gramasDevolvidos;
    setLocalFilamentos(filamentos);
    return filamentos[index];
  }

  // Primeiro buscar o estoque atual
  const { data: filamentoAtual, error: fetchError } = await supabase
    .from('filamentos')
    .select('estoque_gramas')
    .eq('id', id)
    .single();

  if (fetchError || !filamentoAtual) {
    console.error('Erro ao buscar filamento:', fetchError);
    return null;
  }

  const novoEstoque = filamentoAtual.estoque_gramas + gramasDevolvidos;

  const { data, error } = await supabase
    .from('filamentos')
    .update({ estoque_gramas: novoEstoque })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao devolver estoque:', error);
    return null;
  }

  return data;
};

// Descontar estoque de um filamento (usado após impressão)
export const descontarEstoqueFilamento = async (
  id: string,
  gramasUsados: number
): Promise<Filamento | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === id);
    if (index === -1) return null;

    filamentos[index].estoque_gramas = Math.max(0, filamentos[index].estoque_gramas - gramasUsados);
    setLocalFilamentos(filamentos);
    return filamentos[index];
  }

  // Primeiro buscar o estoque atual
  const { data: filamentoAtual, error: fetchError } = await supabase
    .from('filamentos')
    .select('estoque_gramas')
    .eq('id', id)
    .single();

  if (fetchError || !filamentoAtual) {
    console.error('Erro ao buscar filamento:', fetchError);
    return null;
  }

  const novoEstoque = Math.max(0, filamentoAtual.estoque_gramas - gramasUsados);

  const { data, error } = await supabase
    .from('filamentos')
    .update({ estoque_gramas: novoEstoque })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao descontar estoque:', error);
    return null;
  }

  return data;
};

// Adicionar estoque a um filamento (com cálculo de preço médio)
export const adicionarEstoqueFilamento = async (
  filamentoId: string,
  quantidadeRolos: number,
  precoPorRolo: number
): Promise<Filamento | null> => {
  const pesoAdicionado = quantidadeRolos * 1000; // gramas

  // Buscar filamento atual
  let filamentoAtual: Filamento | null = null;

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    filamentoAtual = filamentos.find(f => f.id === filamentoId) || null;
  } else {
    const { data, error } = await supabase
      .from('filamentos')
      .select('*')
      .eq('id', filamentoId)
      .single();

    if (error) {
      console.error('Erro ao buscar filamento:', error);
      return null;
    }
    filamentoAtual = data;
  }

  if (!filamentoAtual) return null;

  // Calcular novo preço médio ponderado
  const estoqueAtualKg = (filamentoAtual.estoque_gramas || 0) / 1000;
  const valorEstoqueAtual = filamentoAtual.preco_por_kg * estoqueAtualKg;
  const valorCompra = precoPorRolo * quantidadeRolos;
  const novoEstoqueKg = estoqueAtualKg + quantidadeRolos;

  // Preço médio = (valor estoque atual + valor compra) / novo estoque total em kg
  const novoPrecoMedio = novoEstoqueKg > 0
    ? (valorEstoqueAtual + valorCompra) / novoEstoqueKg
    : precoPorRolo;

  const novoEstoqueGramas = filamentoAtual.estoque_gramas + pesoAdicionado;
  const novaQuantidadeRolos = (filamentoAtual.quantidade_rolos || 0) + quantidadeRolos;

  // Registrar entrada no historico
  const entrada: Omit<FilamentoEntrada, 'id' | 'created_at'> & { user_id?: string | null } = {
    filamento_id: filamentoId,
    quantidade_rolos: quantidadeRolos,
    preco_por_rolo: precoPorRolo,
    peso_total_g: pesoAdicionado,
  };

  if (!isSupabaseConfigured() || !supabase) {
    // Salvar entrada no localStorage
    const entradasData = localStorage.getItem(ENTRADAS_STORAGE_KEY);
    const entradas = entradasData ? JSON.parse(entradasData) : [];
    entradas.unshift({
      ...entrada,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(ENTRADAS_STORAGE_KEY, JSON.stringify(entradas));

    // Atualizar filamento
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === filamentoId);
    if (index !== -1) {
      filamentos[index].estoque_gramas = novoEstoqueGramas;
      filamentos[index].quantidade_rolos = novaQuantidadeRolos;
      filamentos[index].preco_por_kg = novoPrecoMedio;
      filamentos[index].preco_pago = novoPrecoMedio; // Manter sincronizado
      setLocalFilamentos(filamentos);
      return filamentos[index];
    }
    return null;
  }

  // Salvar entrada no Supabase
  const user_id = await getCurrentUserId();
  const entradaComUserId = { ...entrada, user_id };

  const { error: entradaError } = await supabase
    .from('filamento_entradas')
    .insert([entradaComUserId]);

  if (entradaError) {
    console.error('Erro ao registrar entrada:', entradaError);
    // Continuar mesmo com erro no histórico
  }

  // Atualizar filamento no Supabase
  const { data, error } = await supabase
    .from('filamentos')
    .update({
      estoque_gramas: novoEstoqueGramas,
      quantidade_rolos: novaQuantidadeRolos,
      preco_por_kg: novoPrecoMedio,
      preco_pago: novoPrecoMedio,
    })
    .eq('id', filamentoId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar filamento:', error);
    return null;
  }

  return data;
};

// Buscar histórico de entradas de um filamento
export const getEntradasFilamento = async (filamentoId: string): Promise<FilamentoEntrada[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const entradasData = localStorage.getItem(ENTRADAS_STORAGE_KEY);
    const entradas = entradasData ? JSON.parse(entradasData) : [];
    return entradas.filter((e: FilamentoEntrada) => e.filamento_id === filamentoId);
  }

  const { data, error } = await supabase
    .from('filamento_entradas')
    .select('*')
    .eq('filamento_id', filamentoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar entradas:', error);
    return [];
  }

  return data || [];
};

// ============ SISTEMA DE MOVIMENTAÇÕES ============

// Registrar movimentacao no historico
const registrarMovimentacao = async (
  filamentoId: string,
  tipo: TipoMovimentacao,
  quantidadeG: number,
  precoPorRolo?: number,
  motivo?: string
): Promise<void> => {
  const movimentacao = {
    filamento_id: filamentoId,
    tipo,
    quantidade_g: quantidadeG,
    preco_por_rolo: precoPorRolo || null,
    motivo: motivo || null,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const movData = localStorage.getItem(MOVIMENTACOES_STORAGE_KEY);
    const movimentacoes = movData ? JSON.parse(movData) : [];
    movimentacoes.unshift({
      ...movimentacao,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    });
    localStorage.setItem(MOVIMENTACOES_STORAGE_KEY, JSON.stringify(movimentacoes));
    return;
  }

  const user_id = await getCurrentUserId();
  const movimentacaoComUserId = { ...movimentacao, user_id };

  const { error } = await supabase
    .from('filamento_movimentacoes')
    .insert([movimentacaoComUserId]);

  if (error) {
    console.error('Erro ao registrar movimentação:', error);
  }
};

// Buscar histórico de movimentações de um filamento
export const getMovimentacoesFilamento = async (filamentoId: string): Promise<FilamentoMovimentacao[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const movData = localStorage.getItem(MOVIMENTACOES_STORAGE_KEY);
    const movimentacoes = movData ? JSON.parse(movData) : [];
    return movimentacoes.filter((m: FilamentoMovimentacao) => m.filamento_id === filamentoId);
  }

  const { data, error } = await supabase
    .from('filamento_movimentacoes')
    .select('*')
    .eq('filamento_id', filamentoId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar movimentações:', error);
    return [];
  }

  return data || [];
};

// Remover estoque de um filamento (saída manual)
export const removerEstoqueFilamento = async (
  filamentoId: string,
  quantidadeRolos: number,
  motivo?: string
): Promise<Filamento | null> => {
  const pesoRemovido = quantidadeRolos * 1000; // gramas

  // Buscar filamento atual
  let filamentoAtual: Filamento | null = null;

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    filamentoAtual = filamentos.find(f => f.id === filamentoId) || null;
  } else {
    const { data, error } = await supabase
      .from('filamentos')
      .select('*')
      .eq('id', filamentoId)
      .single();

    if (error) {
      console.error('Erro ao buscar filamento:', error);
      return null;
    }
    filamentoAtual = data;
  }

  if (!filamentoAtual) return null;

  // Verificar se tem estoque suficiente
  if ((filamentoAtual.estoque_gramas || 0) < pesoRemovido) {
    alert('Estoque insuficiente para remover essa quantidade.');
    return null;
  }

  const novoEstoqueGramas = Math.max(0, filamentoAtual.estoque_gramas - pesoRemovido);

  // Registrar movimentação
  await registrarMovimentacao(filamentoId, 'saida', pesoRemovido, undefined, motivo);

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === filamentoId);
    if (index !== -1) {
      filamentos[index].estoque_gramas = novoEstoqueGramas;
      setLocalFilamentos(filamentos);
      return filamentos[index];
    }
    return null;
  }

  const { data, error } = await supabase
    .from('filamentos')
    .update({ estoque_gramas: novoEstoqueGramas })
    .eq('id', filamentoId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar filamento:', error);
    return null;
  }

  return data;
};

// Ajustar estoque de um filamento (substituição completa)
export const ajustarEstoqueFilamento = async (
  filamentoId: string,
  novoEstoqueKg: number,
  novoPrecoMedio?: number,
  motivo?: string
): Promise<Filamento | null> => {
  const novoEstoqueGramas = novoEstoqueKg * 1000;

  // Buscar filamento atual
  let filamentoAtual: Filamento | null = null;

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    filamentoAtual = filamentos.find(f => f.id === filamentoId) || null;
  } else {
    const { data, error } = await supabase
      .from('filamentos')
      .select('*')
      .eq('id', filamentoId)
      .single();

    if (error) {
      console.error('Erro ao buscar filamento:', error);
      return null;
    }
    filamentoAtual = data;
  }

  if (!filamentoAtual) return null;

  const dadosAtualizar: Record<string, number> = {
    estoque_gramas: novoEstoqueGramas,
    quantidade_rolos: Math.ceil(novoEstoqueKg), // Aproximar rolos
  };

  if (novoPrecoMedio !== undefined && novoPrecoMedio > 0) {
    dadosAtualizar.preco_por_kg = novoPrecoMedio;
    dadosAtualizar.preco_pago = novoPrecoMedio;
  }

  // Registrar movimentação
  await registrarMovimentacao(
    filamentoId,
    'ajuste',
    novoEstoqueGramas,
    novoPrecoMedio,
    motivo || `Ajuste de ${(filamentoAtual.estoque_gramas / 1000).toFixed(2)}kg para ${novoEstoqueKg.toFixed(2)}kg`
  );

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === filamentoId);
    if (index !== -1) {
      filamentos[index] = { ...filamentos[index], ...dadosAtualizar };
      setLocalFilamentos(filamentos);
      return filamentos[index];
    }
    return null;
  }

  const { data, error } = await supabase
    .from('filamentos')
    .update(dadosAtualizar)
    .eq('id', filamentoId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar filamento:', error);
    return null;
  }

  return data;
};

// Versão atualizada de adicionar estoque que também registra movimentação
export const adicionarEstoqueFilamentoV2 = async (
  filamentoId: string,
  quantidadeRolos: number,
  precoPorRolo: number
): Promise<Filamento | null> => {
  const pesoAdicionado = quantidadeRolos * 1000; // gramas

  // Usar a função existente
  const resultado = await adicionarEstoqueFilamento(filamentoId, quantidadeRolos, precoPorRolo);

  if (resultado) {
    // Registrar movimentação
    await registrarMovimentacao(filamentoId, 'entrada', pesoAdicionado, precoPorRolo);
  }

  return resultado;
};

export const deleteFilamento = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const filtered = filamentos.filter(f => f.id !== id);
    setLocalFilamentos(filtered);
    return true;
  }

  const { error } = await supabase
    .from('filamentos')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar filamento:', error);
    return false;
  }

  return true;
};

// Consumir filamento (descontar do estoque em gramas)
export const consumirFilamento = async (
  filamentoId: string,
  pesoGramas: number,
  motivo?: string
): Promise<Filamento | null> => {
  // Buscar filamento atual
  let filamentoAtual: Filamento | null = null;

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    filamentoAtual = filamentos.find(f => f.id === filamentoId) || null;
  } else {
    const { data, error } = await supabase
      .from('filamentos')
      .select('*')
      .eq('id', filamentoId)
      .single();

    if (error) {
      console.error('Erro ao buscar filamento:', error);
      return null;
    }
    filamentoAtual = data;
  }

  if (!filamentoAtual) return null;

  const novoEstoqueGramas = Math.max(0, (filamentoAtual.estoque_gramas || 0) - pesoGramas);
  const novaQuantidadeRolos = Math.ceil(novoEstoqueGramas / 1000);

  // Registrar movimentação
  await registrarMovimentacao(
    filamentoId,
    'saida',
    pesoGramas,
    undefined,
    motivo || 'Consumo de producao'
  );

  const dadosAtualizar = {
    estoque_gramas: novoEstoqueGramas,
    quantidade_rolos: novaQuantidadeRolos,
  };

  if (!isSupabaseConfigured() || !supabase) {
    const filamentos = getLocalFilamentos();
    const index = filamentos.findIndex(f => f.id === filamentoId);
    if (index !== -1) {
      filamentos[index] = { ...filamentos[index], ...dadosAtualizar };
      setLocalFilamentos(filamentos);
      return filamentos[index];
    }
    return null;
  }

  const { data, error } = await supabase
    .from('filamentos')
    .update(dadosAtualizar)
    .eq('id', filamentoId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao consumir filamento:', error);
    return null;
  }

  return data;
};
