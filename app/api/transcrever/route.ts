import { NextResponse } from "next/server";

import { sessaoValida } from "@/lib/auth";
import { corrigirTermos, normalizarPreposicoes } from "@/lib/contexto";
import { TAMANHO_MAXIMO_BYTES, formatarTamanho } from "@/lib/limites";
import { ErroTranscricao, provedorAtivo } from "@/lib/providers";

export const runtime = "nodejs";

/**
 * Audio de 1 a 3 minutos volta em poucos segundos, mas deixamos margem para
 * arquivos maiores e para lentidao eventual do servico.
 * Planos Hobby da Vercel limitam a 60s; planos pagos aceitam mais.
 */
export const maxDuration = 60;

/**
 * Recebe um arquivo de audio, transcreve e devolve o texto.
 *
 * O arquivo so existe em memoria durante a requisicao: nada e gravado em
 * disco, em banco ou em cache. Terminou a resposta, o audio foi embora.
 */
export async function POST(requisicao: Request) {
  if (!(await sessaoValida())) {
    return NextResponse.json(
      { erro: "Sua sessão expirou. Atualize a página e digite a senha de novo." },
      { status: 401 },
    );
  }

  let formulario: FormData;
  try {
    formulario = await requisicao.formData();
  } catch {
    return NextResponse.json(
      { erro: "Não consegui receber o arquivo. Tente enviar novamente." },
      { status: 400 },
    );
  }

  const audio = formulario.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json(
      { erro: "Nenhum áudio foi enviado. Escolha um arquivo e tente de novo." },
      { status: 400 },
    );
  }

  if (audio.size > TAMANHO_MAXIMO_BYTES) {
    return NextResponse.json(
      {
        erro:
          `Este áudio tem ${formatarTamanho(audio.size)} e o limite é ` +
          `${formatarTamanho(TAMANHO_MAXIMO_BYTES)}. Peça o áudio dividido em partes menores.`,
      },
      { status: 413 },
    );
  }

  const nomeEnviado = formulario.get("nome");
  const nomeArquivo =
    typeof nomeEnviado === "string" && nomeEnviado.trim() ? nomeEnviado.trim() : "audio.ogg";

  const provedor = provedorAtivo();

  try {
    const resultado = await provedor.transcrever(audio, nomeArquivo);
    return NextResponse.json({
      // Primeiro os nomes próprios e siglas, depois a capitalização solta
      // que o reconhecimento deixa no meio das frases.
      texto: normalizarPreposicoes(corrigirTermos(resultado.texto)),
      duracaoSegundos: resultado.duracaoSegundos,
      provedor: resultado.provedor,
    });
  } catch (erro) {
    if (erro instanceof ErroTranscricao) {
      // O detalhe tecnico fica no log do servidor; a usuaria ve so a
      // mensagem em portugues claro.
      console.error(`[transcrever] ${erro.message}`);
      return NextResponse.json({ erro: erro.mensagemUsuario }, { status: erro.status });
    }
    console.error("[transcrever] erro inesperado:", erro);
    return NextResponse.json(
      { erro: "Algo deu errado ao transcrever. Tente novamente em alguns instantes." },
      { status: 500 },
    );
  }
}
