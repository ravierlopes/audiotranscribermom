/**
 * Testes de `corrigirTermos`.
 *
 * Rode com: npm test
 *
 * O ponto delicado aqui é que a Azure já devolve o texto acentuado. A correção
 * precisa consertar o que veio errado sem estragar o que veio certo, e os
 * índices usados nas substituições precisam continuar alinhados quando o texto
 * tem acentos. Os casos abaixo cobrem exatamente isso.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import { corrigirTermos, normalizarPreposicoes } from "../contexto.ts";

test("corrige siglas que o reconhecimento de voz separa em palavras", () => {
  assert.equal(
    corrigirTermos("Eu trabalho na as par do ministerio da cultura."),
    "Eu trabalho na ASPAR do Ministério da Cultura.",
  );
  assert.equal(corrigirTermos("Protocolamos no if fan."), "Protocolamos no IPHAN.");
});

test("corrige o nome da Lei Rouanet nas grafias que costumam sair", () => {
  assert.equal(corrigirTermos("O projeto vai pela lei rua net."), "O projeto vai pela Lei Rouanet.");
  assert.equal(corrigirTermos("captação pela lei ruanet"), "captação pela Lei Rouanet");
});

test("corrige nomes de lugares", () => {
  assert.equal(
    corrigirTermos("Fomos a brasilia e a sao joao del rei."),
    "Fomos a Brasília e a São João del-Rei.",
  );
});

test("preserva o texto que já veio acentuado e correto", () => {
  const original = "Visita ao Ministério da Cultura e à Câmara dos Deputados.";
  assert.equal(corrigirTermos(original), original);

  const outro = "Reunião na Comissão de Cultura sobre emenda de comissão.";
  assert.equal(corrigirTermos(outro), outro);
});

test("não altera acentos do restante da frase ao corrigir um termo", () => {
  assert.equal(
    corrigirTermos("Visita à câmara dos deputados e ao if fan."),
    "Visita à Câmara dos Deputados e ao IPHAN.",
  );
});

test("não casa no meio de outra palavra", () => {
  const frase = "As partes do processo e as paradas.";
  assert.equal(corrigirTermos(frase), frase);
});

test("texto sem nada a corrigir volta igual", () => {
  assert.equal(corrigirTermos("Bom dia, tudo bem com você?"), "Bom dia, tudo bem com você?");
  assert.equal(corrigirTermos(""), "");
});

test("cada trecho é corrigido uma vez só", () => {
  // "lei rua net" tem que vencer "rua net", que é a regra mais curta.
  assert.equal(corrigirTermos("a lei rua net"), "a Lei Rouanet");
});

/**
 * Os casos abaixo vieram de uma transcrição real feita pela Azure, que
 * devolveu "São João Del Rey tratando Da Lei Rouanet ... com Aspar".
 */
test("corrige as variantes de del-Rei que a Azure produz", () => {
  assert.equal(
    corrigirTermos("Estivemos em São João Del Rey."),
    "Estivemos em São João del-Rei.",
  );
  assert.equal(corrigirTermos("em sao joao delrey"), "em São João del-Rei");
});

test("corrige a sigla mesmo escrita como palavra comum", () => {
  assert.equal(corrigirTermos("reunião com Aspar"), "reunião com ASPAR");
});

test("rebaixa preposição capitalizada no meio da frase", () => {
  assert.equal(
    normalizarPreposicoes("tratando Da Lei Rouanet e De emenda"),
    "tratando da Lei Rouanet e de emenda",
  );
});

test("mantém a maiúscula da preposição que abre frase", () => {
  assert.equal(normalizarPreposicoes("Da reunião saiu um acordo."), "Da reunião saiu um acordo.");
  assert.equal(
    normalizarPreposicoes("Fomos a Betim. Do museu seguimos para a prefeitura."),
    "Fomos a Betim. Do museu seguimos para a prefeitura.",
  );
});

test("trata quebra de linha como início de frase", () => {
  assert.equal(
    normalizarPreposicoes("--- Áudio 1 ---\n\nDa agenda de ontem"),
    "--- Áudio 1 ---\n\nDa agenda de ontem",
  );
});

test("não mexe em palavra que apenas começa com a preposição", () => {
  assert.equal(normalizarPreposicoes("O Dado e a Dona Maria"), "O Dado e a Dona Maria");
});

test("reproduz a saída real da Azure já corrigida", () => {
  const daAzure =
    "Estivemos em São João Del Rey tratando Da Lei Rouanet e de emenda de bancada com Aspar do Ministério da Cultura.";
  const esperado =
    "Estivemos em São João del-Rei tratando da Lei Rouanet e de emenda de bancada com ASPAR do Ministério da Cultura.";
  assert.equal(normalizarPreposicoes(corrigirTermos(daAzure)), esperado);
});
