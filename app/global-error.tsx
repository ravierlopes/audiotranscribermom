"use client";

/**
 * Tela mostrada quando algo quebra de forma inesperada.
 *
 * Existe por dois motivos. O primeiro é a usuária: a tela padrão do Next é em
 * inglês e fala de "application error", o que não ajuda ninguém a decidir o
 * que fazer. O segundo é o build: quando o projeto não traz a sua própria
 * tela, o Next gera e pré-renderiza uma interna (`/_global-error`), etapa que
 * falha em algumas versões de Node. Trazendo a nossa, essa etapa deixa de
 * existir.
 *
 * Um global-error precisa renderizar as próprias tags <html> e <body>, porque
 * substitui o layout inteiro quando entra em ação.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          margin: 0,
          padding: "24px 16px",
          background: "#f4f6f9",
          color: "#14181f",
          fontSize: 18,
          lineHeight: 1.6,
        }}
      >
        <main style={{ maxWidth: 520, margin: "10vh auto 0", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Algo deu errado</h1>

          <p style={{ color: "#545d6b", marginTop: 0 }}>
            Não foi culpa sua. Tente de novo — costuma funcionar na segunda vez.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              minHeight: 60,
              width: "100%",
              padding: "14px 20px",
              fontSize: 19,
              fontWeight: 700,
              color: "#fff",
              background: "#1f6feb",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
            }}
          >
            Tentar de novo
          </button>

          <p style={{ fontSize: 15, color: "#545d6b", marginTop: 24 }}>
            Se continuar aparecendo esta tela, avise o responsável técnico.
          </p>
        </main>
      </body>
    </html>
  );
}
