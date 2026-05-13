import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const byteLength = (hex: `0x${string}`) => BigInt((hex.length - 2) / 2);
const concatHex = (left: `0x${string}`, right: `0x${string}`) =>
  `0x${left.slice(2)}${right.slice(2)}` as `0x${string}`;
const repeatHexByte = (hexByte: string, count: number) =>
  `0x${hexByte.repeat(count)}` as `0x${string}`;
const toBigInt = (value: bigint | number) => (typeof value === "bigint" ? value : BigInt(value));

describe("BiscuitFont (unit)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, other] = await viem.getWalletClients();
  const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

  it("lettersCount/digitsCount: initial 0 & increments", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const store = await viem.deployContract("SSTORE2Harness");

    const lettersCountStart = (await font.read.lettersCount()) as bigint | number;
    const digitsCountStart = (await font.read.digitsCount()) as bigint | number;
    assert.equal(toBigInt(lettersCountStart), 0n);
    assert.equal(toBigInt(digitsCountStart), 0n);

    await font.write.addLetters([stringToHex("L1")], { account: owner.account });
    await font.write.addDigits([stringToHex("D1")], { account: owner.account });

    const lettersCountAfter = (await font.read.lettersCount()) as bigint | number;
    const digitsCountAfter = (await font.read.digitsCount()) as bigint | number;
    assert.equal(toBigInt(lettersCountAfter), 1n);
    assert.equal(toBigInt(digitsCountAfter), 1n);

    await store.write.write([stringToHex("L2")]);
    const pointer = (await store.read.lastPointer()) as `0x${string}`;
    await font.write.addLettersFromPointer([pointer, byteLength(stringToHex("L2"))], {
      account: owner.account,
    });

    const lettersCountFinal = (await font.read.lettersCount()) as bigint | number;
    assert.equal(toBigInt(lettersCountFinal), 2n);
  });

  it("addLetters: rejects empty bytes", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);

    await viem.assertions.revertWithCustomError(
      font.write.addLetters(["0x"], { account: owner.account }),
      font,
      "EmptyBytes",
    );
  });

  it("addDigits: rejects empty bytes", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);

    await viem.assertions.revertWithCustomError(
      font.write.addDigits(["0x"], { account: owner.account }),
      font,
      "EmptyBytes",
    );
  });

  it("addLetters/addDigits: onlyOwner", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);

    await viem.assertions.revertWithCustomError(
      font.write.addLetters([stringToHex("L1")], { account: other.account }),
      font,
      "OwnableUnauthorizedAccount",
    );

    await viem.assertions.revertWithCustomError(
      font.write.addDigits([stringToHex("D1")], { account: other.account }),
      font,
      "OwnableUnauthorizedAccount",
    );
  });

  it("addLetters: emits LettersPageAdded", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const data = stringToHex("L1");
    const hash = await font.write.addLetters([data], { account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: font.address,
      abi: font.abi,
      eventName: "LettersPageAdded",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const event = events[0];
    if (!event.args) throw new Error("Missing event args");
    assert.equal(toBigInt(event.args.pageIndex!), 0n);
    assert.equal(toBigInt(event.args.totalBytes!), byteLength(data));
  });

  it("addDigits: emits DigitsPageAdded", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const data = stringToHex("D1");
    const hash = await font.write.addDigits([data], { account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: font.address,
      abi: font.abi,
      eventName: "DigitsPageAdded",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const event = events[0];
    if (!event.args) throw new Error("Missing event args");
    assert.equal(toBigInt(event.args.pageIndex!), 0n);
    assert.equal(toBigInt(event.args.totalBytes!), byteLength(data));
  });

  it("addLettersFromPointer/addDigitsFromPointer: onlyOwner", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const store = await viem.deployContract("SSTORE2Harness");
    const data = stringToHex("P1");

    await store.write.write([data]);
    const pointer = (await store.read.lastPointer()) as `0x${string}`;
    const len = byteLength(data);

    await viem.assertions.revertWithCustomError(
      font.write.addLettersFromPointer([pointer, len], { account: other.account }),
      font,
      "OwnableUnauthorizedAccount",
    );

    await viem.assertions.revertWithCustomError(
      font.write.addDigitsFromPointer([pointer, len], { account: other.account }),
      font,
      "OwnableUnauthorizedAccount",
    );
  });

  it("addLettersFromPointer: rejects zero pointer", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);

    await viem.assertions.revertWithCustomError(
      font.write.addLettersFromPointer([zeroAddress, 1n], { account: owner.account }),
      font,
      "ZeroPointer",
    );
  });

  it("addLettersFromPointer: rejects EOA pointer (code length 0)", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);

    await viem.assertions.revertWithCustomError(
      font.write.addLettersFromPointer([owner.account.address, 1n], { account: owner.account }),
      font,
      "BadLength",
    );
  });

  it("addLettersFromPointer: rejects STOP-only pointer (code length 1)", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const stop = await viem.deployContract("StopCode");

    await viem.assertions.revertWithCustomError(
      font.write.addLettersFromPointer([stop.address, 1n], { account: owner.account }),
      font,
      "BadLength",
    );
  });

  it("addDigitsFromPointer: rejects len == 0", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const store = await viem.deployContract("SSTORE2Harness");
    const data = stringToHex("1234");
    await store.write.write([data]);
    const pointer = (await store.read.lastPointer()) as `0x${string}`;

    await viem.assertions.revertWithCustomError(
      font.write.addDigitsFromPointer([pointer, 0n], { account: owner.account }),
      font,
      "BadLength",
    );
  });

  it("addLettersFromPointer: rejects len mismatch", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const store = await viem.deployContract("SSTORE2Harness");
    const data = stringToHex("abcd");
    await store.write.write([data]);
    const pointer = (await store.read.lastPointer()) as `0x${string}`;

    await viem.assertions.revertWithCustomError(
      font.write.addLettersFromPointer([pointer, byteLength(data) + 1n], {
        account: owner.account,
      }),
      font,
      "BadLength",
    );
  });

  it("letters: concatenates valid pages", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const store = await viem.deployContract("SSTORE2Harness");
    const partA = stringToHex("Hello ");
    const partB = stringToHex("World");

    await store.write.write([partA]);
    const pointerA = (await store.read.lastPointer()) as `0x${string}`;

    await store.write.write([partB]);
    const pointerB = (await store.read.lastPointer()) as `0x${string}`;

    await font.write.addLettersFromPointer([pointerA, byteLength(partA)], {
      account: owner.account,
    });
    await font.write.addLettersFromPointer([pointerB, byteLength(partB)], {
      account: owner.account,
    });

    const letters = (await font.read.letters()) as `0x${string}`;
    assert.equal(letters, concatHex(partA, partB));
  });

  it("addLettersFromPointer: accepts valid pointer", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const store = await viem.deployContract("SSTORE2Harness");
    const data = stringToHex("ABC");

    await store.write.write([data]);
    const pointer = (await store.read.lastPointer()) as `0x${string}`;

    await font.write.addLettersFromPointer([pointer, byteLength(data)], {
      account: owner.account,
    });

    const letters = (await font.read.letters()) as `0x${string}`;
    assert.equal(letters, data);
  });

  it("digits: concatenates valid pages", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const partA = stringToHex("123");
    const partB = stringToHex("456");

    await font.write.addDigits([partA], { account: owner.account });
    await font.write.addDigits([partB], { account: owner.account });

    const digits = (await font.read.digits()) as `0x${string}`;
    assert.equal(digits, concatHex(partA, partB));
  });

  it("addDigitsFromPointer: accepts valid pointer", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const store = await viem.deployContract("SSTORE2Harness");
    const data = stringToHex("789");

    await store.write.write([data]);
    const pointer = (await store.read.lastPointer()) as `0x${string}`;

    await font.write.addDigitsFromPointer([pointer, byteLength(data)], {
      account: owner.account,
    });

    const digits = (await font.read.digits()) as `0x${string}`;
    assert.equal(digits, data);
  });

  it("letters: handles large multi-page payload", async () => {
    const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
    const partA = repeatHexByte("ab", 2048);
    const partB = repeatHexByte("cd", 2048);
    const partC = repeatHexByte("ef", 2048);

    await font.write.addLetters([partA], { account: owner.account });
    await font.write.addLetters([partB], { account: owner.account });
    await font.write.addLetters([partC], { account: owner.account });

    const letters = (await font.read.letters()) as `0x${string}`;
    const expected = concatHex(concatHex(partA, partB), partC);
    assert.equal(letters, expected);
  });
});
