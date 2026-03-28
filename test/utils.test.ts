import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

const toBigInt = (value: bigint | number) => (typeof value === "bigint" ? value : BigInt(value));

describe("Utils (unit)", async () => {
  const { viem } = await network.connect();

  it("random(tokenId): returns a value", async () => {
    const utils = await viem.deployContract("UtilsHarness");
    const value = (await utils.read.randomToken([123n])) as bigint | number;
    assert.equal(typeof toBigInt(value), "bigint");
  });

  it("random(input, max): returns < max", async () => {
    const utils = await viem.deployContract("UtilsHarness");
    const max = 10n;
    const value = (await utils.read.randomMax([456n, max])) as bigint | number;
    assert.ok(toBigInt(value) < max);
  });

  it("random(input, max): reverts on max == 0", async () => {
    const utils = await viem.deployContract("UtilsHarness");
    await assert.rejects(utils.read.randomMax([1n, 0n]), /Max must be > 0/);
  });
});
