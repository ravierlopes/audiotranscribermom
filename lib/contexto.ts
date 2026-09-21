/**
 * Contexto de trabalho da secretaria: ASPAR (Assessoria Parlamentar) do
 * Ministério da Cultura.
 *
 * Estas listas são o que faz a transcrição acertar os termos que o
 * reconhecimento de voz costuma errar ("ASPAR" vira "as par", "Rouanet" vira
 * "rua net"). Elas são enviadas para a Azure como *phrase list* antes de cada
 * transcrição e aplicadas de novo no texto de saída.
 *
 * PODE EDITAR À VONTADE: basta acrescentar linhas nas listas abaixo. Não é
 * preciso mexer em mais nada do sistema.
 */

/**
 * Palavras e expressões que o reconhecedor deve "esperar" ouvir.
 * Escreva em português correto, com acentos: é assim que o texto deve sair.
 * Limite da Azure: 2.000 frases (estamos muito abaixo disso).
 */
export const VOCABULARIO: string[] = [
  // --- Órgão e estrutura ---
  "ASPAR",
  "Assessoria Parlamentar",
  "Ministério da Cultura",
  "MinC",
  "Secretaria Executiva",
  "gabinete da ministra",
  "Casa Civil",
  "Secretaria de Relações Institucionais",

  // --- Órgãos vinculados ---
  "IPHAN",
  "Instituto do Patrimônio Histórico e Artístico Nacional",
  "IBRAM",
  "Instituto Brasileiro de Museus",
  "FUNARTE",
  "Fundação Cultural Palmares",
  "Fundação Casa de Rui Barbosa",
  "Fundação Biblioteca Nacional",
  "Cinemateca Brasileira",
  "ANCINE",

  // --- Legislação e fomento ---
  "Lei Rouanet",
  "Lei Paulo Gustavo",
  "Lei Aldir Blanc",
  "Política Nacional Aldir Blanc",
  "PNAB",
  "Fundo Nacional de Cultura",
  "Sistema Nacional de Cultura",
  "Plano Nacional de Cultura",
  "PAC Cidades Históricas",
  "PRONAC",
  "SALIC",
  "Versalic",

  // --- Emendas parlamentares (núcleo do trabalho da ASPAR) ---
  "emenda parlamentar",
  "emendas parlamentares",
  "emenda de bancada",
  "emenda de comissão",
  "emenda individual",
  "emenda impositiva",
  "emenda de relator",
  "bancada mineira",
  "bancada federal",
  "captação de emendas",
  "captação de recursos",
  "empenho",
  "transferência especial",
  "transferência fundo a fundo",
  "Transferegov",
  "plano de trabalho",
  "prestação de contas",
  "contrapartida",
  "convênio",
  "termo de fomento",
  "termo de colaboração",

  // --- Interlocutores ---
  "a ministra",
  "o ministro",
  "secretário de Cultura",
  "secretária de Cultura",
  "secretário municipal de Cultura",
  "deputado federal",
  "deputada federal",
  "deputado estadual",
  "senador",
  "senadora",
  "vereador",
  "vereadores",
  "vereadora",
  "prefeito",
  "prefeita",
  "governador",
  "Câmara dos Deputados",
  "Senado Federal",
  "Congresso Nacional",
  "Comissão de Cultura",
  "Comissão de Educação e Cultura",
  "Frente Parlamentar da Cultura",
  "liderança",
  "lideranças locais",

  // --- Patrimônio ---
  "patrimônio histórico",
  "patrimônio cultural",
  "patrimônio imaterial",
  "restauro",
  "restauração",
  "tombamento",
  "bem tombado",
  "acervo",
  "museu",
  "memorial",
  "igreja matriz",
  "centro histórico",
  "conjunto arquitetônico",

  // --- Lugares que aparecem com frequência nos relatórios ---
  "Minas Gerais",
  "Belo Horizonte",
  "São João del-Rei",
  "Betim",
  "Ouro Preto",
  "Tiradentes",
  "Congonhas",
  "Diamantina",
  "Mariana",
  "Sabará",
  "Brasília",
  "Esplanada dos Ministérios",
  "Complexo Ferroviário",
  "Memorial dos Hansenianos",
  "Museu do Hansen",

  // --- Vocabulário de agenda ---
  "agenda",
  "visita técnica",
  "reunião",
  "audiência",
  "audiência pública",
  "comitiva",
  "entrega de obra",
  "assinatura de convênio",
  "projeto cultural",
  "edital",
];

