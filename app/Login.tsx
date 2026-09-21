"use client";

import { useState } from "react";

/** Tela de senha. Uma unica caixa, sem cadastro e sem "esqueci minha senha". */
export default function Login() {
  const [senha, definirSenha] = useState("");
  const [erro, definirErro] = useState<string | null>(null);
  const [enviando, definirEnviando] = useState(false);

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    definirErro(null);
    definirEnviando(true);

    try {
      const resposta = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });

      if (resposta.ok) {
        // Recarrega para que o servidor renderize a tela de transcricao.
        window.location.reload();
        return;
      }

      const dados = (await resposta.json().catch(() => ({}))) as { erro?: string };
      definirErro(dados.erro ?? "Senha incorreta. Confira e tente de novo.");
    } catch {
      definirErro("Não consegui verificar a senha. Confira sua internet e tente de novo.");
    } finally {
      definirEnviando(false);
    }
  }

  return (
    <main className="login">
      <div className="cabecalho">
        <h1>Transcrever áudio</h1>
        <p>Digite a senha para entrar.</p>
      </div>

      <form className="cartao" onSubmit={entrar}>
        {erro && (
          <div className="aviso aviso-erro" role="alert">
            {erro}
          </div>
        )}

        <label htmlFor="senha">Senha</label>
        <input
          id="senha"
          className="campo-senha"
          type="password"
          value={senha}
          onChange={(evento) => definirSenha(evento.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="Digite aqui"
        />

        <button className="botao" type="submit" disabled={enviando || senha.length === 0}>
          {enviando ? "Verificando..." : "Entrar"}
        </button>

        <p className="dica-resultado" style={{ marginTop: 16, marginBottom: 0 }}>
          A senha fica guardada neste aparelho por 90 dias. Você só precisa
          digitar de novo depois desse prazo.
        </p>
      </form>
    </main>
  );
}
