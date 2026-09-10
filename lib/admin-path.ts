const DEFAULT_ADMIN_PATH = "/admin";

export function getAdminPath(): string {
  const value = process.env.ADMIN_PATH?.trim();
  if (!value) return DEFAULT_ADMIN_PATH;
  if (!/^\/[a-z0-9][a-z0-9-]{10,79}$/.test(value) || value.startsWith("/api-")) {
    throw new Error("ADMIN_PATH deve começar com / e conter de 11 a 80 letras minúsculas, números ou hífens.");
  }
  return value;
}

export function getAdminMfaPath(): string {
  return `${getAdminPath()}-verificar`;
}
