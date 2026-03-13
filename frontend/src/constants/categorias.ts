import { MercadoLivreCategoria } from '../types';

export const CATEGORIAS_MERCADO_LIVRE: MercadoLivreCategoria[] = [
  { id: 'casa_moveis', nome: 'Casa, Moveis e Decoracao', taxa_classico: 11.5, taxa_premium: 16.5 },
  { id: 'arte_papelaria', nome: 'Arte, Papelaria e Armarinho', taxa_classico: 11.5, taxa_premium: 16.5 },
  { id: 'brinquedos', nome: 'Brinquedos e Hobbies', taxa_classico: 11.5, taxa_premium: 16.5 },
  { id: 'festas', nome: 'Festas e Lembrancinhas', taxa_classico: 12, taxa_premium: 17 },
  { id: 'ferramentas', nome: 'Ferramentas', taxa_classico: 12, taxa_premium: 17 },
  { id: 'construcao', nome: 'Construcao', taxa_classico: 12, taxa_premium: 17 },
  { id: 'industria', nome: 'Industria e Comercio', taxa_classico: 12, taxa_premium: 17 },
  { id: 'bebes', nome: 'Bebes', taxa_classico: 11.5, taxa_premium: 16.5 },
  { id: 'acessorios_veiculos', nome: 'Acessorios para Veiculos', taxa_classico: 12, taxa_premium: 17 },
  { id: 'agro', nome: 'Agro', taxa_classico: 9, taxa_premium: 14 },
  { id: 'alimentos', nome: 'Alimentos e Bebidas', taxa_classico: 14, taxa_premium: 19 },
  { id: 'animais', nome: 'Animais', taxa_classico: 12.5, taxa_premium: 17.5 },
  { id: 'antiguidades', nome: 'Antiguidades e Colecoes', taxa_classico: 11.5, taxa_premium: 16.5 },
  { id: 'beleza', nome: 'Beleza e Cuidado Pessoal', taxa_classico: 12, taxa_premium: 17 },
  { id: 'calcados_roupas', nome: 'Calcados, Roupas e Bolsas', taxa_classico: 14, taxa_premium: 19 },
  { id: 'cameras', nome: 'Cameras e Acessorios', taxa_classico: 13, taxa_premium: 18 },
  { id: 'celulares', nome: 'Celulares e Telefones', taxa_classico: 13, taxa_premium: 18 },
  { id: 'eletrodomesticos', nome: 'Eletrodomesticos', taxa_classico: 13, taxa_premium: 18 },
  { id: 'eletronicos', nome: 'Eletronicos, Audio e Video', taxa_classico: 13, taxa_premium: 18 },
  { id: 'esportes', nome: 'Esportes e Fitness', taxa_classico: 12.5, taxa_premium: 17.5 },
  { id: 'games', nome: 'Games', taxa_classico: 13, taxa_premium: 18 },
  { id: 'informatica', nome: 'Informatica', taxa_classico: 13, taxa_premium: 18 },
  { id: 'instrumentos', nome: 'Instrumentos Musicais', taxa_classico: 11.5, taxa_premium: 16.5 },
  { id: 'joias', nome: 'Joias e Relogios', taxa_classico: 12.5, taxa_premium: 17.5 },
  { id: 'livros', nome: 'Livros, Revistas e Comics', taxa_classico: 12, taxa_premium: 17 },
  { id: 'musica_filmes', nome: 'Musica, Filmes e Seriados', taxa_classico: 12, taxa_premium: 17 },
  { id: 'saude', nome: 'Saude', taxa_classico: 12, taxa_premium: 17 },
  { id: 'mais_categorias', nome: 'Mais Categorias', taxa_classico: 12, taxa_premium: 17 },
];

export function getCategoriaById(id: string): MercadoLivreCategoria | undefined {
  return CATEGORIAS_MERCADO_LIVRE.find(c => c.id === id);
}
