import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { network } from "hardhat";

const LETTERS_PATH = "assets/fonts/caveat/Caveat-Bold.subset.chunks.json";
const DIGITS_PATH = "assets/fonts/inter/Inter.subset.chunks.json";
const WORDS = ["alpha", "beta", "gamma"];

const ensureFontChunks = () => {
  if (existsSync(LETTERS_PATH) && existsSync(DIGITS_PATH)) return true;

  const result = spawnSync(process.execPath, ["scripts/prepare-fonts.mjs"], {
    stdio: "inherit",
  });
  return result.status === 0 && existsSync(LETTERS_PATH) && existsSync(DIGITS_PATH);
};

const decodeBase64 = (input: string) => Buffer.from(input, "base64").toString("utf8");

describe("BiscuitFont (integration, real fonts)", async () => {
  const hasChunks = ensureFontChunks();

  if (!hasChunks) {
    it.skip("requires prepared font chunks", () => {});
    return;
  }

  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  const lettersPayload = JSON.parse(await readFile(LETTERS_PATH, "utf8")) as {
    chunks: `0x${string}`[];
  };
  const digitsPayload = JSON.parse(await readFile(DIGITS_PATH, "utf8")) as {
    chunks: `0x${string}`[];
  };

  it("stores raw woff2 in contract and renders SVG output", async () => {
    assert.ok(lettersPayload.chunks.length > 0);
    assert.ok(digitsPayload.chunks.length > 0);

    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    for (const chunk of lettersPayload.chunks) {
      await font.write.addLetters([chunk], { account: owner.account });
    }
    for (const chunk of digitsPayload.chunks) {
      await font.write.addDigits([chunk], { account: owner.account });
    }

    const mnemonic = await viem.deployContract("MockMnemonic", [WORDS]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    const seed = (await builder.read.generateSeed([1n])) as {
      mnemonicSeed: `0x${string}`;
      mnemonicStrength: bigint;
    };

    const svg = (await builder.read.svg([seed])) as string;
    assert.ok(svg.includes("@font-face"));
    assert.ok(svg.includes("data:font/woff2;base64,"));
    assert.ok(svg.includes("alpha"));

    const tokenUri = (await builder.read.tokenURI([1n, seed])) as string;
    const encoded = tokenUri.split(",")[1];
    const json = JSON.parse(decodeBase64(encoded)) as { image: string; name: string };
    assert.equal(json.name, "Biscuit #1");

    await mkdir("outputs", { recursive: true });
    await writeFile("outputs/biscuit-font-real.svg", svg, "utf8");
    await writeFile("outputs/biscuit-font-real.json", JSON.stringify(json, null, 2), "utf8");
  });
});
