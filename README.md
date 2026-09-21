# Transcritor de áudios — ASPAR / Ministério da Cultura

Sistema web para transcrever os áudios que chegam pelo WhatsApp. Feito para ser
usado por quem não tem familiaridade com tecnologia: abre o link, escolhe o
áudio, aperta um botão e copia o texto.

- Roda na nuvem — nada para instalar no computador.
- Funciona no celular, ao lado do WhatsApp.
- Aceita o arquivo `.ogg` do WhatsApp direto, sem conversão.
- Aceita vários áudios de uma vez e devolve tudo num texto só.
- Já conhece o vocabulário da ASPAR (Lei Rouanet, emenda de bancada, IPHAN,
  São João del-Rei...), então acerta os termos que os transcritores comuns erram.

---

## Como ela usa (é só isso)

1. Abre o link no celular ou no computador.
2. Digita a senha (uma vez só a cada 90 dias).
3. Toca em **Escolher o áudio** e pega o áudio do WhatsApp.
4. Aperta **Transcrever**.
5. Aperta **Copiar texto**.

No celular, dá para compartilhar o áudio direto do WhatsApp: abra o áudio,
toque em compartilhar e salve em *Arquivos*; depois escolha por ali.

---

## Passo a passo para colocar no ar

São duas etapas: criar o serviço de transcrição na Azure e publicar o site na
Vercel. Leva uns 20 minutos.

### Etapa 1 — Criar o serviço de transcrição na Azure

