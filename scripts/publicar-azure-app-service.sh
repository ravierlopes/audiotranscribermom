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
PLANO="${PLANO:-plano-transcritor}"
APP="${APP:-transcritor-aspar-$RANDOM}"
BRANCH="${BRANCH:-claude/busy-albattani-xndrcy}"
REPO="${REPO:-https://github.com/ravierlopes/audiotranscribermom}"

# Assinaturas do tipo Visual Studio costumam vir com quota zerada para vários
# SKUs e regiões. Em vez de fixar um par e falhar, tentamos uma lista até
# achar um que a assinatura aceite. B1 vem primeiro por ser mais robusto que
# o F1, que tem 1 GB de memória e limite de CPU por dia.
CANDIDATOS="${CANDIDATOS:-
B1:brazilsouth
B1:eastus2
B1:eastus
B1:westus3
B1:centralus
B1:westeurope
F1:brazilsouth
F1:eastus2
F1:eastus
}"

echo "==> Localizando o recurso de Fala já criado"
NOME_FALA="$(az cognitiveservices account list -g "$GRUPO" --query "[0].name" -o tsv)"
if [ -z "$NOME_FALA" ]; then
  echo "ERRO: nenhum recurso de Fala encontrado em '$GRUPO'." >&2
  echo "Rode antes o criar-recurso-azure.sh." >&2
  exit 1
fi
ENDPOINT="$(az cognitiveservices account show -n "$NOME_FALA" -g "$GRUPO" \
  --query properties.endpoint -o tsv)"
CHAVE="$(az cognitiveservices account keys list -n "$NOME_FALA" -g "$GRUPO" \
  --query key1 -o tsv)"
echo "    usando: $NOME_FALA"

# O nome exato do runtime muda com o tempo ("NODE:22-lts", "NODE:20-lts"...).
# Em vez de fixar um que pode sumir, perguntamos qual existe hoje.
echo
echo "==> Descobrindo a versão de Node disponível"
RUNTIME="$(az webapp list-runtimes --os linux -o tsv | grep -i '^NODE' | sort -Vr | head -1)"
[ -n "$RUNTIME" ] || { echo "ERRO: não achei runtime de Node." >&2; exit 1; }
echo "    usando: $RUNTIME"

if [ -z "${SENHA_ACESSO:-}" ]; then
  echo
  read -rsp "Senha que sua mãe vai digitar no site: " SENHA_ACESSO
  echo
fi
[ -n "$SENHA_ACESSO" ] || { echo "ERRO: a senha não pode ficar em branco." >&2; exit 1; }

echo
echo "==> Procurando onde a sua assinatura tem quota disponível"
SKU=""
REGIAO=""
for CANDIDATO in $CANDIDATOS; do
  TENTA_SKU="${CANDIDATO%%:*}"
  TENTA_REGIAO="${CANDIDATO##*:}"
  printf "    %-3s em %-13s ... " "$TENTA_SKU" "$TENTA_REGIAO"

  if ERRO="$(az appservice plan create -g "$GRUPO" -n "$PLANO" --is-linux \
      --sku "$TENTA_SKU" -l "$TENTA_REGIAO" -o none 2>&1)"; then
    echo "disponível"
    SKU="$TENTA_SKU"
    REGIAO="$TENTA_REGIAO"
    break
  fi

  if echo "$ERRO" | grep -qi "quota"; then
    echo "sem quota"
  else
    echo "indisponível"
  fi
done

if [ -z "$SKU" ]; then
  echo
  echo "Nenhuma combinação de plano e região foi aceita pela sua assinatura." >&2
  echo "Dois caminhos a partir daqui:" >&2
  echo "  1. Pedir aumento de quota no portal: Ajuda + Suporte > Nova" >&2
  echo "     solicitação > Limites de serviço e assinatura (cotas)." >&2
  echo "  2. Publicar na Vercel, que é gratuita e não depende de cota." >&2
  exit 1
fi

echo "    escolhido: $SKU em $REGIAO"

echo
echo "==> Criando o site"
az webapp create -g "$GRUPO" -p "$PLANO" -n "$APP" --runtime "$RUNTIME" -o none

# Sem isto, quem abrisse o endereço por http:// ficaria preso na tela de
# senha: o cookie de sessão é "secure" e o navegador não o envia fora de
# HTTPS, então a senha certa levaria de volta à mesma tela.
echo "==> Exigindo HTTPS"
az webapp update -g "$GRUPO" -n "$APP" --https-only true -o none

echo "==> Configurando as variáveis de ambiente"
# SCM_DO_BUILD_DURING_DEPLOYMENT faz o próprio App Service rodar
# `npm install` e `npm run build` depois que o código chega.
#
# NPM_CONFIG_PRODUCTION=false é necessário porque o build precisa do
# TypeScript, que vive em devDependencies. Sem isso o npm pula essas
# dependências e o build falha.
az webapp config appsettings set -g "$GRUPO" -n "$APP" -o none --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=true \
  NPM_CONFIG_PRODUCTION=false \
  AZURE_SPEECH_ENDPOINT="$ENDPOINT" \
  AZURE_SPEECH_KEY="$CHAVE" \
  SENHA_ACESSO="$SENHA_ACESSO" \
  TAMANHO_MAXIMO_MB=25

az webapp config set -g "$GRUPO" -n "$APP" --startup-file "npm start" -o none

echo
echo "==> Enviando o código (o build roda no servidor e demora alguns minutos)"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
git clone --quiet --depth 1 --branch "$BRANCH" "$REPO" "$TEMP/app"
( cd "$TEMP/app" && zip -qr "$TEMP/app.zip" . -x ".git/*" )
az webapp deploy -g "$GRUPO" -n "$APP" --src-path "$TEMP/app.zip" --type zip

echo
echo "============================================================"
echo " Pronto. O link para mandar para ela:"
echo
echo "   https://$APP.azurewebsites.net"
echo
echo " A primeira abertura demora 1 a 2 minutos, porque o site"
echo " ainda está sendo montado. Depois fica rápido."
echo
echo " Se algo não abrir, veja o que aconteceu com:"
echo "   az webapp log tail -g $GRUPO -n $APP"
echo "============================================================"
