/** Resultado de uma transcricao bem-sucedida. */
export interface ResultadoTranscricao {
  /** Texto final, ja com os termos da ASPAR corrigidos. */
  texto: string;
  /** Duracao do audio em segundos, quando o provedor informa. */
  duracaoSegundos: number | null;
  /** Identificacao do provedor usado, para diagnostico. */
  provedor: string;
}

/**
 * Erro com duas faces: uma mensagem que a usuaria entende e um detalhe
 * tecnico que so vai para o log do servidor.
 */
export class ErroTranscricao extends Error {
  readonly mensagemUsuario: string;
  readonly status: number;

  constructor(mensagemUsuario: string, detalheTecnico: string, status = 502) {
    super(detalheTecnico);
    this.name = "ErroTranscricao";
    this.mensagemUsuario = mensagemUsuario;
    this.status = status;
  }
}

export interface Provedor {
  /** Nome curto, usado em logs e na tela de diagnostico. */
  readonly nome: string;
  /** Extensoes que este provedor aceita diretamente, sem conversao. */
  readonly extensoesAceitas: readonly string[];
  transcrever(audio: Blob, nomeArquivo: string): Promise<ResultadoTranscricao>;
}

/** Le uma variavel de ambiente obrigatoria ou explica o que falta configurar. */
export function envObrigatoria(nome: string): string {
  const valor = process.env[nome]?.trim();
  if (!valor) {
    throw new ErroTranscricao(
      "O sistema ainda não foi configurado. Avise o responsável técnico.",
      `Variavel de ambiente ausente: ${nome}`,
      500,
    );
  }
  return valor;
}
