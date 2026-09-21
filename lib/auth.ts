import { cookies } from "next/headers";

/**
 * Protecao de acesso por senha unica.
 *
 * Os audios sao relatorios internos de uma assessoria parlamentar, entao o
 * link nao deve ficar aberto na internet. A protecao e deliberadamente
 * simples - uma senha so, digitada uma vez e lembrada por 90 dias - porque
 * quem usa o sistema nao vai administrar contas nem senhas.
 *
 * Se SENHA_ACESSO nao estiver configurada, o sistema roda sem senha. Isso
 * serve para testar na sua propria maquina; em producao, configure a senha.
 */

const NOME_COOKIE = "transcritor_sessao";
const DIAS_VALIDADE = 90;

export function senhaConfigurada(): string | null {
  const senha = process.env.SENHA_ACESSO?.trim();
  return senha ? senha : null;
}

/**
 * Chave usada para assinar o cookie. Derivada de SEGREDO_SESSAO quando
 * existir; caso contrario, da propria senha - assim trocar a senha invalida
 * as sessoes antigas, que e o comportamento desejado.
 */
function segredoAssinatura(senha: string): string {
  return process.env.SEGREDO_SESSAO?.trim() || `assinatura-v1:${senha}`;
}

async function assinar(valor: string, segredo: string): Promise<string> {
  const codificador = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    "raw",
    codificador.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const assinatura = await crypto.subtle.sign("HMAC", chave, codificador.encode(valor));
  return Buffer.from(assinatura).toString("base64url");
}

/** Comparacao em tempo constante, para nao vazar a senha por tempo de resposta. */
function iguaisEmTempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferenca === 0;
}

export function conferirSenha(tentativa: string): boolean {
  const senha = senhaConfigurada();
  if (!senha) return true;
  return iguaisEmTempoConstante(tentativa, senha);
}

/** Monta o valor do cookie: validade + assinatura. */
export async function criarCookieSessao(): Promise<{
  nome: string;
  valor: string;
  maxAge: number;
}> {
  const senha = senhaConfigurada() ?? "";
  const expiraEm = Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000;
  const carga = String(expiraEm);
  const assinatura = await assinar(carga, segredoAssinatura(senha));
  return {
    nome: NOME_COOKIE,
    valor: `${carga}.${assinatura}`,
    maxAge: DIAS_VALIDADE * 24 * 60 * 60,
  };
}

/** Diz se a requisicao atual pode usar o sistema. */
export async function sessaoValida(): Promise<boolean> {
  const senha = senhaConfigurada();
  if (!senha) return true;

  const cookie = (await cookies()).get(NOME_COOKIE)?.value;
  if (!cookie) return false;

  const separador = cookie.lastIndexOf(".");
  if (separador <= 0) return false;

  const carga = cookie.slice(0, separador);
  const assinatura = cookie.slice(separador + 1);

  const esperada = await assinar(carga, segredoAssinatura(senha));
  if (!iguaisEmTempoConstante(assinatura, esperada)) return false;

  const expiraEm = Number(carga);
  return Number.isFinite(expiraEm) && expiraEm > Date.now();
}

export { NOME_COOKIE };
