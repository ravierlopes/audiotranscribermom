#!/usr/bin/env bash
#
# Publica o sistema no Azure App Service, no mesmo grupo de recursos onde já
# está o serviço de Fala. Assim tudo fica na Azure, num crédito só.
#
# O build é feito aqui, não no servidor. Um plano B1 tem CPU fraca, e deixar
# o App Service compilar estourava o tempo limite do Kudu (HTTP 504). Com o
# modo standalone do Next, o que sobe é um servidor já pronto de ~50 MB.
#
# Onde rodar: no Cloud Shell do portal da Azure (ícone >_ no topo).
#
#   bash publicar-azure-app-service.sh
#
set -euo pipefail

GRUPO="${GRUPO:-rg-transcritor-aspar}"
PLANO="${PLANO:-plano-transcritor}"
APP="${APP:-}"
BRANCH="${BRANCH:-claude/busy-albattani-xndrcy}"
REPO="${REPO:-https://github.com/ravierlopes/audiotranscribermom}"

# Assinaturas do tipo Visual Studio costumam vir com quota zerada para vários
# SKUs e regiões. Em vez de fixar um par e falhar, tentamos uma lista até
# achar um que a assinatura aceite.
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

if [ -z "${SENHA_ACESSO:-}" ]; then
  echo
  read -rsp "Senha que sua mãe vai digitar no site: " SENHA_ACESSO
  echo
fi
[ -n "$SENHA_ACESSO" ] || { echo "ERRO: a senha não pode ficar em branco." >&2; exit 1; }

# ---------------------------------------------------------------------------
# Plano: reaproveita o que existir, senão procura onde há quota.
# ---------------------------------------------------------------------------
echo
REGIAO_EXISTENTE="$(az appservice plan show -g "$GRUPO" -n "$PLANO" \
  --query location -o tsv 2>/dev/null || true)"

SKU=""
REGIAO=""

if [ -n "$REGIAO_EXISTENTE" ]; then
  # A região de um plano não muda depois de criado, então refazer a busca só
  # produziria erros até cair de novo na região certa.
  echo "==> Reaproveitando o plano '$PLANO', em $REGIAO_EXISTENTE"
  REGIAO="$REGIAO_EXISTENTE"
  SKU="$(az appservice plan show -g "$GRUPO" -n "$PLANO" --query sku.name -o tsv)"
else
  echo "==> Procurando onde a sua assinatura tem quota disponível"
  for CANDIDATO in $CANDIDATOS; do
    TENTA_SKU="${CANDIDATO%%:*}"
    TENTA_REGIAO="${CANDIDATO##*:}"
    printf "    %-3s em %-13s ... " "$TENTA_SKU" "$TENTA_REGIAO"
    if ERRO="$(az appservice plan create -g "$GRUPO" -n "$PLANO" --is-linux \
        --sku "$TENTA_SKU" -l "$TENTA_REGIAO" -o none 2>&1)"; then
      echo "disponível"
      SKU="$TENTA_SKU"; REGIAO="$TENTA_REGIAO"; break
    fi
    if echo "$ERRO" | grep -qi "quota"; then echo "sem quota"; else echo "indisponível"; fi
  done
fi

if [ -z "$SKU" ]; then
  echo
  echo "Nenhuma combinação de plano e região foi aceita pela sua assinatura." >&2
  echo "  1. Peça aumento de quota: Ajuda + Suporte > Nova solicitação >" >&2
  echo "     Limites de serviço e assinatura (cotas)." >&2
  echo "  2. Ou publique na Vercel, que não depende de cota." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Site: reaproveita o que existir no plano, senão cria.
# ---------------------------------------------------------------------------
if [ -z "$APP" ]; then
  APP="$(az webapp list -g "$GRUPO" --query "[0].name" -o tsv 2>/dev/null || true)"
fi

if [ -n "$APP" ] && az webapp show -g "$GRUPO" -n "$APP" -o none 2>/dev/null; then
  echo "==> Reaproveitando o site '$APP'"
