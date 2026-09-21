import { NextResponse } from "next/server";

import { conferirSenha, criarCookieSessao, senhaConfigurada } from "@/lib/auth";

export const runtime = "nodejs";

/** Recebe a senha, confere e devolve o cookie de sessao. */
export async function POST(requisicao: Request) {
  if (!senhaConfigurada()) {
    return NextResponse.json({ ok: true });
  }

  let senhaEnviada = "";
  try {
    const corpo = (await requisicao.json()) as { senha?: unknown };
    senhaEnviada = typeof corpo.senha === "string" ? corpo.senha : "";
  } catch {
    senhaEnviada = "";
  }

  if (!conferirSenha(senhaEnviada)) {
    // Atraso curto para desencorajar tentativa automatizada de adivinhacao.
    await new Promise((resolver) => setTimeout(resolver, 600));
    return NextResponse.json(
      { erro: "Senha incorreta. Confira e tente de novo." },
      { status: 401 },
    );
  }

  const { nome, valor, maxAge } = await criarCookieSessao();
  const resposta = NextResponse.json({ ok: true });
  resposta.cookies.set(nome, valor, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
  return resposta;
}
