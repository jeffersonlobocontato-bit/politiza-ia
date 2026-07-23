export interface RaioXDados {
  nome: string;
  municipio: string;
  partido?: string;
  cargo?: string;
  cpf?: string;
  contexto?: string;
}

export interface AtivoParaRaioX {
  name?: string;
  municipality?: string;
  party?: string;
  position?: string;
  [key: string]: unknown;
}