1. Entre no [portal da Azure](https://portal.azure.com) e crie um recurso
   **Speech** (Fala).
2. **Escolha o tipo de preço `S0` (Standard).** Este é o ponto mais importante
   desta etapa: a API de transcrição rápida que o sistema usa **não funciona no
   tipo gratuito `F0`**. Se criar como `F0`, as transcrições vão falhar.
3. Escolha uma região que ofereça *fast transcription* — a lista está em
   [regiões do serviço de Fala](https://learn.microsoft.com/azure/ai-services/speech-service/regions?tabs=stt).
   `eastus` e `brazilsouth` são escolhas comuns.
4. Terminada a criação, abra o recurso e vá em **Chaves e Ponto de Extremidade**.
   Anote a **Chave 1** e o **Ponto de extremidade**.

### Etapa 2 — Publicar o site

O site pode ficar na Vercel (grátis, mais simples) ou no Azure App Service
(tudo num lugar só, sem limite de tamanho de arquivo). O serviço de
transcrição continua na Azure nos dois casos.

#### Opção A — Vercel (recomendada para começar)

1. Entre em [vercel.com](https://vercel.com) com sua conta do GitHub.
2. **Add New → Project** e importe este repositório.
3. Antes de clicar em **Deploy**, abra **Environment Variables** e cadastre:

   | Nome | Valor |
   | --- | --- |
   | `AZURE_SPEECH_ENDPOINT` | o endpoint anotado na Etapa 1 |
   | `AZURE_SPEECH_KEY` | a chave anotada na Etapa 1 |
   | `SENHA_ACESSO` | a senha que ela vai digitar |

   Não cadastre `TAMANHO_MAXIMO_MB` aqui: na Vercel o teto é da plataforma,
   e o padrão de 4 MB é justamente o que cabe.

4. **Deploy**. Ao terminar, a Vercel te dá o link.

Se o código não estiver na branch padrão do repositório, ajuste em
**Settings → Git → Production Branch**.

#### Opção B — Azure App Service

```bash
git clone --depth 1 -b <branch> <url-do-repo> /tmp/app
bash /tmp/app/scripts/publicar-azure-app-service.sh
```

O script encontra o serviço de Fala já criado, reaproveita endpoint e chave,
cria o site e publica.

**Atenção à cota:** assinaturas do tipo Visual Studio costumam vir com cota
zero para App Service, e a criação do plano falha com *"Operation cannot be
completed without additional quota"*. A cota é concedida por SKU e por região,
então o script testa várias combinações antes de desistir. Se nenhuma passar,
peça aumento no portal (*Ajuda + Suporte → Nova solicitação → Limites de
serviço e assinatura*) ou use a Vercel.

A vantagem do App Service é não ter o teto de 4 MB por arquivo — lá o script
já configura `TAMANHO_MAXIMO_MB=25`, o que cobre cerca de 1h40 de áudio do
WhatsApp por arquivo.

---

## Quanto custa

O serviço de Fala da Azure no tipo `S0` cobra por hora de áudio transcrito — na
ordem de **US$ 1 a US$ 1,50 por hora**. Confira o valor atual e o da sua região
na [página de preços](https://azure.microsoft.com/pricing/details/cognitive-services/speech-services/),
porque esses números mudam.

Para ter uma ideia: relatórios de 2 minutos, dez por dia útil, dão cerca de
7 horas de áudio por mês, algo em torno de US$ 7 a US$ 10 mensais. Com US$ 100
de crédito, isso cobre bastante tempo de uso.

A Vercel não cobra nada no plano Hobby para um projeto deste tamanho.

Vale criar um **alerta de custo** na Azure (Cost Management > Alertas de
orçamento) para não ser surpreendido quando o crédito estiver acabando.

---

## Por que este modelo de transcrição

O pedido original era usar o melhor modelo aberto disponível. O sistema aceita
os dois caminhos, e o padrão é o primeiro:

**`azure-speech` (padrão) — Azure AI Speech, Fast Transcription**

- Aceita `.ogg`/`.opus` **direto do WhatsApp**. Nenhuma conversão no meio do
  caminho, que é justamente a parte que mais costuma quebrar num sistema assim.
- Aceita uma *phrase list*: mandamos as 113 expressões do
  [`lib/contexto.ts`](lib/contexto.ts) junto com o áudio, e é isso que faz
  "ASPAR" e "Lei Rouanet" saírem escritos certo.
- Resposta síncrona e rápida.

**`azure-openai-whisper` — Whisper**

Whisper é o melhor modelo **aberto** de transcrição e vai muito bem em
português. Ficou como alternativa por um motivo prático: a API do Azure OpenAI
**não aceita OGG/OPUS**. Quando este provedor está ativo, o navegador converte o
áudio para WAV antes de enviar — o que funciona, mas aumenta muito o tamanho do
arquivo e limita a duração do áudio a poucos minutos.

Para trocar, mude `PROVEDOR_TRANSCRICAO` para `azure-openai-whisper` e preencha
as variáveis `AZURE_OPENAI_*` do [`.env.example`](.env.example).

---

## Ajustar o vocabulário

Tudo que o sistema "sabe" sobre o trabalho dela está em
[`lib/contexto.ts`](lib/contexto.ts), em duas listas:

- **`VOCABULARIO`** — expressões que o reconhecedor deve esperar ouvir. É o que
  aumenta a chance de sair escrito certo. Escreva em português correto, com
  acentos.
- **`CORRECOES`** — consertos aplicados depois, no texto pronto. Cada linha é
  `["como costuma sair errado", "como deve ficar"]`. A comparação ignora acentos
  e maiúsculas.

Quando aparecer um nome novo que o sistema erra sempre — o nome de um deputado,
de um município, de um programa —, acrescente uma linha e publique de novo.
Não precisa mexer em mais nada.

```ts
// em VOCABULARIO
"Fundo de Apoio à Cultura",

// em CORRECOES
["fundo de apoio a cultura", "Fundo de Apoio à Cultura"],
```

---

## Limites

| | Vercel | Azure App Service |
| --- | --- | --- |
| Tamanho por arquivo | 4 MB (~17 min de WhatsApp) | 25 MB (~1h40), ajustável |
| Tempo por transcrição | 60s (plano Hobby) | sem limite prático |
| Custo da hospedagem | grátis | ~US$ 13/mês (plano B1) |

Em ambos: **10 áudios por envio**. Áudios de 1 a 3 minutos, que são o caso
real, transcrevem em poucos segundos e ficam longe de qualquer um desses
limites.

---

## Privacidade

O áudio sobe, é repassado para a Azure e descartado. Não é gravado em disco, em
banco de dados nem em cache — some quando a resposta termina. O texto só existe
na tela, até ela copiar ou fechar a página.

A senha protege o link; o conteúdo é institucional e não deve ficar aberto na
internet.

---

## Rodar na sua máquina

```bash
npm install
cp .env.example .env.local   # preencha as chaves da Azure
npm run dev                  # abre em http://localhost:3000
```

Outros comandos:

```bash
npm test        # testes da correção de termos
npm run build   # build de produção, inclui checagem de tipos
```

---

## Organização do código

```
app/
  page.tsx              decide entre a tela de senha e a de transcrição
  Login.tsx             tela de senha
  Transcritor.tsx       tela principal (escolher, transcrever, copiar)
  globals.css           estilo, pensado para celular e texto grande
  lib/converterAudio.ts converte o áudio no navegador quando o provedor exige
  api/
    entrar/             confere a senha e cria o cookie
    config/             informa à tela os formatos e limites aceitos
    transcrever/        recebe o áudio, chama o provedor, devolve o texto
lib/
  contexto.ts           VOCABULARIO e CORRECOES da ASPAR  <-- edite aqui
  auth.ts               senha e cookie de sessão
  limites.ts            limites de tamanho e quantidade
  providers/
    azureSpeech.ts      provedor padrão (Fast Transcription)
    azureOpenAIWhisper.ts  alternativa com Whisper
```
