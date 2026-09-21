"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { converterParaWav, precisaConverter, trocarExtensaoParaWav } from "./lib/converterAudio";

/** Valores de reserva ate o servidor responder com a configuracao real. */
const CONFIG_PADRAO = {
  extensoesAceitas: ["ogg", "opus", "oga", "m4a", "mp3", "wav", "aac", "flac", "webm", "mp4", "amr"],
  tamanhoMaximoBytes: 4 * 1024 * 1024,
  maximoArquivos: 10,
};

type Estado = "aguardando" | "processando" | "pronto" | "falhou";

interface ItemArquivo {
  id: string;
  arquivo: File;
  estado: Estado;
  texto?: string;
  erro?: string;
}

interface Config {
  extensoesAceitas: string[];
  tamanhoMaximoBytes: number;
  maximoArquivos: number;
}

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function rotuloEstado(estado: Estado): string {
  switch (estado) {
    case "aguardando":
      return "na fila";
    case "processando":
      return "transcrevendo...";
    case "pronto":
      return "pronto";
    case "falhou":
      return "falhou";
  }
}

export default function Transcritor() {
  const [config, definirConfig] = useState<Config>(CONFIG_PADRAO);
  const [itens, definirItens] = useState<ItemArquivo[]>([]);
  const [processando, definirProcessando] = useState(false);
  const [indiceAtual, definirIndiceAtual] = useState(0);
  const [textoFinal, definirTextoFinal] = useState<string | null>(null);
  const [avisoTopo, definirAvisoTopo] = useState<string | null>(null);
  const [copiado, definirCopiado] = useState(false);
  const [arrastando, definirArrastando] = useState(false);

  const entradaArquivo = useRef<HTMLInputElement>(null);
  const areaResultado = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let ativo = true;
    fetch("/api/config")
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados: Config | null) => {
        if (ativo && dados) definirConfig(dados);
      })
      .catch(() => {
        // Sem a configuracao do servidor seguimos com os valores padrao.
      });
    return () => {
      ativo = false;
    };
  }, []);

  const adicionarArquivos = useCallback(
    (novos: FileList | File[]) => {
      definirAvisoTopo(null);
      const lista = Array.from(novos);
      const aceitos: ItemArquivo[] = [];
      const recusados: string[] = [];

      for (const arquivo of lista) {
        if (arquivo.size > config.tamanhoMaximoBytes) {
          recusados.push(
            `"${arquivo.name}" tem ${formatarTamanho(arquivo.size)}, acima do limite de ${formatarTamanho(config.tamanhoMaximoBytes)}`,
          );
          continue;
        }
        if (arquivo.size === 0) {
          recusados.push(`"${arquivo.name}" está vazio`);
          continue;
        }
        aceitos.push({
          id: `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          arquivo,
          estado: "aguardando",
        });
      }

      definirItens((anteriores) => {
        const combinados = [...anteriores, ...aceitos];
        if (combinados.length > config.maximoArquivos) {
          recusados.push(`só dá para enviar ${config.maximoArquivos} áudios por vez`);
          return combinados.slice(0, config.maximoArquivos);
        }
        return combinados;
      });

      if (recusados.length > 0) {
        definirAvisoTopo(`Não deu para incluir: ${recusados.join("; ")}.`);
      }
    },
    [config.maximoArquivos, config.tamanhoMaximoBytes],
  );

  function removerItem(id: string) {
    definirItens((anteriores) => anteriores.filter((item) => item.id !== id));
  }

  function recomecar() {
    definirItens([]);
    definirTextoFinal(null);
    definirAvisoTopo(null);
    definirCopiado(false);
    definirIndiceAtual(0);
    if (entradaArquivo.current) entradaArquivo.current.value = "";
  }

  /** Envia um arquivo e devolve o texto, convertendo antes se for preciso. */
  async function transcreverUm(arquivo: File): Promise<string> {
    let corpoAudio: Blob = arquivo;
    let nomeEnviado = arquivo.name;

    if (precisaConverter(arquivo.name, config.extensoesAceitas)) {
      corpoAudio = await converterParaWav(arquivo);
      nomeEnviado = trocarExtensaoParaWav(arquivo.name);

      if (corpoAudio.size > config.tamanhoMaximoBytes) {
        throw new Error(
          `Depois de preparado, este áudio ficou com ${formatarTamanho(corpoAudio.size)}, ` +
            `acima do limite de ${formatarTamanho(config.tamanhoMaximoBytes)}. ` +
            `Peça o áudio em partes menores.`,
        );
      }
    }

    const formulario = new FormData();
    formulario.append("audio", corpoAudio, nomeEnviado);
    formulario.append("nome", nomeEnviado);

    const resposta = await fetch("/api/transcrever", { method: "POST", body: formulario });
    const dados = (await resposta.json().catch(() => ({}))) as { texto?: string; erro?: string };

    if (!resposta.ok) {
      throw new Error(dados.erro ?? "Não consegui transcrever este áudio.");
    }
    return (dados.texto ?? "").trim();
  }

  async function transcreverTudo() {
    if (itens.length === 0 || processando) return;

    definirProcessando(true);
    definirTextoFinal(null);
    definirAvisoTopo(null);
    definirCopiado(false);

    // Trabalhamos sobre uma copia: o estado do React e atualizado a cada
    // passo so para a tela acompanhar o progresso.
    const resultados: ItemArquivo[] = itens.map((item) => ({ ...item, estado: "aguardando" }));
    definirItens(resultados.map((item) => ({ ...item })));

    for (let i = 0; i < resultados.length; i++) {
      definirIndiceAtual(i);
      resultados[i] = { ...resultados[i], estado: "processando", erro: undefined };
      definirItens(resultados.map((item) => ({ ...item })));

      try {
        const texto = await transcreverUm(resultados[i].arquivo);
        resultados[i] = { ...resultados[i], estado: "pronto", texto };
      } catch (erro) {
        resultados[i] = {
          ...resultados[i],
          estado: "falhou",
          erro: erro instanceof Error ? erro.message : "Não consegui transcrever este áudio.",
        };
      }
      definirItens(resultados.map((item) => ({ ...item })));
    }

    definirProcessando(false);

    const prontos = resultados.filter((item) => item.estado === "pronto" && item.texto);
    const falhas = resultados.filter((item) => item.estado === "falhou");

    if (prontos.length === 0) {
      definirAvisoTopo(
        falhas[0]?.erro ?? "Não consegui transcrever os áudios. Tente novamente.",
      );
      return;
    }

    // Com um audio so, o texto vai limpo. Com varios, cada trecho ganha um
    // titulo para nao virar um bloco unico confuso.
    const montado =
      prontos.length === 1
        ? (prontos[0].texto ?? "")
        : prontos
            .map((item, indice) => `--- Áudio ${indice + 1}: ${item.arquivo.name} ---\n\n${item.texto}`)
            .join("\n\n");

    definirTextoFinal(montado);

    if (falhas.length > 0) {
      definirAvisoTopo(
        `${falhas.length} de ${resultados.length} áudios falharam. O texto abaixo traz os que deram certo.`,
      );
    }
  }

  async function copiar() {
    const texto = textoFinal ?? "";
    if (!texto) return;

    try {
      await navigator.clipboard.writeText(texto);
      definirCopiado(true);
      window.setTimeout(() => definirCopiado(false), 2500);
    } catch {
      // Navegador sem permissao de area de transferencia: selecionamos o
      // texto para que baste um Ctrl+C.
      areaResultado.current?.select();
      definirAvisoTopo(
        "Seu navegador não deixou copiar sozinho. O texto já está selecionado: aperte Ctrl+C.",
      );
    }
  }

  function baixar() {
    const texto = textoFinal ?? "";
    if (!texto) return;

    const hoje = new Date();
    const carimbo = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `transcricao-${carimbo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const totalItens = itens.length;
  const rotuloBotao = useMemo(() => {
    if (processando) {
      return totalItens > 1
        ? `Transcrevendo ${indiceAtual + 1} de ${totalItens}...`
        : "Transcrevendo...";
    }
    return totalItens > 1 ? `Transcrever os ${totalItens} áudios` : "Transcrever";
  }, [processando, indiceAtual, totalItens]);

  return (
    <main className="pagina">
      <header className="cabecalho">
        <h1>Transcrever áudio</h1>
        <p>Envie o áudio do WhatsApp e receba o texto escrito.</p>
      </header>

      {avisoTopo && (
        <div className="aviso aviso-erro" role="alert">
          {avisoTopo}
        </div>
      )}

      {textoFinal === null ? (
        <>
          <section className="cartao">
            <h2 className="passo-titulo">
              <span className="passo-numero" aria-hidden="true">
                1
              </span>
              Escolha o áudio
            </h2>

            <input
              ref={entradaArquivo}
              type="file"
              className="visualmente-oculto"
              accept="audio/*,video/mp4,.ogg,.opus,.oga,.m4a,.mp3,.wav,.aac,.amr"
              multiple
              onChange={(evento) => {
                if (evento.target.files) adicionarArquivos(evento.target.files);
                evento.target.value = "";
              }}
            />

            <button
              type="button"
              className={`area-solta${arrastando ? " arrastando" : ""}`}
              onClick={() => entradaArquivo.current?.click()}
              onDragOver={(evento) => {
                evento.preventDefault();
                definirArrastando(true);
              }}
              onDragLeave={() => definirArrastando(false)}
              onDrop={(evento) => {
                evento.preventDefault();
                definirArrastando(false);
                if (evento.dataTransfer.files.length > 0) {
                  adicionarArquivos(evento.dataTransfer.files);
                }
              }}
              disabled={processando}
            >
              <span className="area-solta-icone" aria-hidden="true">
                🎤
              </span>
              <span className="area-solta-principal">
                {totalItens > 0 ? "Escolher mais um áudio" : "Toque aqui para escolher o áudio"}
              </span>
              <span className="area-solta-apoio">
                No celular, use &ldquo;Arquivos&rdquo; ou compartilhe o áudio direto do WhatsApp.
                No computador, você também pode arrastar o arquivo até aqui.
              </span>
            </button>
          </section>

          {totalItens > 0 && (
            <section className="cartao">
              <h2 className="passo-titulo">
                <span className="passo-numero" aria-hidden="true">
                  2
                </span>
                Confira e transcreva
              </h2>

              <ul className="lista-arquivos">
                {itens.map((item) => (
                  <li key={item.id} className="item-arquivo">
                    <div className="item-arquivo-dados">
                      <div className="item-arquivo-nome">{item.arquivo.name}</div>
                      <div className="item-arquivo-meta">
                        {formatarTamanho(item.arquivo.size)}
                        {item.erro ? ` — ${item.erro}` : ""}
                      </div>
                    </div>

                    {processando || item.estado !== "aguardando" ? (
                      <span className={`item-arquivo-estado estado-${item.estado}`}>
                        {rotuloEstado(item.estado)}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="botao botao-texto"
                        onClick={() => removerItem(item.id)}
                        aria-label={`Tirar ${item.arquivo.name} da lista`}
                      >
                        tirar
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {processando && (
                <div className="progresso" role="status">
                  <span className="girando" aria-hidden="true" />
                  <span className="progresso-texto">
                    <strong>Transcrevendo...</strong>
                    <span>Leva alguns segundos. Deixe esta tela aberta.</span>
                  </span>
                </div>
              )}

              <button
                type="button"
                className="botao"
                onClick={transcreverTudo}
                disabled={processando}
              >
                {rotuloBotao}
              </button>
            </section>
          )}
        </>
      ) : (
        <section className="cartao">
          <h2 className="passo-titulo">
            <span className="passo-numero" aria-hidden="true">
              3
            </span>
            Texto pronto
          </h2>

          {copiado && (
            <div className="aviso aviso-sucesso" role="status">
              Texto copiado. Agora é só colar onde precisar.
            </div>
          )}

          <textarea
            ref={areaResultado}
            className="resultado"
            value={textoFinal}
            onChange={(evento) => definirTextoFinal(evento.target.value)}
            aria-label="Texto transcrito"
            spellCheck
          />

          <p className="dica-resultado">
            Pode corrigir o texto aqui mesmo antes de copiar.
          </p>

          <div className="linha-botoes">
            <button type="button" className="botao" onClick={copiar}>
              Copiar texto
            </button>
            <button type="button" className="botao botao-secundario" onClick={baixar}>
              Baixar em arquivo
            </button>
          </div>

          <div className="linha-botoes" style={{ marginTop: 12 }}>
            <button type="button" className="botao botao-secundario" onClick={recomecar}>
              Transcrever outro áudio
            </button>
          </div>
        </section>
      )}

      <p className="rodape">
        O áudio é usado só para gerar o texto e não fica guardado em lugar nenhum.
      </p>
    </main>
  );
}