/**
 * Correções aplicadas no texto já transcrito.
 *
 * O reconhecimento de voz escreve siglas e nomes próprios de forma errada com
 * frequência. Cada entrada é [o que costuma sair, como deve ficar].
 * A busca ignora maiúsculas/minúsculas e acentos, então o lado esquerdo pode
 * ser escrito sem acento; o lado direito é o que vai para o texto final e
 * precisa estar em português correto.
 */
export const CORRECOES: Array<[string, string]> = [
  // Siglas
  ["as par", "ASPAR"],
  ["aspar", "ASPAR"],
  ["as pare", "ASPAR"],
  ["min c", "MinC"],
  ["minc", "MinC"],
  ["if fan", "IPHAN"],
  ["ifan", "IPHAN"],
  ["iphan", "IPHAN"],
  ["i bram", "IBRAM"],
  ["ibram", "IBRAM"],
  ["funarte", "FUNARTE"],
  ["ancine", "ANCINE"],
  ["pronac", "PRONAC"],
  ["salic", "SALIC"],
  ["pinab", "PNAB"],
  ["pnab", "PNAB"],

  // Leis
  ["lei rua net", "Lei Rouanet"],
  ["lei ruanet", "Lei Rouanet"],
  ["lei roanet", "Lei Rouanet"],
  ["lei rouanet", "Lei Rouanet"],
  ["rua net", "Rouanet"],
  ["lei paulo gustavo", "Lei Paulo Gustavo"],
  ["lei aldir blanc", "Lei Aldir Blanc"],
  ["aldir branco", "Aldir Blanc"],
  ["aldir blank", "Aldir Blanc"],

  // Lugares
  ["sao joao del rei", "São João del-Rei"],
  ["sao joao del rey", "São João del-Rei"],
  ["sao joao del-rey", "São João del-Rei"],
  ["sao joao delrei", "São João del-Rei"],
  ["sao joao delrey", "São João del-Rei"],
  ["sao joao d'el rei", "São João del-Rei"],
  ["belo horizonte", "Belo Horizonte"],
  ["ouro preto", "Ouro Preto"],
  ["minas gerais", "Minas Gerais"],
  ["brasilia", "Brasília"],
  ["transfere gov", "Transferegov"],
  ["transferegov", "Transferegov"],

  // Institucional
  ["ministerio da cultura", "Ministério da Cultura"],
  ["camara dos deputados", "Câmara dos Deputados"],
  ["senado federal", "Senado Federal"],
  ["congresso nacional", "Congresso Nacional"],
  ["comissao de cultura", "Comissão de Cultura"],
  ["emenda de bancada", "emenda de bancada"],
  ["emenda de comissao", "emenda de comissão"],
];

/**
 * Versão sem acentos do texto com alinhamento 1:1 de índices.
 *
 * Um `normalize("NFD").replace(...)` direto sobre a string inteira pode mudar
 * o comprimento e desalinhar os índices usados nas substituições. Aqui cada
 * unidade do texto vira exatamente uma unidade no resultado.
 * Pressupõe texto já normalizado em NFC (feito em `corrigirTermos`).
 */
function semAcentoAlinhado(texto: string): string {
  let resultado = "";
  for (let i = 0; i < texto.length; i++) {
    const unidade = texto[i];
    const decomposto = unidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    resultado += decomposto.length === 1 ? decomposto : unidade;
  }
  return resultado;
}

/** Escapa caracteres especiais de regex. */
function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Aplica as correções de grafia no texto transcrito.
 *
 * Compara ignorando acentos e caixa, mas preserva o texto original em tudo
 * que não for substituído. Cada trecho é corrigido uma única vez, na ordem em
 * que aparece, para que uma correção não seja desfeita pela seguinte.
 */
