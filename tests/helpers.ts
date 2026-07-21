import { afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAdega, createProduct, createUser } from "@/lib/repo";
import type { Product } from "@/lib/types";

// Os testes rodam contra o mesmo Postgres (Neon) usado em desenvolvimento, mas
// cada teste cria sua própria Adega isolada (nunca toca nos dados reais/seed),
// e tudo o que foi criado é apagado ao final do arquivo de teste.
const createdAdegaIds: string[] = [];
let emailCounter = 0;

afterAll(async () => {
  for (const adegaId of createdAdegaIds) {
    await prisma.movement.deleteMany({ where: { adegaId } });
    await prisma.pedido.deleteMany({ where: { adegaId } });
    await prisma.product.deleteMany({ where: { adegaId } });
    await prisma.counter.deleteMany({ where: { adegaId } });
    await prisma.user.deleteMany({ where: { adegaId } });
    await prisma.adega.deleteMany({ where: { id: adegaId } });
  }
  await prisma.$disconnect();
});

export async function seedFixture() {
  const adega = await createAdega(`Adega de Teste ${Math.random().toString(36).slice(2)}`);
  createdAdegaIds.push(adega.id);
  const user = await createUser({
    adegaId: adega.id,
    name: "Usuário de Teste",
    email: `teste-${emailCounter++}-${Date.now()}@example.com`,
    passwordHash: "hash-fake",
    role: "OWNER",
  });
  return { adega, user };
}

export async function seedProduct(
  adegaId: string,
  overrides: Partial<Parameters<typeof createProduct>[0]> = {}
): Promise<Product> {
  return createProduct({
    adegaId,
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
  });
}
