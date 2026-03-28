import { network } from "hardhat";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { keccak256, stringToHex, toHex } from "viem";

const WORDLIST_PATH = new URL("../assets/mnemonic/fake-wordlist.json", import.meta.url);
const LETTERS_CHUNKS_PATH = new URL(
  "../assets/fonts/caveat/Caveat-Bold.subset.chunks.json",
  import.meta.url,
);
const DIGITS_CHUNKS_PATH = new URL(
  "../assets/fonts/inter/Inter.subset.chunks.json",
  import.meta.url,
);
const OUT_PATH = "/Users/xx/Developer/biscuit/tmp/fake-mnemonic.svg";

const loadWordlist = async () => {
  const raw = await readFile(WORDLIST_PATH, "utf8");
  const list = JSON.parse(raw);
  if (!Array.isArray(list)) {
    throw new Error("fake-wordlist.json must be an array");
  }
  if (list.length !== 2048) {
    throw new Error(`fake-wordlist.json must have 2048 entries (got ${list.length})`);
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

const main = async () => {
  const wordlist = await loadWordlist();
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

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, svg, "utf8");

  const words = await mnemonic.read.generateMnemonic([
    seedWithHashed.mnemonicStrength,
    seedWithHashed.mnemonicSeed,
  ]);

  console.log(`Seed (raw): 0x${rawSeed.toString("hex")}`);
  console.log(`Seed (keccak256): ${seedWithHashed.mnemonicSeed}`);
  console.log(`Strength: ${seedWithHashed.mnemonicStrength}`);
  console.log(`Mnemonic (${words.length} words): ${words.join(" ")}`);
  console.log(OUT_PATH);
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
