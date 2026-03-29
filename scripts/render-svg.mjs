import { network } from "hardhat";
import { stringToHex } from "viem";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";

const { viem } = await network.connect();
const renderer = await viem.deployContract("BiscuitRendererHarness");

const LETTERS_WOFF2 = new URL("../assets/fonts/caveat/Caveat-Bold.subset.woff2", import.meta.url);
const DIGITS_WOFF2 = new URL("../assets/fonts/inter/Inter.subset.woff2", import.meta.url);
const WORDLIST = new URL("../assets/mnemonic/fake-wordlist.json", import.meta.url);

const loadBase64 = async (path, label) => {
  let raw;
  try {
    raw = await readFile(path);
  } catch (err) {
    throw new Error(`${label} font missing. Run "pnpm fonts:prepare" to generate woff2 files.`, {
      cause: err,
    });
  }
  return raw.toString("base64");
};

const loadWordlist = async () => {
  const raw = await readFile(WORDLIST, "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    throw new Error("fake-wordlist.json must be an array");
  }
  if (list.length < 24) {
    throw new Error(`fake-wordlist.json must have at least 24 entries (got ${list.length})`);
  }
  return list.map((word) => String(word));
};

const pickRandomWords = (words, count) => {
  const selection = words.slice();
  for (let i = selection.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [selection[i], selection[j]] = [selection[j], selection[i]];
  }
  return selection.slice(0, count);
};

const letters = stringToHex(await loadBase64(LETTERS_WOFF2, "Letters"));
const digits = stringToHex(await loadBase64(DIGITS_WOFF2, "Digits"));
const wordCount = (randomInt(8) + 1) * 3;
const mnemonic = pickRandomWords(await loadWordlist(), wordCount);

const svg = await renderer.read.generateSVG([letters, digits, mnemonic]);

const outUrl = new URL("../outputs/biscuit.svg", import.meta.url);
const outPath = fileURLToPath(outUrl);
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, svg, "utf8");

console.log(outPath);
