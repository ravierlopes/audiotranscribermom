import Login from "./Login";
import Transcritor from "./Transcritor";
import { sessaoValida } from "@/lib/auth";

/** A pagina depende do cookie de sessao, entao nao pode ser pre-renderizada. */
export const dynamic = "force-dynamic";

export default async function Pagina() {
  if (!(await sessaoValida())) {
    return <Login />;
  }
  return <Transcritor />;
}
