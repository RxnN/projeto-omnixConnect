import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { getCurrentUser } from "@/lib/session";
import { getProductsByBarcodes } from "@/lib/repo";
import { withErrorHandling } from "@/lib/api-handler";
import { getCurrentFilialId } from "@/lib/filial-context";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Sanidade contra XML forjado com um número absurdo de itens (cada item viraria uma
// consulta/linha a mais); nenhuma NF-e real chega perto disso.
const MAX_ITEMS = 500;

interface NFeDet {
  prod?: {
    cProd?: string | number;
    cEAN?: string | number;
    xProd?: string;
    uCom?: string;
    qCom?: string | number;
    vUnCom?: string | number;
    vProd?: string | number;
  };
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máximo 5MB)." }, { status: 400 });
  }

  const xmlText = await file.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(xmlText);
  } catch {
    return NextResponse.json({ error: "Não foi possível ler o arquivo. Envie um .xml de NF-e válido." }, { status: 400 });
  }

  const root = parsed as {
    nfeProc?: { NFe?: { infNFe?: Record<string, unknown> } };
    NFe?: { infNFe?: Record<string, unknown> };
  };
  const infNFe = root.nfeProc?.NFe?.infNFe ?? root.NFe?.infNFe;
  if (!infNFe) {
    return NextResponse.json({ error: "O arquivo não parece ser o XML de uma NF-e." }, { status: 400 });
  }

  const rawDet = infNFe.det as NFeDet | NFeDet[] | undefined;
  const detList = Array.isArray(rawDet) ? rawDet : rawDet ? [rawDet] : [];
  if (detList.length === 0) {
    return NextResponse.json({ error: "Nenhum item (produto) encontrado nessa NF-e." }, { status: 400 });
  }
  if (detList.length > MAX_ITEMS) {
    return NextResponse.json(
      { error: `NF-e com muitos itens (${detList.length}). Máximo suportado: ${MAX_ITEMS}.` },
      { status: 400 }
    );
  }

  const parsedItems = detList.map((det) => {
    const prod = det.prod ?? {};
    const eanRaw = prod.cEAN !== undefined ? String(prod.cEAN) : "";
    const ean = eanRaw && eanRaw.toUpperCase() !== "SEM GTIN" ? eanRaw : null;
    const rawQuantity = Number(prod.qCom ?? 0);
    const quantity = Number.isFinite(rawQuantity) && rawQuantity >= 1 ? Math.round(rawQuantity) : 1;
    const unitValueRaw = Number(prod.vUnCom ?? 0);
    const unitValue = Number.isFinite(unitValueRaw) ? unitValueRaw : 0;

    return {
      ean,
      code: prod.cProd !== undefined ? String(prod.cProd) : "",
      description: prod.xProd ? String(prod.xProd) : "Produto sem descrição",
      unit: prod.uCom ? String(prod.uCom) : "un",
      quantity,
      unitValue,
    };
  });

  // Uma única consulta em lote para todos os códigos de barras da nota, em vez de uma
  // consulta por item (que com uma nota maliciosa de muitos itens vira uma enxurrada de
  // conexões simultâneas no banco compartilhado por todas as adegas).
  const eans = Array.from(new Set(parsedItems.map((it) => it.ean).filter((e): e is string => Boolean(e))));
  const filialId = await getCurrentFilialId(user);
  const matchedProducts = await getProductsByBarcodes(eans, filialId);
  const matchedByBarcode = new Map(matchedProducts.filter((p) => p.barcode).map((p) => [p.barcode as string, p]));

  const items = parsedItems.map((it) => {
    const matched = it.ean ? matchedByBarcode.get(it.ean) : undefined;
    return {
      ...it,
      matchedProductId: matched?.id ?? null,
      matchedProductName: matched?.name ?? null,
    };
  });

  const ide = (infNFe.ide ?? {}) as { nNF?: string | number; dhEmi?: string };
  const emit = (infNFe.emit ?? {}) as { xNome?: string; CNPJ?: string | number };

  return NextResponse.json({
    ok: true,
    nfe: {
      number: ide.nNF !== undefined ? String(ide.nNF) : null,
      emittedAt: ide.dhEmi ?? null,
      supplierName: emit.xNome ?? null,
      supplierCnpj: emit.CNPJ !== undefined ? String(emit.CNPJ) : null,
    },
    items,
  });
});
