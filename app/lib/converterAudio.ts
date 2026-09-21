/**
 * Conversao de audio no navegador.
 *
 * So entra em acao quando o provedor configurado nao aceita o formato do
 * arquivo - na pratica, quando o provedor e o Whisper do Azure OpenAI, que
 * nao le OGG/OPUS, justamente o formato que o WhatsApp exporta.
 *
 * Com o provedor padrao (Azure AI Speech) nada disso roda: o arquivo vai
 * direto como veio do WhatsApp.
 */

/** 16 kHz mono e o suficiente para fala e gera o menor arquivo possivel. */
const TAXA_AMOSTRAGEM = 16000;

export function extensaoDe(nomeArquivo: string): string {
  const ponto = nomeArquivo.lastIndexOf(".");
  if (ponto < 0) return "";
  return nomeArquivo.slice(ponto + 1).toLowerCase();
}

export function precisaConverter(nomeArquivo: string, extensoesAceitas: readonly string[]): boolean {
  const extensao = extensaoDe(nomeArquivo);
  if (!extensao) return false;
  return !extensoesAceitas.includes(extensao);
}

type ContextoDeAudio = typeof AudioContext;

function obterAudioContext(): ContextoDeAudio {
  const janela = window as unknown as {
    AudioContext?: ContextoDeAudio;
    webkitAudioContext?: ContextoDeAudio;
  };
  const Contexto = janela.AudioContext ?? janela.webkitAudioContext;
  if (!Contexto) {
    throw new Error("Este navegador não consegue preparar o áudio. Tente pelo Chrome ou Edge.");
  }
  return Contexto;
}

/**
 * Le o arquivo, mistura os canais em um so, reamostra para 16 kHz e devolve
 * um WAV PCM de 16 bits.
 */
export async function converterParaWav(arquivo: File): Promise<Blob> {
  const dados = await arquivo.arrayBuffer();

  const Contexto = obterAudioContext();
  const contexto = new Contexto();
  let decodificado: AudioBuffer;
  try {
    decodificado = await contexto.decodeAudioData(dados);
  } catch {
    throw new Error(
      "Não consegui ler este arquivo de áudio. Envie o áudio original do WhatsApp, sem editar.",
    );
  } finally {
    void contexto.close();
  }

  const amostras = await reamostrarParaMono(decodificado, TAXA_AMOSTRAGEM);
  return montarWav(amostras, TAXA_AMOSTRAGEM);
}

/** Usa um contexto offline para juntar os canais e reamostrar de uma vez so. */
async function reamostrarParaMono(entrada: AudioBuffer, taxaDestino: number): Promise<Float32Array> {
  const quadros = Math.max(1, Math.ceil((entrada.duration * taxaDestino)));
  const offline = new OfflineAudioContext(1, quadros, taxaDestino);

  const fonte = offline.createBufferSource();
  fonte.buffer = entrada;
  fonte.connect(offline.destination);
  fonte.start(0);

  const renderizado = await offline.startRendering();
  return renderizado.getChannelData(0);
}

/** Escreve o cabecalho RIFF e as amostras em PCM 16 bits. */
function montarWav(amostras: Float32Array, taxaAmostragem: number): Blob {
  const bytesPorAmostra = 2;
  const buffer = new ArrayBuffer(44 + amostras.length * bytesPorAmostra);
  const visao = new DataView(buffer);

  const escreverTexto = (posicao: number, texto: string) => {
    for (let i = 0; i < texto.length; i++) {
      visao.setUint8(posicao + i, texto.charCodeAt(i));
    }
  };

  const tamanhoDados = amostras.length * bytesPorAmostra;

  escreverTexto(0, "RIFF");
  visao.setUint32(4, 36 + tamanhoDados, true);
  escreverTexto(8, "WAVE");
  escreverTexto(12, "fmt ");
  visao.setUint32(16, 16, true); // tamanho do bloco fmt
  visao.setUint16(20, 1, true); // PCM sem compressao
  visao.setUint16(22, 1, true); // mono
  visao.setUint32(24, taxaAmostragem, true);
  visao.setUint32(28, taxaAmostragem * bytesPorAmostra, true); // bytes por segundo
  visao.setUint16(32, bytesPorAmostra, true); // alinhamento de bloco
  visao.setUint16(34, 16, true); // bits por amostra
  escreverTexto(36, "data");
  visao.setUint32(40, tamanhoDados, true);

  let posicao = 44;
  for (let i = 0; i < amostras.length; i++) {
    // Corta o que passar de -1..1 antes de converter, senao estoura e distorce.
    const amostra = Math.max(-1, Math.min(1, amostras[i]));
    visao.setInt16(posicao, amostra < 0 ? amostra * 0x8000 : amostra * 0x7fff, true);
    posicao += bytesPorAmostra;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function trocarExtensaoParaWav(nomeArquivo: string): string {
  const ponto = nomeArquivo.lastIndexOf(".");
  const base = ponto > 0 ? nomeArquivo.slice(0, ponto) : nomeArquivo;
  return `${base}.wav`;
}
