import { cookies } from "next/headers";
import { getIronSession, IronSessionData } from "iron-session";
import type { Role } from "./types";

/** Expira por inatividade — se a última atividade foi há mais que isso, a sessão
 * é tratada como inválida mesmo com o cookie ainda presente e dentro do TTL absoluto. */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora

/** Tempo máximo absoluto de uma sessão, não importa quanta atividade tenha — depois
 * disso o cookie em si expira (reforçado pelo próprio iron-session no selo dos dados,
 * não só no Max-Age do cookie). */
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

export interface SessionData {
  userId: string;
  empresaId: string;
  empresaName: string;
  /** Null = OWNER (enxerga/administra todas as filiais da empresa). MANAGER e EMPLOYEE
   * são sempre travados na própria filial. */
  filialId: string | null;
  name: string;
  email: string;
  role: Role;
  /** Versão da senha no login; mudança no banco invalida imediatamente esta sessão. */
  sessionVersion?: number;
  /** Epoch ms da última requisição autenticada — atualizado no middleware a cada
   * requisição, usado só para o timeout de inatividade (não é o "criado em"). */
  lastActivityAt: number;
}

export interface AdminMfaData {
  codeHash?: string;
  expiresAt?: number;
  attempts?: number;
  verifiedAt?: number;
}

declare module "iron-session" {
  interface IronSessionData {
    user?: SessionData;
    adminMfa?: AdminMfaData;
  }
}

const EXAMPLE_SESSION_SECRET = "troque_esta_chave_super_secreta_com_pelo_menos_32_caracteres_para_producao";

if (
  !process.env.SESSION_SECRET ||
  process.env.SESSION_SECRET.length < 32 ||
  process.env.SESSION_SECRET === EXAMPLE_SESSION_SECRET
) {
  throw new Error(
    "SESSION_SECRET não configurado (ou tem menos de 32 caracteres). Defina uma chave forte e única em .env — " +
      "nunca use um valor padrão, isso permitiria forjar sessões de qualquer usuário."
  );
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "empresa_session",
  ttl: SESSION_TTL_SECONDS,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<IronSessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.user) return null;
  // Checagem de leitura, redundante com o middleware (que já limpa sessões ociosas) —
  // fica aqui como segunda trava, sem depender só da ordem de execução.
  if (Date.now() - session.user.lastActivityAt > IDLE_TIMEOUT_MS) return null;
  return session.user;
}
