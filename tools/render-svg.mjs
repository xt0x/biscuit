import { network } from "hardhat";
import { keccak256, stringToHex, toHex } from "viem";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomInt } from "node:crypto";

const LETTERS_WOFF2 = new URL("../assets/fonts/caveat/Caveat-Bold.subset.woff2", import.meta.url);
const DIGITS_WOFF2 = new URL("../assets/fonts/inter/Inter.subset.woff2", import.meta.url);
const WORDLIST_PATH = new URL("../assets/mnemonic/fake-wordlist.json", import.meta.url);
const LETTERS_CHUNKS_PATH = new URL(
  "../assets/fonts/caveat/Caveat-Bold.subset.chunks.json",
  import.meta.url,
);
const DIGITS_CHUNKS_PATH = new URL(
  "../assets/fonts/inter/Inter.subset.chunks.json",
  import.meta.url,
);

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

const loadWordlist = async ({ exactLength, minLength }) => {
  const raw = await readFile(WORDLIST_PATH, "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    throw new Error("fake-wordlist.json must be an array");
  }

  if (exactLength !== undefined && list.length !== exactLength) {
    throw new Error(`fake-wordlist.json must have ${exactLength} entries (got ${list.length})`);
  }

  if (minLength !== undefined && list.length < minLength) {
    throw new Error(
      `fake-wordlist.json must have at least ${minLength} entries (got ${list.length})`,
    );
  }

  return list.map((word, idx) => {
    if (typeof word !== "string" || word.length === 0) {
      throw new Error(`Invalid word at index ${idx}`);
    }
    return word;
  });
};

const loadChunks = async (path, label) => {
  let raw;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    throw new Error(
      `${label} chunks not found. Run "pnpm fonts:prepare" to generate woff2 chunks.`,
      { cause: err },
    );
  }
  const json = JSON.parse(raw);
  if (!Array.isArray(json.chunks) || json.chunks.length === 0) {
    throw new Error(`${label} chunks missing or empty`);
  }
  return json.chunks;
};

const pickRandomWords = (words, count) => {
  const selection = words.slice();
  for (let i = selection.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [selection[i], selection[j]] = [selection[j], selection[i]];
  }
  return selection.slice(0, count);
};

const writeSvg = async (outUrl, svg) => {
  const outPath = fileURLToPath(outUrl);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, svg, "utf8");
  return outPath;
};

const loadFontToContract = async (font, lettersChunks, digitsChunks, owner) => {
  for (let i = 0; i < lettersChunks.length; i += 1) {
    await font.write.addLetters([lettersChunks[i]], { account: owner.account });
  }
  for (let i = 0; i < digitsChunks.length; i += 1) {
    await font.write.addDigits([digitsChunks[i]], { account: owner.account });
  }
};

const loadWordlistToContract = async (mnemonic, wordlist, owner) => {
  for (let i = 0; i < wordlist.length; i += 1) {
    await mnemonic.write.setWordList([i, stringToHex(wordlist[i])], {
      account: owner.account,
    });
    if ((i + 1) % 256 === 0) {
      console.log(`Wordlist: ${i + 1}/${wordlist.length}`);
    }
  }
  await mnemonic.write.lockWordList({ account: owner.account });
};

const renderSimpleSvg = async () => {
  const { viem } = await network.connect();
  const renderer = await viem.deployContract("BiscuitRendererHarness");

  const letters = stringToHex(await loadBase64(LETTERS_WOFF2, "Letters"));
  const digits = stringToHex(await loadBase64(DIGITS_WOFF2, "Digits"));
  const wordCount = (randomInt(8) + 1) * 3;
  const mnemonic = pickRandomWords(await loadWordlist({ minLength: 24 }), wordCount);

  const svg = await renderer.read.generateSVG([letters, digits, mnemonic]);
  const outPath = await writeSvg(new URL("../outputs/biscuit.svg", import.meta.url), svg);
  console.log(outPath);
};

const renderFakeMnemonicSvg = async () => {
  const wordlist = await loadWordlist({ exactLength: 2048 });
  const lettersChunks = await loadChunks(LETTERS_CHUNKS_PATH, "Letters");
  const digitsChunks = await loadChunks(DIGITS_CHUNKS_PATH, "Digits");

  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);
  await loadWordlistToContract(mnemonic, wordlist, owner);

  const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
  await loadFontToContract(font, lettersChunks, digitsChunks, owner);

  const builder = await viem.deployContract("BiscuitBuilder", [
    owner.account.address,
    font.address,
    mnemonic.address,
  ]);

  const rawSeed = randomBytes(32);
  const seed = await builder.read.generateSeed([1n]);
  const seedWithHashed = {
    mnemonicSeed: keccak256(toHex(rawSeed)),
    mnemonicStrength: seed.mnemonicStrength,
  };

  const svg = await builder.read.svg([seedWithHashed]);
  const outPath = await writeSvg(new URL("../outputs/fake-mnemonic.svg", import.meta.url), svg);

  const words = await mnemonic.read.generateMnemonic([
    seedWithHashed.mnemonicStrength,
    seedWithHashed.mnemonicSeed,
  ]);

  console.log(`Seed (raw): 0x${rawSeed.toString("hex")}`);
  console.log(`Seed (keccak256): ${seedWithHashed.mnemonicSeed}`);
  console.log(`Strength: ${seedWithHashed.mnemonicStrength}`);
  console.log(`Mnemonic (${words.length} words): ${words.join(" ")}`);
  console.log(outPath);
};

const main = async () => {
  if (process.env.BISCUIT_RENDER_MODE === "fake-mnemonic") {
    await renderFakeMnemonicSvg();
  } else {
    await renderSimpleSvg();
  }
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
