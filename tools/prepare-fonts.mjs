import subsetFont from "subset-font";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

const CHUNK_SIZE = 23 * 1024;

const FONTS = [
  {
    name: "caveat",
    inputTtf: "assets/fonts/caveat/Caveat-Bold.ttf",
    subsetText: "abcdefghijklmnopqrstuvwxyz",
    outputWoff2: "assets/fonts/caveat/Caveat-Bold.subset.woff2",
    outputChunks: "assets/fonts/caveat/Caveat-Bold.subset.chunks.json",
  },
  {
    name: "inter",
    inputTtf: "assets/fonts/inter/Inter.ttf",
    subsetText: "0123456789. ",
    outputWoff2: "assets/fonts/inter/Inter.subset.woff2",
    outputChunks: "assets/fonts/inter/Inter.subset.chunks.json",
  },
];

const subsetFontFile = async (font) => {
  await mkdir(dirname(font.outputWoff2), { recursive: true });
  const input = await readFile(font.inputTtf);
  const subset = await subsetFont(input, font.subsetText, { targetFormat: "woff2" });
  await writeFile(font.outputWoff2, subset);
};

const chunkBinary = async (font) => {
  if (!existsSync(font.outputWoff2)) {
    throw new Error(`Missing woff2 output: ${font.outputWoff2}`);
  }
  const buf = await readFile(font.outputWoff2);
  const chunks = [];
  for (let offset = 0; offset < buf.length; offset += CHUNK_SIZE) {
    const part = buf.subarray(offset, Math.min(offset + CHUNK_SIZE, buf.length));
    chunks.push(`0x${part.toString("hex")}`);
  }

  const payload = {
    name: font.name,
    source: font.outputWoff2,
    byteLength: buf.length,
    chunkSize: CHUNK_SIZE,
    chunks,
  };

  await mkdir(dirname(font.outputChunks), { recursive: true });
  await writeFile(font.outputChunks, JSON.stringify(payload, null, 2), "utf8");
};

const main = async () => {
  for (const font of FONTS) {
    console.log(`\n[subset] ${font.name}`);
    await subsetFontFile(font);
    console.log(`[chunk] ${font.name}`);
    await chunkBinary(font);
    console.log(`[ok] ${font.outputChunks}`);
  }
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
