import { afterAll } from "vitest";
import { enterTenantDatabaseContext, prisma, runWithDatabaseContext } from "@/lib/prisma";
import { createEmpresa, createFilial, createProduct, createUser } from "@/lib/repo";
import type { Filial, Product } from "@/lib/types";

// A configuração do Vitest exige um Postgres exclusivo para testes e bloqueia
// qualquer URL que identifique a base principal. Cada teste também cria sua
// própria Empresa isolada e apaga o que criou ao final do arquivo.
const createdEmpresaIds: string[] = [];
let emailCounter = 0;
let documentCounter = 0;

function nextTestCnpj() {
  const base = String(10_000_000_000 + documentCounter++).padStart(12, "0");
  const digit = (value: string, weights: number[]) => {
    const total = value.split("").reduce((sum, current, index) => sum + Number(current) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const first = digit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = digit(base + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base}${first}${second}`;
}

afterAll(async () => {
  for (const empresaId of createdEmpresaIds) {
    await runWithDatabaseContext("tenant", empresaId, async () => {
      await prisma.movement.deleteMany({ where: { empresaId } });
      await prisma.pedido.deleteMany({ where: { empresaId } });
      await prisma.promotion.deleteMany({ where: { empresaId } });
      await prisma.product.deleteMany({ where: { empresaId } });
      await prisma.counter.deleteMany({ where: { filial: { empresaId } } });
      await prisma.user.deleteMany({ where: { empresaId } });
      await prisma.filial.deleteMany({ where: { empresaId } });
      await prisma.empresa.deleteMany({ where: { id: empresaId } });
    });
  }
  await prisma.$disconnect();
});

export async function seedFixture() {
  const empresa = await createEmpresa(
    `Empresa de Teste ${Math.random().toString(36).slice(2)}`,
    nextTestCnpj()
  );
  createdEmpresaIds.push(empresa.id);
  const fixture = await runWithDatabaseContext("tenant", empresa.id, async () => {
    await prisma.empresa.update({ where: { id: empresa.id }, data: { approved: true } });
    const filial = await createFilial(empresa.id, "Matriz");
    const user = await createUser({
      empresaId: empresa.id,
      name: "Usuário de Teste",
      email: `teste-${emailCounter++}-${Date.now()}@example.com`,
      passwordHash: "hash-fake",
      role: "OWNER",
    });
    return { empresa, filial, user };
  });
  enterTenantDatabaseContext(empresa.id);
  return fixture;
}

export async function seedProduct(
  filial: Pick<Filial, "id" | "empresaId">,
  overrides: Partial<Parameters<typeof createProduct>[0]> = {}
): Promise<Product> {
  return runWithDatabaseContext("tenant", filial.empresaId, () =>
    createProduct({
      empresaId: filial.empresaId,
      filialId: filial.id,
      name: overrides.name ?? "Produto de Teste",
      category: overrides.category ?? "Categoria",
      unit: overrides.unit ?? "un",
      costPrice: overrides.costPrice ?? 10,
      salePrice: overrides.salePrice ?? 20,
      currentStock: overrides.currentStock ?? 0,
      minStockAlert: overrides.minStockAlert ?? null,
      barcode: overrides.barcode ?? null,
      packageType: overrides.packageType ?? null,
      unitsPerPackage: overrides.unitsPerPackage ?? null,
    }),
  );
}
