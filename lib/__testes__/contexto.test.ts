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

import { corrigirTermos } from "../contexto.ts";

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
