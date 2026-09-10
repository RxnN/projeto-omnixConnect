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
  name: z.string().trim().min(1, "Informe o nome do produto.").max(200, "Nome do produto muito longo."),
  category: z.string().trim().min(1, "Informe a categoria.").max(100, "Categoria muito longa."),
  unit: z.string().trim().min(1, "Informe a unidade.").max(20, "Unidade muito longa."),
  costPrice: z.coerce.number().min(0, "Preço de custo inválido.").max(9_999_999_999.99, "Preço de custo inválido."),
  salePrice: z.coerce.number().min(0, "Preço de venda inválido.").max(9_999_999_999.99, "Preço de venda inválido."),
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

function hasValidCheckDigits(value: string): boolean {
  if (/^(\d)\1+$/.test(value)) return false;
  const calculate = (base: string, weights: number[]) => {
    const sum = base.split("").reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  if (value.length === 11) {
    const first = calculate(value.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calculate(value.slice(0, 9) + first, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return value.endsWith(`${first}${second}`);
  }
  if (value.length === 14) {
    const first = calculate(value.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const second = calculate(value.slice(0, 12) + first, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return value.endsWith(`${first}${second}`);
  }
  return false;
}

const cnpjCpfSchema = z
  .string()
  .trim()
  .max(32, "CPF ou CNPJ muito longo.")
  .transform((v) => v.replace(/\D/g, ""))
  .refine(
    (v) => (v.length === 11 || v.length === 14) && hasValidCheckDigits(v),
    "Informe um CPF ou CNPJ válido."
  );

const phoneSchema = z
  .string()
  .trim()
  .max(32, "Telefone muito longo.")
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v.length === 10 || v.length === 11, "Informe um telefone válido, com DDD.");

export const passwordSchema = z
  .string()
  .min(10, "A senha deve ter pelo menos 10 caracteres.")
  .max(128, "A senha deve ter no máximo 128 caracteres.")
  .regex(/[A-Za-zÀ-ÿ]/, "A senha deve conter ao menos uma letra.")
  .regex(/\d/, "A senha deve conter ao menos um número.");

const turnstileTokenSchema = z
  .string()
  .trim()
  .min(1, "Verificação de segurança pendente. Recarregue a página.")
  .max(4096, "Verificação de segurança inválida.");

export const cadastroSchema = z.object({
  empresaName: z.string().trim().min(1, "Informe o nome da empresa.").max(200, "Nome da empresa muito longo."),
  cnpjCpf: cnpjCpfSchema,
  userName: z.string().trim().min(1, "Informe seu nome.").max(200, "Nome muito longo."),
  phone: phoneSchema,
  email: z.string().trim().min(1, "Informe seu e-mail.").max(254, "E-mail muito longo.").email("E-mail inválido.").toLowerCase(),
  password: passwordSchema,
  turnstileToken: turnstileTokenSchema,
});

const optionalDate = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? null : v),
  z.union([z.coerce.date(), z.null()])
);

export const promotionCreateSchema = z
  .object({
    productId: z.string().trim().min(1, "Selecione um produto.").max(128, "Produto inválido."),
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
  email: z.string().trim().min(1, "Informe e-mail e senha.").max(254, "Informe e-mail e senha.").email("Informe e-mail e senha.").toLowerCase(),
  password: z.string().min(1, "Informe e-mail e senha.").max(128, "Informe e-mail e senha."),
  turnstileToken: turnstileTokenSchema,
});

export const passwordResetRequestSchema = z.object({
  email: z.string().trim().max(254, "E-mail inválido.").email("E-mail inválido.").toLowerCase(),
  turnstileToken: turnstileTokenSchema,
});

export const passwordResetSchema = z.object({
  token: z
    .string()
    .trim()
    .min(40, "Link de recuperação inválido.")
    .max(128, "Link de recuperação inválido.")
    .regex(/^[A-Za-z0-9_-]+$/, "Link de recuperação inválido."),
  password: passwordSchema,
  turnstileToken: turnstileTokenSchema,
});

export const emailVerificationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(40, "Link de confirmação inválido.")
    .max(128, "Link de confirmação inválido.")
    .regex(/^[A-Za-z0-9_-]+$/, "Link de confirmação inválido."),
});

const pedidoItemSchema = z.object({
  productId: z.string().trim().min(1, "Item do pedido sem produto selecionado.").max(128, "Produto inválido."),
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
    items: z.array(pedidoItemSchema).min(1, "Adicione ao menos um produto ao pedido.").max(200, "O pedido excede o limite de 200 itens."),
    force: z.coerce.boolean().optional().default(false),
    paymentMethod: z.enum(["DINHEIRO", "PIX", "CARTAO", "FIADO", "BOLETO"], {
      message: "Selecione a forma de pagamento.",
    }),
    boletoDueDays: z.coerce.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    const seenProducts = new Set<string>();
    data.items.forEach((item, index) => {
      if (seenProducts.has(item.productId)) {
        ctx.addIssue({
          code: "custom",
          message: "O mesmo produto não pode aparecer mais de uma vez no pedido.",
          path: ["items", index, "productId"],
        });
      }
      seenProducts.add(item.productId);
    });
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
