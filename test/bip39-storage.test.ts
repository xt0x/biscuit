import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const toBigInt = (value: bigint | number) => (typeof value === "bigint" ? value : BigInt(value));

describe("BIP39Storage (unit)", async () => {
  const { viem } = await network.connect();

  it("setWordList/wordList/indexOfWordList: stores and reads", async () => {
    const store = await viem.deployContract("BIP39StorageHarness");

    await store.write.setWordList([1, stringToHex("word1")]);

    const word = (await store.read.wordList([1])) as string;
    assert.equal(word, "word1");

    const idx = (await store.read.indexOfWordList(["word1"])) as bigint | number;
    assert.equal(toBigInt(idx), 1n);
  });

  it("setWordList: rejects empty word", async () => {
    const store = await viem.deployContract("BIP39StorageHarness");

    await viem.assertions.revertWithCustomError(
      store.write.setWordList([0, "0x"]),
      store,
      "EmptyWord",
    );
  });

  it("setWordList: rejects out-of-range index", async () => {
    const store = await viem.deployContract("BIP39StorageHarness");

    await viem.assertions.revertWithCustomError(
      store.write.setWordList([2048, stringToHex("word2048")]),
      store,
      "WordIndexOutOfRange",
    );
  });

  it("wordList/indexOfWordList: rejects missing entries", async () => {
    const store = await viem.deployContract("BIP39StorageHarness");

    await viem.assertions.revertWithCustomError(store.read.wordList([1]), store, "NotFoundWord");
    await viem.assertions.revertWithCustomError(
      store.read.indexOfWordList(["word1"]),
      store,
      "NotFoundWord",
    );
  });

  it("indexOfWordList: rejects empty word", async () => {
    const store = await viem.deployContract("BIP39StorageHarness");

    await viem.assertions.revertWithCustomError(
      store.read.indexOfWordList([""]),
      store,
      "EmptyWord",
    );
  });
});

describe("BIP39Storage (integration)", async () => {
  const { viem } = await network.connect();
  const [owner] = await viem.getWalletClients();

  it("Mnemonic uses stored wordlist", async () => {
    const mnemonic = await viem.deployContract("Mnemonic", [owner.account.address]);

    await mnemonic.write.setWordList([0, stringToHex("word0")], {
      account: owner.account,
    });

    const word = (await mnemonic.read.wordList([0])) as string;
    assert.equal(word, "word0");

    const idx = (await mnemonic.read.indexOfWordList(["word0"])) as bigint | number;
    assert.equal(toBigInt(idx), 0n);
  });
});
