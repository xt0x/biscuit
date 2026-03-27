import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

describe("BIP39 (unit)", async () => {
  const { viem } = await network.connect();

  const harness = await viem.deployContract("BIP39Harness");

  before(async () => {
    await harness.write.setWordList([0, stringToHex("word0")]);
    await harness.write.setWordList([1, stringToHex("word1")]);
  });

  it("generate: rejects invalid strength", async () => {
    const seed = "0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

    await viem.assertions.revertWithCustomError(
      harness.read.generate([33n, seed]),
      harness,
      "InvalidStrengthValue",
    );
  });

  it("toEntropy: rejects invalid mnemonic length", async () => {
    await viem.assertions.revertWithCustomError(
      harness.read.toEntropy([["only", "two"]]),
      harness,
      "InvalidMnemonicLength",
    );
  });

  it("toEntropy: rejects unknown word", async () => {
    await viem.assertions.revertWithCustomError(
      harness.read.toEntropy([["word0", "missing", "word0"]]),
      harness,
      "NotFoundWord",
    );
  });

  it("generate -> toEntropy roundtrip", async () => {
    const seed = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const mnemonicWords = (await harness.read.generate([32n, seed])) as string[];
    assert.equal(mnemonicWords.length, 3);
    assert.ok(mnemonicWords.every((word: string) => word === "word0" || word === "word1"));

    const entropy = (await harness.read.toEntropy([mnemonicWords])) as string;
    assert.equal(entropy, "0x00000000");
  });

  it("toEntropy: rejects checksum mismatch", async () => {
    const seed = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const mnemonicWords = (await harness.read.generate([32n, seed])) as string[];

    const badWords = [...mnemonicWords];
    badWords[2] = badWords[2] === "word0" ? "word1" : "word0";

    await viem.assertions.revertWithCustomError(
      harness.read.toEntropy([badWords]),
      harness,
      "ChecksumMismatch",
    );
  });
});

describe("BIP39 (integration)", async () => {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  it("Mnemonic uses BIP39 library", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await mnemonic.write.setWordList([0, stringToHex("word0")], {
      account: owner.account,
    });
    await mnemonic.write.setWordList([1, stringToHex("word1")], {
      account: owner.account,
    });

    const seed = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const mnemonicWords = (await mnemonic.read.generateMnemonic([32n, seed])) as string[];
    assert.equal(mnemonicWords.length, 3);
  });
});
