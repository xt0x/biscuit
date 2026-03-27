import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

describe("Mnemonic (unit)", async () => {
  const { viem } = await network.connect();
  const [owner, other] = await viem.getWalletClients();

  it("setWordList: rejects non-owner", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await viem.assertions.revertWithCustomError(
      mnemonic.write.setWordList([0, stringToHex("word0")], {
        account: other.account,
      }),
      mnemonic,
      "OwnableUnauthorizedAccount",
    );
  });

  it("setWordList: rejects empty word", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await assert.rejects(
      mnemonic.write.setWordList([0, "0x"], {
        account: owner.account,
      }),
    );
  });

  it("setWordList: rejects out-of-range index", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await assert.rejects(
      mnemonic.write.setWordList([2048, stringToHex("word2048")], {
        account: owner.account,
      }),
    );
  });

  it("wordList/indexOfWordList: returns stored entries", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await mnemonic.write.setWordList([1, stringToHex("word1")], {
      account: owner.account,
    });

    const word = (await mnemonic.read.wordList([1])) as string;
    assert.equal(word, "word1");

    const idx = (await mnemonic.read.indexOfWordList(["word1"])) as bigint | number;
    assert.equal(typeof idx === "bigint" ? idx : BigInt(idx), 1n);
  });

  it("wordList/indexOfWordList: rejects missing word", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await assert.rejects(mnemonic.read.wordList([1]));
    await assert.rejects(mnemonic.read.indexOfWordList(["word1"]));
  });

  it("indexOfWordList: rejects empty word", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await assert.rejects(mnemonic.read.indexOfWordList([""]));
  });

  it("lockWordList: blocks further updates", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await mnemonic.write.lockWordList();

    await viem.assertions.revertWithCustomError(
      mnemonic.write.setWordList([0, stringToHex("word0")], {
        account: owner.account,
      }),
      mnemonic,
      "WordListLocked",
    );

    await viem.assertions.revertWithCustomError(
      mnemonic.write.lockWordList(),
      mnemonic,
      "WordListLocked",
    );
  });

  it("generateMnemonic: rejects invalid strength", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    const seed = "0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";

    await assert.rejects(mnemonic.read.generateMnemonic([33n, seed]));
  });

  it("isValidMnemonic: rejects invalid length", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await assert.rejects(mnemonic.read.isValidMnemonic([["only", "two"]]));
  });

  it("generateMnemonic/isValidMnemonic: succeeds with configured wordlist", async () => {
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

    const entropy = (await mnemonic.read.isValidMnemonic([mnemonicWords])) as string;
    assert.equal(entropy, "0x00000000");
  });

  it("isValidMnemonic: rejects unknown word", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await mnemonic.write.setWordList([0, stringToHex("word0")], {
      account: owner.account,
    });

    await assert.rejects(mnemonic.read.isValidMnemonic([["word0", "missing", "word0"]]));
  });
});

describe("Mnemonic (integration)", async () => {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  it("generateMnemonic -> isValidMnemonic roundtrip", async () => {
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

    const entropy = (await mnemonic.read.isValidMnemonic([mnemonicWords])) as string;
    assert.equal(entropy, "0x00000000");
  });
});
