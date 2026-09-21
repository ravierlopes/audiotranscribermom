/**
 * Limite de tamanho por arquivo.
 *
 * O teto depende de onde o sistema está hospedado:
 *
 * - **Vercel**: funções serverless aceitam no máximo 4,5 MB no corpo da
 *   requisição. É um limite da plataforma, não dá para aumentar.
 * - **Azure App Service** (ou qualquer servidor Node comum): não tem esse
 *   teto. Aqui vale a pena subir o limite, já que a própria Azure Speech
 *   aceita arquivos de até 500 MB.
 *
 * Ajuste pela variável de ambiente TAMANHO_MAXIMO_MB. O padrão é 4 MB, que é
 * o que funciona em qualquer lugar. Em áudio do WhatsApp (OPUS, ~32 kbps),
 * cada 1 MB equivale a mais ou menos 4 minutos de fala.
 */
function lerLimiteMb(): number {
  const bruto = process.env.TAMANHO_MAXIMO_MB?.trim();
  if (!bruto) return 4;

  const valor = Number(bruto);
  // Um valor inválido na configuração não pode derrubar o sistema: caímos no
  // padrão seguro, que funciona em qualquer hospedagem.
  if (!Number.isFinite(valor) || valor <= 0) return 4;
  return Math.min(valor, 500);
}

export const TAMANHO_MAXIMO_BYTES = lerLimiteMb() * 1024 * 1024;

/** Quantos arquivos podem ser enviados de uma vez. */
export const MAXIMO_ARQUIVOS = 10;

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
