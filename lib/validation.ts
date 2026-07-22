import { z } from "zod";

/** Trata "", undefined e null como ausente; senão converte pra número. Usado nos campos
 * numéricos opcionais que chegam de formulário/planilha (onde "vazio" é uma string vazia,
 * não undefined). */
const optionalInt = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
  z.number().int("Deve ser um número inteiro.").min(0, "Não pode ser negativo.").nullable()
);

const packageTypeSchema = z.enum(["CX", "PCT"]).nullable().catch(null);

const produtoBase = {
  name: z.string().trim().min(1, "Informe o nome do produto."),
  category: z.string().trim().min(1, "Informe a categoria."),
  unit: z.string().trim().min(1, "Informe a unidade."),
  costPrice: z.coerce.number().min(0, "Preço de custo inválido."),
  salePrice: z.coerce.number().min(0, "Preço de venda inválido."),
  minStockAlert: optionalInt,
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

const cnpjCpfSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 11 || v.length === 14, "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");

const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, "Informe um telefone válido, com DDD.");

export const cadastroSchema = z.object({
  adegaName: z.string().trim().min(1, "Informe o nome da empresa."),
  cnpjCpf: cnpjCpfSchema,
  userName: z.string().trim().min(1, "Informe seu nome."),
  phone: phoneSchema,
  email: z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido.").toLowerCase(),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

const optionalDate = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.union([z.coerce.date(), z.null()])
);

export const promotionCreateSchema = z
  .object({
    productId: z.string().trim().min(1, "Selecione um produto."),
    promoPrice: z.coerce.number().min(0, "Preço promocional inválido."),
    startDate: optionalDate,
    endDate: optionalDate,
    minQuantity: optionalInt,
  })
  .refine((data) => !data.startDate || !data.endDate || data.startDate <= data.endDate, {
    message: "A data final deve ser depois da data inicial.",
    path: ["endDate"],
  })
  .refine((data) => data.minQuantity === null || data.minQuantity >= 1, {
    message: "A quantidade mínima deve ser pelo menos 1.",
    path: ["minQuantity"],
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

const PAYMENT_METHODS_BY_TYPE: Record<"IN" | "OUT", string[]> = {
  OUT: ["CARTAO", "DINHEIRO", "PIX", "FIADO"],
  IN: ["BOLETO", "DINHEIRO", "PIX"],
};

export const pedidoCreateSchema = z
  .object({
    type: z.enum(["IN", "OUT"], { message: "Tipo de pedido inválido." }),
    items: z.array(pedidoItemSchema).min(1, "Adicione ao menos um produto ao pedido."),
    force: z.coerce.boolean().optional().default(false),
    paymentMethod: z.enum(["DINHEIRO", "PIX", "CARTAO", "FIADO", "BOLETO"], {
      message: "Selecione a forma de pagamento.",
    }),
    boletoDueDays: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (!PAYMENT_METHODS_BY_TYPE[data.type].includes(data.paymentMethod)) {
      ctx.addIssue({
        code: "custom",
        message: "Forma de pagamento inválida para esse tipo de pedido.",
        path: ["paymentMethod"],
      });
    }
    if (data.paymentMethod === "BOLETO" && !data.boletoDueDays) {
      ctx.addIssue({
        code: "custom",
        message: "Informe em quantos dias vence o boleto.",
        path: ["boletoDueDays"],
      });
    }
  });

/** Formata o primeiro erro de um resultado `safeParse` numa mensagem só, no mesmo
 * formato `{ error: string }` que as rotas já retornavam antes de usar Zod. */
export function firstZodError(result: z.ZodSafeParseError<unknown>): string {
  return result.error.issues[0]?.message ?? "Dados inválidos.";
}
