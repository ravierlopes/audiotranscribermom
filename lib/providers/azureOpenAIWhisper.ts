import { VOCABULARIO } from "@/lib/contexto";
import {
  ErroTranscricao,
  envObrigatoria,
  type Provedor,
  type ResultadoTranscricao,
} from "./tipos";

/**
 * Azure OpenAI - Whisper.
 *
 * Whisper e o melhor modelo aberto de transcricao disponivel hoje e vai muito
 * bem em portugues. Fica como alternativa ao provedor padrao por uma limitacao
 * concreta: a API do Azure OpenAI nao aceita OGG/OPUS, que e o formato do
 * WhatsApp. Quando este provedor esta ativo, a conversao e feita no navegador
 * antes do envio (veja `app/lib/converterAudio.ts`).
 *
 * O contexto da ASPAR entra como `prompt`, que orienta a grafia de siglas e
 * nomes proprios.
 *
 * Docs: https://learn.microsoft.com/azure/ai-foundry/openai/whisper-quickstart
 */

/** Limite de tamanho da API do Whisper no Azure OpenAI. */
export const LIMITE_WHISPER_BYTES = 25 * 1024 * 1024;

/**
 * O prompt do Whisper e limitado (~224 tokens). Uma lista longa demais e
 * truncada e perde efeito, entao mandamos so os termos que mais erram.
 */
const TERMOS_PRIORITARIOS = VOCABULARIO.slice(0, 40).join(", ");

interface RespostaWhisper {
  text?: string;
  duration?: number;
  error?: { message?: string };
}

export const azureOpenAIWhisper: Provedor = {
  nome: "azure-openai-whisper",

  // Formatos aceitos pela API do Whisper. OGG/OPUS nao esta na lista - e por
  // isso que o navegador converte antes de enviar.
  extensoesAceitas: ["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"],

  async transcrever(audio: Blob, nomeArquivo: string): Promise<ResultadoTranscricao> {
    const chave = envObrigatoria("AZURE_OPENAI_KEY");
    const endpointBruto = envObrigatoria("AZURE_OPENAI_ENDPOINT");
    const deployment = envObrigatoria("AZURE_OPENAI_WHISPER_DEPLOYMENT");
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION?.trim() || "2024-06-01";

    const base = endpointBruto.startsWith("http")
      ? endpointBruto.replace(/\/+$/, "")
      : `https://${endpointBruto}.openai.azure.com`;
    const url = `${base}/openai/deployments/${encodeURIComponent(deployment)}/audio/transcriptions?api-version=${apiVersion}`;

    if (audio.size > LIMITE_WHISPER_BYTES) {
      throw new ErroTranscricao(
        "Este audio e grande demais para o modelo configurado. Peça o áudio em partes menores.",
        `Arquivo de ${audio.size} bytes acima do limite de ${LIMITE_WHISPER_BYTES}`,
        413,
      );
    }

    const corpo = new FormData();
    // A API so aceita nomes de arquivo em ASCII.
    corpo.append("file", audio, paraAscii(nomeArquivo));
    corpo.append("language", "pt");
    corpo.append("response_format", "verbose_json");
    corpo.append(
      "prompt",
      `Relatorio de agenda da ASPAR, Assessoria Parlamentar do Ministerio da Cultura. ` +
        `Termos que aparecem no audio: ${TERMOS_PRIORITARIOS}.`,
    );

    let resposta: Response;
    try {
      resposta = await fetch(url, {
        method: "POST",
        headers: { "api-key": chave },
        body: corpo,
      });
    } catch (erro) {
      throw new ErroTranscricao(
        "Não consegui falar com o serviço de transcrição. Verifique a internet e tente de novo.",
        `Falha de rede ao chamar o Azure OpenAI: ${String(erro)}`,
        503,
      );
    }

    const dados = (await resposta.json().catch(() => ({}))) as RespostaWhisper;

    if (!resposta.ok) {
      throw new ErroTranscricao(
        resposta.status === 401 || resposta.status === 403
          ? "A chave de acesso ao serviço de transcrição está inválida ou expirou. Avise o responsável técnico."
          : "O serviço de transcrição falhou. Tente novamente em alguns instantes.",
        `Azure OpenAI respondeu ${resposta.status}: ${dados.error?.message ?? ""}`,
        resposta.status === 401 || resposta.status === 403 ? 500 : 502,
      );
    }

    const texto = dados.text?.trim() ?? "";
    if (!texto) {
      throw new ErroTranscricao(
        "Não consegui identificar nenhuma fala neste áudio. Confira se o arquivo tem som e tente novamente.",
        "Azure OpenAI Whisper retornou texto vazio",
        422,
      );
    }

    return {
      texto,
      duracaoSegundos: typeof dados.duration === "number" ? dados.duration : null,
      provedor: azureOpenAIWhisper.nome,
    };
  },
};

/** Troca acentos e caracteres fora de ASCII, exigencia da API do Whisper. */
function paraAscii(nome: string): string {
  const semAcento = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const limpo = semAcento.replace(/[^A-Za-z0-9._-]/g, "_");
  return limpo || "audio.wav";
}