else
  APP="transcritor-aspar-$RANDOM"
  echo "==> Descobrindo a versão de Node disponível"
  # O -o tsv devolve a linha inteira da tabela (nome, fim de suporte, SO...),
  # então ficamos só com a primeira coluna.
  RUNTIME="$(az webapp list-runtimes --os linux -o tsv \
    | awk '{print $1}' | grep -i '^NODE' | sort -Vr | head -1)"
  [ -n "$RUNTIME" ] || { echo "ERRO: não achei runtime de Node." >&2; exit 1; }
  echo "    usando: $RUNTIME"
  echo "==> Criando o site '$APP'"
  az webapp create -g "$GRUPO" -p "$PLANO" -n "$APP" --runtime "$RUNTIME" -o none
fi

# Sem isto, quem abrisse o endereço por http:// ficaria preso na tela de
# senha: o cookie de sessão é "secure" e o navegador não o envia fora de
# HTTPS, então a senha certa levaria de volta à mesma tela.
echo "==> Exigindo HTTPS"
az webapp update -g "$GRUPO" -n "$APP" --https-only true -o none

echo "==> Configurando as variáveis de ambiente"
# SCM_DO_BUILD_DURING_DEPLOYMENT=false porque o código já sobe compilado.
#
# HOSTNAME=0.0.0.0 é obrigatório: o servidor do Next faz bind em
# process.env.HOSTNAME, e o App Service preenche essa variável com o
# identificador do contêiner. Sem forçar, o site sobe e não atende ninguém.
az webapp config appsettings set -g "$GRUPO" -n "$APP" -o none --settings \
  SCM_DO_BUILD_DURING_DEPLOYMENT=false \
  HOSTNAME=0.0.0.0 \
  AZURE_SPEECH_ENDPOINT="$ENDPOINT" \
  AZURE_SPEECH_KEY="$CHAVE" \
  SENHA_ACESSO="$SENHA_ACESSO" \
  TAMANHO_MAXIMO_MB=25

az webapp config set -g "$GRUPO" -n "$APP" --startup-file "node server.js" -o none

# ---------------------------------------------------------------------------
# Build aqui e envio do resultado.
# ---------------------------------------------------------------------------
echo
echo "==> Baixando o código e compilando (alguns minutos)"
TEMP="$(mktemp -d)"
trap 'rm -rf "$TEMP"' EXIT
git clone --quiet --depth 1 --branch "$BRANCH" "$REPO" "$TEMP/app"

cd "$TEMP/app"

# O Node do Cloud Shell nem sempre e recente o bastante para o Next 16, e uma
# versao antiga falha no meio do build com erros que nao apontam a causa.
# Quando houver nvm por perto, subimos para a versao 22.
NODE_MAIOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAIOR" -lt 20 ]; then
  echo "    Node $NODE_MAIOR e antigo demais; tentando trocar para a versao 22"
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm install 22 >/dev/null 2>&1
    nvm use 22 >/dev/null 2>&1
  fi
fi
echo "    compilando com Node $(node --version)"

npm ci --silent
npm run build

# O modo standalone não copia sozinho os arquivos estáticos nem a pasta
# public: isso fica a cargo de quem publica.
cp -r .next/static .next/standalone/.next/static
[ -d public ] && cp -r public .next/standalone/public

echo
echo "==> Enviando ($(du -sh .next/standalone | cut -f1))"
( cd .next/standalone && zip -qr "$TEMP/app.zip" . )
az webapp deploy -g "$GRUPO" -n "$APP" --src-path "$TEMP/app.zip" --type zip --restart true

echo
echo "============================================================"
echo " Pronto. O link para mandar para ela:"
echo
echo "   https://$APP.azurewebsites.net"
echo
echo " A primeira abertura demora até um minuto."
echo
echo " Se não abrir, veja o que aconteceu com:"
echo "   az webapp log tail -g $GRUPO -n $APP"
echo "============================================================"
