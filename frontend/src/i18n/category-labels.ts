export const PT_BR_CATEGORY_LABELS: Readonly<Record<string, string>> = {
  agro_industria_e_comercio: "Agroindústria e Comércio",
  alimentos: "Alimentos",
  alimentos_bebidas: "Alimentos e Bebidas",
  artes: "Artes",
  artes_e_artesanato: "Artes e Artesanato",
  artigos_de_festas: "Artigos para Festas",
  artigos_de_natal: "Artigos de Natal",
  audio: "Áudio",
  automotivo: "Automotivo",
  bebes: "Bebês",
  bebidas: "Bebidas",
  beleza_saude: "Beleza e Saúde",
  brinquedos: "Brinquedos",
  cama_mesa_banho: "Cama, Mesa e Banho",
  casa_conforto: "Casa e Conforto",
  casa_conforto_2: "Casa e Conforto 2",
  casa_construcao: "Casa e Construção",
  cds_dvds_musicais: "CDs, DVDs e Musicais",
  cine_foto: "Cinema e Foto",
  climatizacao: "Climatização",
  consoles_games: "Consoles e Jogos",
  construcao_ferramentas_construcao: "Construção: Ferramentas para Construção",
  construcao_ferramentas_ferramentas: "Construção: Ferramentas",
  construcao_ferramentas_iluminacao: "Construção: Iluminação",
  construcao_ferramentas_jardim: "Construção: Jardim",
  construcao_ferramentas_seguranca: "Construção: Segurança",
  cool_stuff: "Produtos Diferenciados",
  dvds_blu_ray: "DVDs e Blu-ray",
  eletrodomesticos: "Eletrodomésticos",
  eletrodomesticos_2: "Eletrodomésticos 2",
  eletronicos: "Eletrônicos",
  eletroportateis: "Eletroportáteis",
  esporte_lazer: "Esporte e Lazer",
  fashion_bolsas_e_acessorios: "Moda: Bolsas e Acessórios",
  fashion_calcados: "Moda: Calçados",
  fashion_esporte: "Moda Esportiva",
  fashion_roupa_feminina: "Moda Feminina",
  fashion_roupa_infanto_juvenil: "Moda Infantil e Juvenil",
  fashion_roupa_masculina: "Moda Masculina",
  fashion_underwear_e_moda_praia: "Moda Íntima e Praia",
  ferramentas_jardim: "Ferramentas e Jardim",
  flores: "Flores",
  fraldas_higiene: "Fraldas e Higiene",
  industria_comercio_e_negocios: "Indústria, Comércio e Negócios",
  informatica_acessorios: "Informática e Acessórios",
  instrumentos_musicais: "Instrumentos Musicais",
  la_cuisine: "Cozinha Gourmet",
  livros_importados: "Livros Importados",
  livros_interesse_geral: "Livros de Interesse Geral",
  livros_tecnicos: "Livros Técnicos",
  malas_acessorios: "Malas e Acessórios",
  market_place: "Marketplace",
  moveis_colchao_e_estofado: "Móveis, Colchões e Estofados",
  moveis_cozinha_area_de_servico_jantar_e_jardim:
    "Móveis para Cozinha, Área de Serviço, Jantar e Jardim",
  moveis_decoracao: "Móveis e Decoração",
  moveis_escritorio: "Móveis para Escritório",
  moveis_quarto: "Móveis para Quarto",
  moveis_sala: "Móveis para Sala",
  musica: "Música",
  papelaria: "Papelaria",
  pc_gamer: "PC Gamer",
  pcs: "Computadores",
  perfumaria: "Perfumaria",
  pet_shop: "Pet Shop",
  portateis_casa_forno_e_cafe: "Eletroportáteis para Casa, Forno e Café",
  portateis_cozinha_e_preparadores_de_alimentos:
    "Eletroportáteis para Cozinha e Preparação de Alimentos",
  relogios_presentes: "Relógios e Presentes",
  seguros_e_servicos: "Seguros e Serviços",
  sinalizacao_e_seguranca: "Sinalização e Segurança",
  tablets_impressao_imagem: "Tablets, Impressão e Imagem",
  telefonia: "Telefonia",
  telefonia_fixa: "Telefonia Fixa",
  unknown: "Não informado",
  utilidades_domesticas: "Utilidades Domésticas"
};

function humanizeCategoryLabel(value: string, locale: "pt-BR" | "en-US"): string {
  const words = value.replaceAll("_", " ").trim();
  if (!words) return value;
  if (locale === "pt-BR") {
    return `${words[0].toLocaleUpperCase(locale)}${words.slice(1)}`;
  }
  return words
    .split(" ")
    .map((word) => word === "and"
      ? "&"
      : `${word[0].toLocaleUpperCase(locale)}${word.slice(1)}`)
    .join(" ");
}

export function formatCategoryLabel(value: string, locale: "pt-BR" | "en-US"): string {
  if (locale === "pt-BR") return PT_BR_CATEGORY_LABELS[value] ?? humanizeCategoryLabel(value, locale);
  return humanizeCategoryLabel(value, locale);
}

export function formatCategoryPerformanceLabel(
  category: { categoryName: string; categoryNameEnglish: string },
  locale: "pt-BR" | "en-US"
): string {
  return formatCategoryLabel(
    locale === "pt-BR" ? category.categoryName : category.categoryNameEnglish,
    locale
  );
}
