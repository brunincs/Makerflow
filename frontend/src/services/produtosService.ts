import { supabase, isSupabaseConfigured, getCurrentUserId } from './supabaseClient';
import { ProdutoConcorrente, VariacaoProduto } from '../types';

const STORAGE_KEY = 'makerflow_produtos';
const VARIACOES_KEY = 'makerflow_variacoes';

// Local storage fallback quando Supabase não está configurado
const getLocalProdutos = (): ProdutoConcorrente[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalProdutos = (produtos: ProdutoConcorrente[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
};

const getLocalVariacoes = (): VariacaoProduto[] => {
  const data = localStorage.getItem(VARIACOES_KEY);
  return data ? JSON.parse(data) : [];
};

const setLocalVariacoes = (variacoes: VariacaoProduto[]): void => {
  localStorage.setItem(VARIACOES_KEY, JSON.stringify(variacoes));
};

export const uploadImagem = async (file: File): Promise<string | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    return URL.createObjectURL(file);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `produtos/${fileName}`;

  const { error } = await supabase.storage
    .from('imagens')
    .upload(filePath, file);

  if (error) {
    console.error('Erro ao fazer upload:', error);
    return null;
  }

  const { data } = supabase.storage
    .from('imagens')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const uploadModelo3D = async (file: File): Promise<string | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    // Para localStorage, apenas retornamos um identificador
    return `local_stl_${Date.now()}_${file.name}`;
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `modelos/${fileName}`;

  const { error } = await supabase.storage
    .from('modelos_3d')
    .upload(filePath, file);

  if (error) {
    console.error('Erro ao fazer upload do modelo 3D:', error);
    return null;
  }

  const { data } = supabase.storage
    .from('modelos_3d')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const createProduto = async (
  produto: Omit<ProdutoConcorrente, 'id' | 'created_at' | 'updated_at' | 'variacoes'>,
  variacoes?: Omit<VariacaoProduto, 'id' | 'produto_id' | 'created_at'>[]
): Promise<ProdutoConcorrente | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const novoProduto: ProdutoConcorrente = {
      ...produto,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      variacoes: [],
    };

    const produtos = getLocalProdutos();
    produtos.push(novoProduto);
    setLocalProdutos(produtos);

    // Criar variacoes locais
    if (variacoes && variacoes.length > 0) {
      const localVariacoes = getLocalVariacoes();
      const novasVariacoes = variacoes.map(v => ({
        ...v,
        id: crypto.randomUUID(),
        produto_id: novoProduto.id,
        created_at: new Date().toISOString(),
      }));
      localVariacoes.push(...novasVariacoes);
      setLocalVariacoes(localVariacoes);
      novoProduto.variacoes = novasVariacoes;
    }

    return novoProduto;
  }

  // Obter user_id do usuario logado
  const user_id = await getCurrentUserId();
  const produtoComUserId = { ...produto, user_id };

  console.log('Dados enviados para o Supabase:', produtoComUserId);

  const { data, error } = await supabase
    .from('produtos_concorrentes')
    .insert([produtoComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar produto:', error);
    console.error('Código do erro:', error.code);
    console.error('Detalhes:', error.details);
    console.error('Mensagem:', error.message);
    return null;
  }

  console.log('Produto criado com sucesso:', data);

  // Criar variacoes no Supabase
  if (variacoes && variacoes.length > 0 && data) {
    const user_id = await getCurrentUserId();
    const variacoesComProdutoId = variacoes.map(v => ({
      ...v,
      produto_id: data.id,
      user_id,
    }));

    const { data: variacoesData, error: variacoesError } = await supabase
      .from('variacoes_produto')
      .insert(variacoesComProdutoId)
      .select();

    if (variacoesError) {
      console.error('Erro ao criar variações:', variacoesError);
    } else {
      data.variacoes = variacoesData;
    }
  }

  return data;
};

export const getProdutoById = async (id: string): Promise<ProdutoConcorrente | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const produtos = getLocalProdutos();
    const variacoes = getLocalVariacoes();
    const produto = produtos.find(p => p.id === id);
    if (!produto) return null;
    return {
      ...produto,
      variacoes: variacoes.filter(v => v.produto_id === id),
    };
  }

  const { data, error } = await supabase
    .from('produtos_concorrentes')
    .select(`
      *,
      variacoes:variacoes_produto(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar produto:', error);
    return null;
  }

  return data;
};

export const getProdutos = async (): Promise<ProdutoConcorrente[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const produtos = getLocalProdutos();
    const variacoes = getLocalVariacoes();

    return produtos.map(p => ({
      ...p,
      variacoes: variacoes.filter(v => v.produto_id === p.id),
    }));
  }

  const { data, error } = await supabase
    .from('produtos_concorrentes')
    .select(`
      *,
      variacoes:variacoes_produto(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }

  return data || [];
};

