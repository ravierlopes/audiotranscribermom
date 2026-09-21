import { azureOpenAIWhisper } from "./azureOpenAIWhisper";
import { azureSpeech } from "./azureSpeech";
import type { Provedor } from "./tipos";

export const PROVEDORES = {
  "azure-speech": azureSpeech,
  "azure-openai-whisper": azureOpenAIWhisper,
} as const;

export type NomeProvedor = keyof typeof PROVEDORES;

/**
 * Provedor em uso, definido pela variavel PROVEDOR_TRANSCRICAO.
 *
 * O padrao e `azure-speech` porque e o unico que aceita o OGG do WhatsApp sem
 * conversao e que suporta a lista de termos da ASPAR.
 */
export function provedorAtivo(): Provedor {
  const escolhido = process.env.PROVEDOR_TRANSCRICAO?.trim() as NomeProvedor | undefined;
  if (escolhido && escolhido in PROVEDORES) {
    return PROVEDORES[escolhido];
  }
  return azureSpeech;
}

export * from "./tipos";
