#!/usr/bin/env bash
#
# Cria o recurso de transcrição na Azure.
#
# Onde rodar: no Cloud Shell do portal da Azure (ícone >_ no topo da página),
# que já vem autenticado. Não precisa instalar nada.
#
# Uso:
#   bash criar-recurso-azure.sh
#
set -euo pipefail

REGIAO="${REGIAO:-brazilsouth}"      # brazilsouth suporta fast transcription
GRUPO="${GRUPO:-rg-transcritor-aspar}"
NOME="${NOME:-transcritor-aspar-$RANDOM}"

echo "==> Assinatura em uso:"
az account show --query "{nome:name, id:id}" -o table

echo
echo "==> Garantindo que o provedor Microsoft.CognitiveServices está registrado"
az provider register --namespace Microsoft.CognitiveServices --wait

echo
echo "==> Criando o grupo de recursos '$GRUPO' em '$REGIAO'"
az group create --name "$GRUPO" --location "$REGIAO" -o none

echo
echo "==> Criando o recurso de Fala '$NOME' no tipo S0"
# O tipo S0 é obrigatório: a API de transcrição rápida não existe no tipo
# gratuito F0.
az cognitiveservices account create \
  --name "$NOME" \
  --resource-group "$GRUPO" \
  --kind SpeechServices \
  --sku S0 \
  --location "$REGIAO" \
  --yes \
  -o none

ENDPOINT="$(az cognitiveservices account show \
  --name "$NOME" --resource-group "$GRUPO" \
  --query properties.endpoint -o tsv)"

CHAVE="$(az cognitiveservices account keys list \
  --name "$NOME" --resource-group "$GRUPO" \
  --query key1 -o tsv)"

echo
echo "============================================================"
echo " Pronto. Cadastre estes dois valores na Vercel:"
echo "============================================================"
echo
echo "AZURE_SPEECH_ENDPOINT = $ENDPOINT"
echo "AZURE_SPEECH_KEY      = $CHAVE"
echo
echo "A chave é secreta: copie direto para a Vercel e não cole em"
echo "conversas, capturas de tela ou no código."
echo "============================================================"
