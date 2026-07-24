import { NextRequest, NextResponse } from "next/server";
import { getUserById, updateUserPermissions } from "@/lib/repo";
import {
  getDefaultPermissions,
  normalizePermissionOverrides,
  resolvePermissions,
} from "@/lib/permissions";
import { withErrorHandling } from "@/lib/api-handler";
import { requireApiUser } from "@/lib/auth";

export const PUT = withErrorHandling<{ params: Promise<{ id: string }> }>(async (
  req: NextRequest,
  { params }
) => {
  const { id } = await params;
  const owner = await requireApiUser();
  if (owner.role !== "OWNER") {
    return NextResponse.json({ error: "Somente o Dono pode alterar permissões." }, { status: 403 });
  }

  const target = await getUserById(id);
  if (!target || target.empresaId !== owner.empresaId) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "As permissões do Dono não podem ser reduzidas." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const reset = body.reset === true;
  const rawPermissions = body.permissions;
  if (!reset && (!rawPermissions || typeof rawPermissions !== "object" || Array.isArray(rawPermissions))) {
    return NextResponse.json({ error: "Informe as permissões do usuário." }, { status: 400 });
  }

  const overrides = reset ? null : normalizePermissionOverrides(rawPermissions);
  const updated = await updateUserPermissions(target.id, owner.empresaId, overrides);
  if (!updated) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  return NextResponse.json({
    ok: true,
    defaults: getDefaultPermissions(updated.role),
    overrides: updated.permissions ?? {},
    effective: resolvePermissions(updated.role, updated.permissions),
  });
});
