import { z } from "zod";

/** Trata "", undefined e null como ausente; senão converte pra número. Usado nos campos
 * numéricos opcionais que chegam de formulário/planilha (onde "vazio" é uma string vazia,
 * não undefined). */
const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().int("Deve ser um número inteiro.").min(0, "Não pode ser negativo.").nullable()
);

const optionalBarcode = z.preprocess(
  (v) => (v === undefined || v === null || (typeof v === "string" && v.trim() === "") ? null : v),
  z.string().trim().nullable()
);

const packageTypeSchema = z.enum(["CX", "PCT"]).nullable().catch(null);

const produtoBase = {
  name: z.string().trim().min(1, "Informe o nome do produto."),
  category: z.string().trim().min(1, "Informe a categoria."),
  unit: z.string().trim().min(1, "Informe a unidade."),
  costPrice: z.coerce.number().min(0, "Preço de custo inválido."),
  salePrice: z.coerce.number().min(0, "Preço de venda inválido."),
  minStockAlert: optionalInt,
  barcode: optionalBarcode,
  packageType: packageTypeSchema,
  unitsPerPackage: optionalInt,
};

export const produtoCreateSchema = z.object({
  ...produtoBase,
  currentStock: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? 0 : Number(v)),
    z.number().int("Estoque inicial deve ser um número inteiro.").min(0, "Estoque inicial não pode ser negativo.")
  ),
});

export const produtoUpdateSchema = z.object(produtoBase);

export const cadastroSchema = z.object({
  adegaName: z.string().trim().min(1, "Informe o nome da adega."),
  userName: z.string().trim().min(1, "Informe seu nome."),
  email: z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido.").toLowerCase(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe e-mail e senha.").toLowerCase(),
  password: z.string().min(1, "Informe e-mail e senha."),
});

const pedidoItemSchema = z.object({
  productId: z.string().trim().min(1, "Item do pedido sem produto selecionado."),
  quantity: z.coerce
    .number()
    .int("A quantidade deve ser um número inteiro maior que zero.")
    .positive("A quantidade deve ser um número inteiro maior que zero."),
  unitValue: z.coerce.number().optional(),
  source: z.enum(["MANUAL", "QRCODE"]).catch("MANUAL"),
});

export const pedidoCreateSchema = z.object({
  type: z.enum(["IN", "OUT"], { message: "Tipo de pedido inválido." }),
  items: z.array(pedidoItemSchema).min(1, "Adicione ao menos um produto ao pedido."),
  force: z.coerce.boolean().optional().default(false),
});

/** Formata o primeiro erro de um resultado `safeParse` numa mensagem só, no mesmo
 * formato `{ error: string }` que as rotas já retornavam antes de usar Zod. */
export function firstZodError(result: z.ZodSafeParseError<unknown>): string {
  return result.error.issues[0]?.message ?? "Dados inválidos.";
}