export function corrigirTermos(textoOriginal: string): string {
  if (!textoOriginal) return textoOriginal;

  // NFC garante que cada letra acentuada ocupe uma única posição, condição
  // para os índices casarem com a versão sem acentos.
  const texto = textoOriginal.normalize("NFC");

  // Ordena da expressão mais longa para a mais curta: assim "lei rua net"
  // é corrigido antes que "rua net" sozinho tenha chance de agir.
  const regras = [...CORRECOES].sort((a, b) => b[0].length - a[0].length);

  const textoComparavel = semAcentoAlinhado(texto).toLowerCase();
  // Marca as faixas já substituídas para não corrigir o mesmo trecho duas vezes.
  const ocupado = new Array<boolean>(texto.length).fill(false);
  const substituicoes: Array<{ inicio: number; fim: number; valor: string }> = [];

  for (const [errado, certo] of regras) {
    const alvo = semAcentoAlinhado(errado.normalize("NFC")).toLowerCase();
    // \b nas bordas evita casar no meio de outra palavra.
    const padrao = new RegExp(`\\b${escaparRegex(alvo)}\\b`, "g");
    let achado: RegExpExecArray | null;

    while ((achado = padrao.exec(textoComparavel)) !== null) {
      const inicio = achado.index;
      const fim = inicio + achado[0].length;
      let livre = true;
      for (let i = inicio; i < fim; i++) {
        if (ocupado[i]) {
          livre = false;
          break;
        }
      }
      if (!livre) continue;

      for (let i = inicio; i < fim; i++) ocupado[i] = true;
      substituicoes.push({ inicio, fim, valor: certo });
    }
  }

  if (substituicoes.length === 0) return texto;

  substituicoes.sort((a, b) => a.inicio - b.inicio);
  let resultado = "";
  let cursor = 0;
  for (const { inicio, fim, valor } of substituicoes) {
    resultado += texto.slice(cursor, inicio) + valor;
    cursor = fim;
  }
  resultado += texto.slice(cursor);
  return resultado;
}

/**
 * Preposições e contrações que o reconhecimento de voz costuma devolver com
 * inicial maiúscula no meio da frase ("tratando Da Lei Rouanet").
 *
 * Só entram aqui palavras que, em português, ficam minúsculas mesmo dentro de
 * nomes próprios — "João da Silva", "Ouro Preto do Oeste". Artigos soltos como
 * "a", "o" e "e" ficam de fora de propósito: podem ser iniciais de nome.
 */
const PREPOSICOES = [
  "da", "de", "do", "das", "dos",
  "na", "no", "nas", "nos",
  "em", "com", "ao", "aos", "à", "às",
  "pela", "pelo", "pelas", "pelos",
  "sobre", "para", "por",
];

/**
 * Rebaixa a inicial das preposições que aparecem no meio de uma frase.
 *
 * Preserva a maiúscula quando a palavra realmente abre uma frase. Para saber
 * isso é preciso olhar para trás pulando os espaços: em ". Da Lei" o caractere
 * imediatamente anterior é um espaço, e é o ponto mais atrás que manda.
 * Uma quebra de linha também conta como início de frase, por causa dos
 * títulos que separam um áudio do outro.
 */
export function normalizarPreposicoes(texto: string): string {
  if (!texto) return texto;

  const alternativas = PREPOSICOES.map(
    (palavra) => palavra[0].toUpperCase() + palavra.slice(1),
  ).join("|");
  const padrao = new RegExp(`\\b(${alternativas})\\b`, "g");

  return texto.replace(padrao, (achado, palavra: string, deslocamento: number) => {
    let i = deslocamento - 1;
    let houveQuebraDeLinha = false;

    while (i >= 0 && /\s/.test(texto[i])) {
      if (texto[i] === "\n") houveQuebraDeLinha = true;
      i--;
    }

    const comecoDoTexto = i < 0;
    const depoisDePontuacao = i >= 0 && /[.!?:;]/.test(texto[i]);

    if (comecoDoTexto || houveQuebraDeLinha || depoisDePontuacao) {
      return achado;
    }
    return palavra.toLowerCase();
  });
}
