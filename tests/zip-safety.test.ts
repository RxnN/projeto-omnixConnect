import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { assertSafeXlsxArchive, UnsafeZipError } from "@/lib/zip-safety";

function createWorkbookBuffer(): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["Nome", "Preço de Venda"],
      ["Produto seguro", 10],
    ]),
    "Produtos"
  );
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("assertSafeXlsxArchive", () => {
  it("aceita uma planilha XLSX normal", () => {
    expect(() => assertSafeXlsxArchive(createWorkbookBuffer())).not.toThrow();
  });

  it("rejeita conteúdo que não seja um ZIP íntegro", () => {
    expect(() => assertSafeXlsxArchive(Buffer.from("PK arquivo incompleto"))).toThrow(UnsafeZipError);
  });

  it("rejeita entrada com tamanho descompactado excessivo antes de extrair", () => {
    const buffer = createWorkbookBuffer();
    const centralDirectorySignature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    const entryOffset = buffer.indexOf(centralDirectorySignature);
    expect(entryOffset).toBeGreaterThanOrEqual(0);
    buffer.writeUInt32LE(11 * 1024 * 1024, entryOffset + 24);

    expect(() => assertSafeXlsxArchive(buffer)).toThrow(UnsafeZipError);
  });
});
