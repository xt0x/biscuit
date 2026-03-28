import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const decodeBase64 = (input: string) => Buffer.from(input, "base64").toString("utf8");
const toBigInt = (value: bigint | number) => (typeof value === "bigint" ? value : BigInt(value));
const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

const wordsA = ["alpha", "beta", "gamma"];
const wordsB = ["delta", "epsilon", "zeta"];
const letters = stringToHex("QUJD");
const digits = stringToHex("REVG");

type WalletClient = Awaited<
  ReturnType<typeof network.connect>
>["viem"]["getWalletClients"] extends () => Promise<(infer T)[]>
  ? T
  : never;
type ViemHarness = Awaited<ReturnType<typeof network.connect>>["viem"];

async function deployFont(viem: ViemHarness, owner: WalletClient) {
  const font = await viem.deployContract("BiscuitFont", [owner.account.address]);
  await font.write.addLetters([letters], { account: owner.account });
  await font.write.addDigits([digits], { account: owner.account });
  return font;
}

describe("BiscuitBuilder (unit)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, other] = await viem.getWalletClients();

  it("constructor: sets owner, font, mnemonic", async () => {
    const font = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    const contractOwner = (await builder.read.owner()) as string;
    const storedFont = (await builder.read.font()) as string;
    const storedMnemonic = (await builder.read.mnemonic()) as string;

    assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(storedFont.toLowerCase(), font.address.toLowerCase());
    assert.equal(storedMnemonic.toLowerCase(), mnemonic.address.toLowerCase());
  });

  it("setFont: onlyOwner + emits event", async () => {
    const fontA = await deployFont(viem, owner);
    const fontB = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      fontA.address,
      mnemonic.address,
    ]);

    await viem.assertions.revertWithCustomError(
      builder.write.setFont([fontB.address], { account: other.account }),
      builder,
      "OwnableUnauthorizedAccount",
    );

    const hash = await builder.write.setFont([fontB.address], { account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: builder.address,
      abi: builder.abi,
      eventName: "SetFontUpdated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const event = events[0];
    if (!event.args) throw new Error("Missing event args");
    assert.equal(String(event.args[0]).toLowerCase(), fontA.address.toLowerCase());
    assert.equal(String(event.args[1]).toLowerCase(), fontB.address.toLowerCase());
  });

  it("setFont: allows zero address (intentional)", async () => {
    const font = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    await builder.write.setFont([zeroAddress], { account: owner.account });
    const storedFont = (await builder.read.font()) as string;
    assert.equal(storedFont.toLowerCase(), zeroAddress.toLowerCase());
  });

  it("lockFont: onlyOwner + sets flag + emits", async () => {
    const font = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    await viem.assertions.revertWithCustomError(
      builder.write.lockFont({ account: other.account }),
      builder,
      "OwnableUnauthorizedAccount",
    );

    const hash = await builder.write.lockFont({ account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: builder.address,
      abi: builder.abi,
      eventName: "FontLocked",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const locked = (await builder.read.isFontLocked()) as boolean;
    assert.equal(locked, true);

    await assert.rejects(builder.write.lockFont({ account: owner.account }), /Font is locked/);
  });

  it("setMnemonic: onlyOwner + emits event", async () => {
    const font = await deployFont(viem, owner);
    const mnemonicA = await viem.deployContract("MockMnemonic", [wordsA]);
    const mnemonicB = await viem.deployContract("MockMnemonic", [wordsB]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonicA.address,
    ]);

    await viem.assertions.revertWithCustomError(
      builder.write.setMnemonic([mnemonicB.address], { account: other.account }),
      builder,
      "OwnableUnauthorizedAccount",
    );

    const hash = await builder.write.setMnemonic([mnemonicB.address], { account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: builder.address,
      abi: builder.abi,
      eventName: "SetMnemonicUpdated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const event = events[0];
    if (!event.args) throw new Error("Missing event args");
    assert.equal(String(event.args[0]).toLowerCase(), mnemonicA.address.toLowerCase());
    assert.equal(String(event.args[1]).toLowerCase(), mnemonicB.address.toLowerCase());
  });

  it("setMnemonic: allows zero address (intentional)", async () => {
    const font = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    await builder.write.setMnemonic([zeroAddress], { account: owner.account });
    const storedMnemonic = (await builder.read.mnemonic()) as string;
    assert.equal(storedMnemonic.toLowerCase(), zeroAddress.toLowerCase());
  });

  it("lockMnemonic: onlyOwner + sets flag + emits", async () => {
    const font = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    await viem.assertions.revertWithCustomError(
      builder.write.lockMnemonic({ account: other.account }),
      builder,
      "OwnableUnauthorizedAccount",
    );

    const hash = await builder.write.lockMnemonic({ account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: builder.address,
      abi: builder.abi,
      eventName: "MnemonicLocked",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const locked = (await builder.read.isMnemonicLocked()) as boolean;
    assert.equal(locked, true);

    await assert.rejects(
      builder.write.lockMnemonic({ account: owner.account }),
      /Mnemonic is locked/,
    );
  });

  it("setFont/setMnemonic: blocked when locked", async () => {
    const fontA = await deployFont(viem, owner);
    const fontB = await deployFont(viem, owner);
    const mnemonicA = await viem.deployContract("MockMnemonic", [wordsA]);
    const mnemonicB = await viem.deployContract("MockMnemonic", [wordsB]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      fontA.address,
      mnemonicA.address,
    ]);

    await builder.write.lockFont({ account: owner.account });
    await builder.write.lockMnemonic({ account: owner.account });

    await assert.rejects(
      builder.write.setFont([fontB.address], { account: owner.account }),
      /Font is locked/,
    );
    await assert.rejects(
      builder.write.setMnemonic([mnemonicB.address], { account: owner.account }),
      /Mnemonic is locked/,
    );
  });

  it("tokenURI/generateSVGImage/svg: render using font and mnemonic", async () => {
    const font = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    const seed = (await builder.read.generateSeed([1n])) as {
      mnemonicSeed: `0x${string}`;
      mnemonicStrength: bigint;
    };

    const tokenUri = (await builder.read.tokenURI([7n, seed])) as string;
    const encoded = tokenUri.split(",")[1];
    const json = JSON.parse(decodeBase64(encoded)) as { image: string; name: string };

    assert.equal(json.name, "Biscuit #7");
    assert.ok(json.image.startsWith("data:image/svg+xml;base64,"));

    const image = (await builder.read.generateSVGImage([seed])) as string;
    const svg = (await builder.read.svg([seed])) as string;

    const decoded = decodeBase64(image);
    assert.equal(decoded, svg);
    assert.ok(svg.includes("alpha"));
    assert.ok(svg.includes("beta"));
  });

  it("generateSeed: strength is within 32..256 and multiple of 32", async () => {
    const font = await deployFont(viem, owner);
    const mnemonic = await viem.deployContract("MockMnemonic", [wordsA]);
    const builder = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      font.address,
      mnemonic.address,
    ]);

    const seed = (await builder.read.generateSeed([99n])) as {
      mnemonicSeed: `0x${string}`;
      mnemonicStrength: bigint | number;
    };
    const strength = toBigInt(seed.mnemonicStrength);
    assert.ok(strength >= 32n && strength <= 256n);
    assert.equal(strength % 32n, 0n);
  });
});
