import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O áudio nunca é persistido: a rota /api/transcrever recebe o arquivo,
  // repassa para a Azure e descarta. Nada é gravado em disco nem em cache.

  // Gera em .next/standalone um servidor pronto, com apenas as dependências
  // que o código realmente usa. Isso permite compilar antes de publicar e
  // enviar ~50 MB em vez de ~400 MB de node_modules — e, principalmente,
  // evita que o servidor tenha que compilar sozinho, que é o que estourava
  // o tempo limite do Azure App Service num plano B1.
  output: "standalone",
};

export default nextConfig;