export const updateProduto = async (
  id: string,
  produto: Partial<Omit<ProdutoConcorrente, 'id' | 'created_at' | 'variacoes'>>,
  variacoes?: Omit<VariacaoProduto, 'id' | 'produto_id' | 'created_at'>[]
): Promise<ProdutoConcorrente | null> => {
  const updateData = { ...produto, updated_at: new Date().toISOString() };

  if (!isSupabaseConfigured() || !supabase) {
    const produtos = getLocalProdutos();
    const index = produtos.findIndex(p => p.id === id);
    if (index === -1) return null;

    produtos[index] = { ...produtos[index], ...updateData };
    setLocalProdutos(produtos);

    // Atualizar variações locais
    if (variacoes !== undefined) {
      let localVariacoes = getLocalVariacoes();
      // Remove variações antigas
      localVariacoes = localVariacoes.filter(v => v.produto_id !== id);
      // Adiciona novas
      const novasVariacoes = variacoes.map(v => ({
        ...v,
        id: crypto.randomUUID(),
        produto_id: id,
        created_at: new Date().toISOString(),
      }));
      localVariacoes.push(...novasVariacoes);
      setLocalVariacoes(localVariacoes);
      produtos[index].variacoes = novasVariacoes;
    }

    return produtos[index];
  }

  const { data, error } = await supabase
    .from('produtos_concorrentes')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar produto:', error);
    return null;
  }

  // Atualizar variacoes no Supabase
  if (variacoes !== undefined && data) {
    // Remove variacoes antigas
    await supabase
      .from('variacoes_produto')
      .delete()
      .eq('produto_id', id);

    // Adiciona novas
    if (variacoes.length > 0) {
      const user_id = await getCurrentUserId();
      const variacoesComProdutoId = variacoes.map(v => ({
        ...v,
        produto_id: id,
        user_id,
      }));

      const { data: variacoesData, error: variacoesError } = await supabase
        .from('variacoes_produto')
        .insert(variacoesComProdutoId)
        .select();

      if (variacoesError) {
        console.error('Erro ao criar variações:', variacoesError);
      } else {
        data.variacoes = variacoesData;
      }
    } else {
      data.variacoes = [];
    }
  }

  return data;
};

export const deleteProduto = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const produtos = getLocalProdutos();
    const filtered = produtos.filter(p => p.id !== id);
    setLocalProdutos(filtered);

    // Remove variações locais
    const variacoes = getLocalVariacoes();
    const filteredVariacoes = variacoes.filter(v => v.produto_id !== id);
    setLocalVariacoes(filteredVariacoes);

    return true;
  }

  // Variações são deletadas automaticamente via ON DELETE CASCADE
  const { error } = await supabase
    .from('produtos_concorrentes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar produto:', error);
    return false;
  }

  return true;
};

// === FUNÇÕES DE VARIAÇÕES ===

export const createVariacao = async (
  variacao: Omit<VariacaoProduto, 'id' | 'created_at'>
): Promise<VariacaoProduto | null> => {
  if (!isSupabaseConfigured() || !supabase) {
    const novaVariacao: VariacaoProduto = {
      ...variacao,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    const variacoes = getLocalVariacoes();
    variacoes.push(novaVariacao);
    setLocalVariacoes(variacoes);
    return novaVariacao;
  }

  const user_id = await getCurrentUserId();
  const variacaoComUserId = { ...variacao, user_id };

  const { data, error } = await supabase
    .from('variacoes_produto')
    .insert([variacaoComUserId])
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar variação:', error);
    return null;
  }

  return data;
};

export const getVariacoesPorProduto = async (produtoId: string): Promise<VariacaoProduto[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    const variacoes = getLocalVariacoes();
    return variacoes.filter(v => v.produto_id === produtoId);
  }

  const { data, error } = await supabase
    .from('variacoes_produto')
    .select('*')
    .eq('produto_id', produtoId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Erro ao buscar variações:', error);
    return [];
  }

  return data || [];
};

export const deleteVariacao = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) {
    const variacoes = getLocalVariacoes();
    const filtered = variacoes.filter(v => v.id !== id);
    setLocalVariacoes(filtered);
    return true;
  }

  const { error } = await supabase
    .from('variacoes_produto')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao deletar variação:', error);
    return false;
  }

  return true;
};
