import { cookies } from "next/headers";
import { getIronSession, IronSessionData } from "iron-session";
import type { Role } from "./types";

export interface SessionData {
  userId: string;
  adegaId: string;
  adegaName: string;
  name: string;
  email: string;
  role: Role;
}

declare module "iron-session" {
  interface IronSessionData {
    user?: SessionData;
  }
}

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET não configurado (ou tem menos de 32 caracteres). Defina uma chave forte e única em .env — " +
      "nunca use um valor padrão, isso permitiria forjar sessões de qualquer usuário."
  );
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "adegas_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const cookieStore = cookies();
  return getIronSession<IronSessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  return session.user ?? null;
}
