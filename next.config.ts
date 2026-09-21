import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O áudio nunca é persistido: a rota /api/transcrever recebe o arquivo,
  // repassa para a Azure e descarta. Nada é gravado em disco nem em cache.
};

export default nextConfig;
