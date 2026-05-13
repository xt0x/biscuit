import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

describe("Mnemonic flow (integration)", async () => {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

  before(async () => {
    await mnemonic.write.setWordList([0, stringToHex("word0")], {
      account: owner.account,
    });
    await mnemonic.write.setWordList([1, stringToHex("word1")], {
      account: owner.account,
    });
  });

  it("wordlist -> generate -> validate -> lock", async () => {
    const seed = "0x0000000000000000000000000000000000000000000000000000000000000000";

    const mnemonicWords = (await mnemonic.read.generateMnemonic([32n, seed])) as string[];
    assert.equal(mnemonicWords.length, 3);

    const entropy = (await mnemonic.read.isValidMnemonic([mnemonicWords])) as string;
    assert.equal(entropy, "0x00000000");

    await mnemonic.write.lockWordList();

    await viem.assertions.revertWithCustomError(
      mnemonic.write.setWordList([2, stringToHex("word2")], {
        account: owner.account,
      }),
      mnemonic,
      "WordListLocked",
    );
  });

  it("generateMnemonic: reverts when wordlist missing", async () => {
    const emptyMnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);
    const seed = "0x0000000000000000000000000000000000000000000000000000000000000000";

    await assert.rejects(emptyMnemonic.read.generateMnemonic([32n, seed]));
  });

  it("isValidMnemonic: reverts on unknown word", async () => {
    await assert.rejects(mnemonic.read.isValidMnemonic([["word0", "missing", "word0"]]));
  });
});
