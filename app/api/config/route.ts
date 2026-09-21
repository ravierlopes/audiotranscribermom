import { NextResponse } from "next/server";

import { sessaoValida } from "@/lib/auth";
import { MAXIMO_ARQUIVOS, TAMANHO_MAXIMO_BYTES } from "@/lib/limites";
import { provedorAtivo } from "@/lib/providers";

export const runtime = "nodejs";

/**
 * Informa a tela o que o servidor aceita, para que ela saiba se precisa
 * converter o audio antes de enviar e qual limite de tamanho avisar.
 */
export async function GET() {
  if (!(await sessaoValida())) {
    return NextResponse.json({ erro: "sessao_invalida" }, { status: 401 });
  }

  const provedor = provedorAtivo();
  return NextResponse.json({
    provedor: provedor.nome,
    extensoesAceitas: provedor.extensoesAceitas,
    tamanhoMaximoBytes: TAMANHO_MAXIMO_BYTES,
    maximoArquivos: MAXIMO_ARQUIVOS,
  });
}
