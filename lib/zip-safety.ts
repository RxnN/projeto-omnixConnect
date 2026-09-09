const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const MAX_EOCD_SEARCH = 65_557;

const MAX_ARCHIVE_ENTRIES = 100;
const MAX_ENTRY_UNCOMPRESSED_SIZE = 10 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_SIZE = 25 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 100;

export class UnsafeZipError extends Error {
  constructor() {
    super("Arquivo compactado excede os limites de segurança.");
    this.name = "UnsafeZipError";
  }
}

/** Valida o diretório central antes que a biblioteca XLSX descompacte o arquivo. */
export function assertSafeXlsxArchive(buffer: Buffer): void {
  const minimumEocdSize = 22;
  if (buffer.length < minimumEocdSize) throw new UnsafeZipError();

  const searchStart = Math.max(0, buffer.length - MAX_EOCD_SEARCH);
  let eocdOffset = -1;
  for (let offset = buffer.length - minimumEocdSize; offset >= searchStart; offset--) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new UnsafeZipError();

  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(eocdOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  // Arquivos multidisco e ZIP64 não são necessários para uma planilha de até 5 MB.
  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== totalEntries ||
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff ||
    totalEntries === 0 ||
    totalEntries > MAX_ARCHIVE_ENTRIES ||
    centralDirectoryOffset + centralDirectorySize > eocdOffset
  ) {
    throw new UnsafeZipError();
  }

  let offset = centralDirectoryOffset;
  let totalUncompressedSize = 0;

  for (let index = 0; index < totalEntries; index++) {
    if (offset + 46 > eocdOffset || buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) {
      throw new UnsafeZipError();
    }

    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraFieldLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);

    if (
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      uncompressedSize > MAX_ENTRY_UNCOMPRESSED_SIZE ||
      (uncompressedSize > 0 &&
        uncompressedSize / Math.max(1, compressedSize) > MAX_COMPRESSION_RATIO)
    ) {
      throw new UnsafeZipError();
    }

    totalUncompressedSize += uncompressedSize;
    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE) throw new UnsafeZipError();

    offset += 46 + fileNameLength + extraFieldLength + commentLength;
  }

  if (offset !== centralDirectoryOffset + centralDirectorySize) throw new UnsafeZipError();
}
