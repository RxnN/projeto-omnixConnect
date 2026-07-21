// Script de seed do banco de dados de demonstração.
// Usa o Prisma Client (lib/prisma.ts), seguindo o modelo de dados em prisma/schema.prisma.
//
// Importante: este script só remove os dados da PRÓPRIA adega de demonstração
// (identificada pelo e-mail do dono "dono@adega.com"), nunca o banco inteiro —
// o mesmo Postgres pode estar hospedando outras adegas reais.

import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { createId } from "../lib/id";

const DEMO_OWNER_EMAIL = "dono@adega.com";

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const existingOwner = await prisma.user.findUnique({ where: { email: DEMO_OWNER_EMAIL } });
  if (existingOwner) {
    console.log("Removendo dados de demonstração anteriores...");
    const adegaId = existingOwner.adegaId;
    await prisma.movement.deleteMany({ where: { adegaId } });
    await prisma.pedido.deleteMany({ where: { adegaId } });
    await prisma.product.deleteMany({ where: { adegaId } });
    await prisma.counter.deleteMany({ where: { adegaId } });
    await prisma.user.deleteMany({ where: { adegaId } });
    await prisma.adega.deleteMany({ where: { id: adegaId } });
  }

  console.log("Criando adega...");
  const adega = await prisma.adega.create({
    data: { id: createId("adega"), name: "Adega do Renan", importEnabled: true, approved: true },
  });

  console.log("Criando usuários...");
  const passwordHash = await bcrypt.hash("senha123", 10);

  async function insertUser(name: string, email: string, role: "OWNER" | "MANAGER" | "EMPLOYEE") {
    const user = await prisma.user.create({
      data: { id: createId("user"), adegaId: adega.id, name, email, passwordHash, role },
    });
    return user.id;
  }

  const donoId = await insertUser("Renan Fernandes", DEMO_OWNER_EMAIL, "OWNER");
  const gerenteId = await insertUser("Marina Souza", "gerente@adega.com", "MANAGER");
  const funcionarioId = await insertUser("João Pereira", "funcionario@adega.com", "EMPLOYEE");
  const userIds = [donoId, gerenteId, funcionarioId];

  console.log("Criando produtos...");
  const productDefs = [
    { name: "Vinho Tinto Reserva Malbec", category: "Vinho Tinto", unit: "un", costPrice: 45.0, salePrice: 89.9, minStockAlert: 10, freq: 0.9 },
    { name: "Vinho Tinto Cabernet Sauvignon", category: "Vinho Tinto", unit: "un", costPrice: 38.0, salePrice: 74.9, minStockAlert: 10, freq: 0.85 },
    { name: "Vinho Branco Sauvignon Blanc", category: "Vinho Branco", unit: "un", costPrice: 32.0, salePrice: 64.9, minStockAlert: 8, freq: 0.6 },
    { name: "Vinho Branco Chardonnay", category: "Vinho Branco", unit: "un", costPrice: 40.0, salePrice: 79.9, minStockAlert: 8, freq: 0.5 },
    { name: "Espumante Brut Rosé", category: "Espumante", unit: "un", costPrice: 55.0, salePrice: 109.9, minStockAlert: 6, freq: 0.4 },
    { name: "Espumante Moscatel", category: "Espumante", unit: "un", costPrice: 28.0, salePrice: 54.9, minStockAlert: 12, freq: 0.7 },
    { name: "Whisky 12 Anos", category: "Whisky", unit: "un", costPrice: 120.0, salePrice: 219.9, minStockAlert: 5, freq: 0.3 },
    { name: "Whisky Single Malt", category: "Whisky", unit: "un", costPrice: 180.0, salePrice: 349.9, minStockAlert: 4, freq: 0.15 },
    { name: "Vinho Rosé Provence", category: "Vinho Rosé", unit: "un", costPrice: 42.0, salePrice: 84.9, minStockAlert: 6, freq: 0.35 },
    { name: "Licor de Cacau Artesanal", category: "Licor", unit: "un", costPrice: 25.0, salePrice: 49.9, minStockAlert: 8, freq: 0.25 },
  ];

  const products: { id: string; costPrice: number; salePrice: number; freq: number }[] = [];
  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i];
    const code = String(i + 1).padStart(4, "0");
    const product = await prisma.product.create({
      data: {
        id: createId("prod"),
        adegaId: adega.id,
        code,
        name: p.name,
        category: p.category,
        unit: p.unit,
        costPrice: p.costPrice,
        salePrice: p.salePrice,
        currentStock: 0,
        minStockAlert: p.minStockAlert,
      },
    });
    products.push({ id: product.id, costPrice: p.costPrice, salePrice: p.salePrice, freq: p.freq });
  }

  // Cada movimentação histórica vira seu próprio pedido de 1 item, para que o
  // conjunto de dados de demonstração passe pelo mesmo caminho (Pedido -> Movement)
  // que o app usa de verdade, e apareça corretamente nos relatórios.
  const pedidoNumbers: Record<"IN" | "OUT", number> = { IN: 0, OUT: 0 };

  async function insertMovement(opts: {
    productId: string;
    type: "IN" | "OUT";
    quantity: number;
    unitValue: number;
    createdAt: Date;
    createdByUserId: string;
    source: "MANUAL" | "QRCODE";
  }) {
    const totalValue = opts.quantity * opts.unitValue;
    pedidoNumbers[opts.type] += 1;
    const pedido = await prisma.pedido.create({
      data: {
        id: createId("pedido"),
        adegaId: adega.id,
        type: opts.type,
        number: pedidoNumbers[opts.type],
        totalValue,
        createdAt: opts.createdAt,
        createdByUserId: opts.createdByUserId,
      },
    });
    await prisma.movement.create({
      data: {
        id: createId("mov"),
        adegaId: adega.id,
        productId: opts.productId,
        type: opts.type,
        quantity: opts.quantity,
        unitValue: opts.unitValue,
        totalValue,
        createdAt: opts.createdAt,
        createdByUserId: opts.createdByUserId,
        source: opts.source,
        pedidoId: pedido.id,
      },
    });
  }

  async function addStock(productId: string, delta: number) {
    await prisma.product.update({ where: { id: productId }, data: { currentStock: { increment: delta } } });
  }

  const stockCache = new Map(products.map((p) => [p.id, 0]));
  function getStock(productId: string): number {
    return stockCache.get(productId) ?? 0;
  }
  function trackStock(productId: string, delta: number) {
    stockCache.set(productId, getStock(productId) + delta);
  }

  console.log("Criando movimentações dos últimos 45 dias...");

  for (const product of products) {
    const qty = randInt(40, 80);
    await insertMovement({
      productId: product.id,
      type: "IN",
      quantity: qty,
      unitValue: product.costPrice,
      createdAt: daysAgo(45, 8),
      createdByUserId: donoId,
      source: "MANUAL",
    });
    await addStock(product.id, qty);
    trackStock(product.id, qty);
  }

  let movementCount = products.length;

  for (let day = 44; day >= 0; day--) {
    for (const product of products) {
      if (Math.random() < product.freq) {
        const qty = randInt(1, 5);
        const userId = userIds[randInt(0, userIds.length - 1)];
        const source = Math.random() < 0.4 ? "QRCODE" : "MANUAL";
        const current = getStock(product.id);
        const effectiveQty = Math.min(qty, current);
        if (effectiveQty > 0) {
          await insertMovement({
            productId: product.id,
            type: "OUT",
            quantity: effectiveQty,
            unitValue: product.salePrice,
            createdAt: daysAgo(day, randInt(9, 20)),
            createdByUserId: userId,
            source,
          });
          await addStock(product.id, -effectiveQty);
          trackStock(product.id, -effectiveQty);
          movementCount++;
        }
      }

      if (day % 10 === 0 && Math.random() < 0.5) {
        const qty = randInt(10, 30);
        await insertMovement({
          productId: product.id,
          type: "IN",
          quantity: qty,
          unitValue: product.costPrice,
          createdAt: daysAgo(day, randInt(7, 9)),
          createdByUserId: donoId,
          source: "MANUAL",
        });
        await addStock(product.id, qty);
        trackStock(product.id, qty);
        movementCount++;
      }
    }
  }

  // Os pedidos acima foram criados direto (bypassando createPedido/nextCounter) pra
  // controlar as datas históricas — sincroniza o Counter com o número mais alto já usado,
  // senão o próximo pedido criado pelo app de verdade recomeçaria do 1 e colidiria.
  for (const type of ["IN", "OUT"] as const) {
    if (pedidoNumbers[type] > 0) {
      await prisma.counter.upsert({
        where: { adegaId_scope: { adegaId: adega.id, scope: `pedido:${type}` } },
        create: { adegaId: adega.id, scope: `pedido:${type}`, value: pedidoNumbers[type] },
        update: { value: pedidoNumbers[type] },
      });
    }
  }
  await prisma.counter.upsert({
    where: { adegaId_scope: { adegaId: adega.id, scope: "product" } },
    create: { adegaId: adega.id, scope: "product", value: products.length },
    update: { value: products.length },
  });

  console.log(
    `Seed concluído: 1 adega, ${userIds.length} usuários, ${products.length} produtos, ${movementCount} movimentações.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
