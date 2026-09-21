#!/usr/bin/env bash
#
# Publica o sistema no Azure App Service, no mesmo grupo de recursos onde já
# está o serviço de Fala. Assim tudo fica na Azure, num crédito só.
#
# Onde rodar: no Cloud Shell do portal da Azure (ícone >_ no topo).
#
#   bash publicar-azure-app-service.sh
#
set -euo pipefail

GRUPO="${GRUPO:-rg-transcritor-aspar}"
REGIAO="${REGIAO:-brazilsouth}"
PLANO="${PLANO:-plano-transcritor}"
APP="${APP:-transcritor-aspar-$RANDOM}"
BRANCH="${BRANCH:-claude/busy-albattani-xndrcy}"
REPO="${REPO:-https://github.com/ravierlopes/audiotranscribermom}"

echo "==> Localizando o recurso de Fala já criado"
NOME_FALA="$(az cognitiveservices account list -g "$GRUPO" --query "[0].name" -o tsv)"
ENDPOINT="$(az cognitiveservices account show -n "$NOME_FALA" -g "$GRUPO" \
  --query properties.endpoint -o tsv)"
CHAVE="$(az cognitiveservices account keys list -n "$NOME_FALA" -g "$GRUPO" \
  --query key1 -o tsv)"
echo "    usando: $NOME_FALA"

if [ -z "${SENHA_ACESSO:-}" ]; then
  echo
  read -rsp "Senha que sua mãe vai digitar no site: " SENHA_ACESSO
  echo
fi

echo
echo "==> Criando o plano e o site"
az appservice plan create -g "$GRUPO" -n "$PLANO" --is-linux --sku B1 -l "$REGIAO" -o none
az webapp create -g "$GRUPO" -p "$PLANO" -n "$APP" --runtime "NODE:22-lts" -o none

echo
echo "==> Configurando as variáveis de ambiente"
# SCM_DO_BUILD_DURING_DEPLOYMENT faz o próprio App Service rodar
# `npm install` e `npm run build` depois que o código chega.
az webapp config appsettings set -g "$GRUPO" -n "$APP" -o none --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  AZURE_SPEECH_ENDPOINT="$ENDPOINT" \
  AZURE_SPEECH_KEY="$CHAVE" \
  SENHA_ACESSO="$SENHA_ACESSO" \
  TAMANHO_MAXIMO_MB=25

az webapp config set -g "$GRUPO" -n "$APP" --startup-file "npm start" -o none

echo
echo "==> Enviando o código"
TEMP="$(mktemp -d)"
git clone --depth 1 --branch "$BRANCH" "$REPO" "$TEMP/app"
cd "$TEMP/app"
zip -qr "$TEMP/app.zip" . -x ".git/*"
az webapp deploy -g "$GRUPO" -n "$APP" --src-path "$TEMP/app.zip" --type zip
cd - > /dev/null
rm -rf "$TEMP"

echo
echo "============================================================"
echo " Pronto. O link para mandar para ela:"
echo
echo "   https://$APP.azurewebsites.net"
echo
echo " A primeira abertura demora um pouco, porque o site ainda"
echo " está sendo montado. Depois fica rápido."
echo "============================================================"
