import { network } from "hardhat";
import { readFile } from "node:fs/promises";

const DEFAULT_LETTERS = "assets/fonts/caveat/Caveat-Bold.subset.chunks.json";
const DEFAULT_DIGITS = "assets/fonts/inter/Inter.subset.chunks.json";

const parseArgs = (argv) => {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = value;
      i += 1;
    }
  }
  return args;
};

const loadChunks = async (path) => {
  const raw = await readFile(path, "utf8");
  const json = JSON.parse(raw);
  if (!Array.isArray(json.chunks) || json.chunks.length === 0) {
    throw new Error(`No chunks in ${path}`);
  }
  return { meta: json, chunks: json.chunks };
};

const toAddress = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(normalized)) return null;
  return normalized;
};

const main = async () => {
  const args = parseArgs(process.argv);
  const lettersPath = args["--letters"] ?? DEFAULT_LETTERS;
  const digitsPath = args["--digits"] ?? DEFAULT_DIGITS;
  const fontAddressArg = args["--font"];

  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();
  const ownerAddress = owner.account.address;

  const letters = await loadChunks(lettersPath);
  const digits = await loadChunks(digitsPath);

  let font;
  const providedAddress = toAddress(fontAddressArg);

  if (providedAddress) {
    font = await viem.getContractAt("BiscuitFont", providedAddress);
    console.log(`Using existing BiscuitFont: ${providedAddress}`);
  } else {
    font = await viem.deployContract("BiscuitFont", [ownerAddress]);
    console.log(`Deployed BiscuitFont: ${font.address}`);
  }

  console.log(`Letters: ${letters.chunks.length} chunks, ${letters.meta.byteLength ?? "?"} bytes`);
  console.log(`Digits: ${digits.chunks.length} chunks, ${digits.meta.byteLength ?? "?"} bytes`);

  for (let i = 0; i < letters.chunks.length; i += 1) {
    const chunk = letters.chunks[i];
    console.log(`addLetters ${i + 1}/${letters.chunks.length}`);
    await font.write.addLetters([chunk], { account: owner.account });
  }

  for (let i = 0; i < digits.chunks.length; i += 1) {
    const chunk = digits.chunks[i];
    console.log(`addDigits ${i + 1}/${digits.chunks.length}`);
    await font.write.addDigits([chunk], { account: owner.account });
  }

  console.log("Done.");
};

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
