import { VOCABULARIO } from "@/lib/contexto";
import {
  ErroTranscricao,
  envObrigatoria,
  type Provedor,
  type ResultadoTranscricao,
} from "./tipos";

/**
 * Azure AI Speech - Fast Transcription API.
 *
 * Escolhido como provedor padrao por dois motivos praticos:
 *
 * 1. Aceita OPUS/OGG nativamente, que e exatamente o formato em que o
 *    WhatsApp exporta os audios. Nao ha conversao no caminho, e conversao e
 *    a parte que mais quebra num sistema como este.
 * 2. Aceita uma *phrase list* (nosso VOCABULARIO), que e o que faz "ASPAR" e
 *    "Lei Rouanet" sairem escritos certo em vez de "as par" e "rua net".
 *
 * A chamada e sincrona: o audio sobe e o texto volta na mesma requisicao.
 *
 * Docs: https://learn.microsoft.com/azure/ai-services/speech-service/fast-transcription-create
 */

/** A phrase list so existe a partir desta versao da API. */
const API_VERSION = "2025-10-15";

/** Limite da Azure para a phrase list. O nosso vocabulario fica bem abaixo. */
const MAX_FRASES = 2000;

interface RespostaFastTranscription {
  durationMilliseconds?: number;
  combinedPhrases?: Array<{ text?: string }>;
}

function montarEndpoint(): string {
  // Aceita tanto "https://xxx.cognitiveservices.azure.com" quanto o nome cru
  // do recurso, porque e facil colar um ou outro no painel da Vercel.
  const bruto = envObrigatoria("AZURE_SPEECH_ENDPOINT");
  const base = bruto.startsWith("http")
    ? bruto.replace(/\/+$/, "")
    : `https://${bruto}.cognitiveservices.azure.com`;
  return `${base}/speechtotext/transcriptions:transcribe?api-version=${API_VERSION}`;
}

export const azureSpeech: Provedor = {
  nome: "azure-speech-fast-transcription",

  // A Fast Transcription aceita WAV, MP3, OPUS/OGG, FLAC, WMA, AAC, AMR,
  // WebM e SPEEX. Listamos o que de fato chega do WhatsApp e do celular.
  extensoesAceitas: ["ogg", "opus", "oga", "m4a", "mp3", "wav", "aac", "flac", "webm", "mp4", "amr"],

  async transcrever(audio: Blob, nomeArquivo: string): Promise<ResultadoTranscricao> {
    const chave = envObrigatoria("AZURE_SPEECH_KEY");
    const endpoint = montarEndpoint();
    const locale = process.env.AZURE_SPEECH_LOCALE?.trim() || "pt-BR";

    const definicao = {
      locales: [locale],
      phraseList: { phrases: VOCABULARIO.slice(0, MAX_FRASES) },
      // Relatorios institucionais: nada de mascarar palavras com asteriscos,
      // o texto tem que sair exatamente como foi dito.
      profanityFilterMode: "None",
    };

    const corpo = new FormData();
    corpo.append("audio", audio, nomeArquivo);
    corpo.append("definition", JSON.stringify(definicao));

    let resposta: Response;
    try {
      resposta = await fetch(endpoint, {
        method: "POST",
        headers: { "Ocp-Apim-Subscription-Key": chave },
        body: corpo,
      });
    } catch (erro) {
      throw new ErroTranscricao(
        "Não consegui falar com o serviço de transcrição. Verifique a internet e tente de novo.",
        `Falha de rede ao chamar a Azure: ${String(erro)}`,
        503,
      );
    }

    if (!resposta.ok) {
      const detalhe = await resposta.text().catch(() => "");
      throw new ErroTranscricao(
        mensagemPorStatus(resposta.status),
        `Azure Speech respondeu ${resposta.status}: ${detalhe.slice(0, 500)}`,
        resposta.status === 401 || resposta.status === 403 ? 500 : 502,
      );
    }

    const dados = (await resposta.json()) as RespostaFastTranscription;
    const texto = (dados.combinedPhrases ?? [])
      .map((trecho) => trecho.text?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();

    if (!texto) {
      throw new ErroTranscricao(
        "Não consegui identificar nenhuma fala neste áudio. Confira se o arquivo tem som e tente novamente.",
        "Azure Speech retornou combinedPhrases vazio",
        422,
      );
    }

    return {
      texto,
      duracaoSegundos:
        typeof dados.durationMilliseconds === "number"
          ? dados.durationMilliseconds / 1000
          : null,
      provedor: azureSpeech.nome,
    };
  },
};

function mensagemPorStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "A chave de acesso ao serviço de transcrição está inválida ou expirou. Avise o responsável técnico.";
  }
  if (status === 429) {
    return "O serviço de transcrição está ocupado no momento. Espere um minuto e tente de novo.";
  }
  if (status === 400) {
    return "O serviço não conseguiu ler este arquivo de áudio. Tente enviar o áudio original do WhatsApp, sem editar.";
  }
  return "O serviço de transcrição falhou. Tente novamente em alguns instantes.";
}
