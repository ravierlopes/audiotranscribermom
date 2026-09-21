/**
 * Limite de tamanho por arquivo.
 *
 * A Vercel aceita no máximo 4,5 MB no corpo de uma requisição para função
 * serverless. Ficamos um pouco abaixo para dar folga ao envelope multipart.
 *
 * Em áudio do WhatsApp (OPUS, ~32 kbps) isso equivale a mais ou menos 17
 * minutos de fala por arquivo — bem acima dos relatórios de 1 a 3 minutos que
 * chegam no dia a dia.
 */
export const TAMANHO_MAXIMO_BYTES = 4 * 1024 * 1024;

/** Quantos arquivos podem ser enviados de uma vez. */
export const MAXIMO_ARQUIVOS = 10;

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
