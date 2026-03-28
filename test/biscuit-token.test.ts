import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const decodeBase64 = (input: string) => Buffer.from(input, "base64").toString("utf8");
const toBigInt = (value: bigint | number) => (typeof value === "bigint" ? value : BigInt(value));
const zeroAddress = "0x0000000000000000000000000000000000000000" as const;

const words = ["alpha", "beta", "gamma"];
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

async function deployBuilder(viem: ViemHarness, owner: WalletClient) {
  const font = await deployFont(viem, owner);
  const mnemonic = await viem.deployContract("MockMnemonic", [words]);
  const builder = await viem.deployContract("BiscuitBuilder", [
    owner.account.address,
    font.address,
    mnemonic.address,
  ]);
  return { builder, font, mnemonic };
}

describe("BiscuitToken (unit)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, receiver, other] = await viem.getWalletClients();

  it("constructor: sets owner, builder, and royalties", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    const contractOwner = (await token.read.owner()) as string;
    const storedBuilder = (await token.read.builder()) as string;
    assert.equal(contractOwner.toLowerCase(), owner.account.address.toLowerCase());
    assert.equal(storedBuilder.toLowerCase(), builder.address.toLowerCase());

    const royalty = (await token.read.royaltyInfo([1n, 10_000n])) as [string, bigint];
    assert.equal(royalty[0].toLowerCase(), receiver.account.address.toLowerCase());
    assert.equal(royalty[1], 500n);
  });

  it("setBuilder: onlyOwner + emits event", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const { builder: builderB } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await viem.assertions.revertWithCustomError(
      token.write.setBuilder([builderB.address], { account: other.account }),
      token,
      "OwnableUnauthorizedAccount",
    );

    const hash = await token.write.setBuilder([builderB.address], { account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "BuilderUpdated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const event = events[0];
    if (!event.args) throw new Error("Missing event args");
    assert.equal(String(event.args[0]).toLowerCase(), builder.address.toLowerCase());
    assert.equal(String(event.args[1]).toLowerCase(), builderB.address.toLowerCase());
  });

  it("setBuilder: allows zero address (intentional)", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await token.write.setBuilder([zeroAddress], { account: owner.account });
    const storedBuilder = (await token.read.builder()) as string;
    assert.equal(storedBuilder.toLowerCase(), zeroAddress.toLowerCase());
  });

  it("lockBuilder: onlyOwner + sets flag + emits", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const { builder: builderB } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await viem.assertions.revertWithCustomError(
      token.write.lockBuilder({ account: other.account }),
      token,
      "OwnableUnauthorizedAccount",
    );

    const hash = await token.write.lockBuilder({ account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "BuilderLocked",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const locked = (await token.read.isBuilderLocked()) as boolean;
    assert.equal(locked, true);

    await assert.rejects(
      token.write.setBuilder([builderB.address], { account: owner.account }),
      /Builder is locked/,
    );
  });

  it("setMintActive/setBurnActive: onlyOwner", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await viem.assertions.revertWithCustomError(
      token.write.setMintActive([true], { account: other.account }),
      token,
      "OwnableUnauthorizedAccount",
    );

    await viem.assertions.revertWithCustomError(
      token.write.setBurnActive([true], { account: other.account }),
      token,
      "OwnableUnauthorizedAccount",
    );

    await token.write.setMintActive([true], { account: owner.account });
    await token.write.setBurnActive([true], { account: owner.account });

    assert.equal(await token.read.isMintActive(), true);
    assert.equal(await token.read.isBurnActive(), true);
  });

  it("safeMint: enforces mint active, price, and max supply", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await assert.rejects(
      token.write.safeMint([1n], { account: owner.account, value: 0n }),
      /Biscuit Mint Not Active/,
    );

    await token.write.setMintActive([true], { account: owner.account });

    await assert.rejects(
      token.write.safeMint([1n], { account: owner.account, value: 0n }),
      /Insufficient ETH/,
    );

    const maxSupply = (await token.read.MAX_SUPPLY()) as bigint | number;
    await assert.rejects(
      token.write.safeMint([toBigInt(maxSupply) + 1n], { account: owner.account, value: 0n }),
      /Exceeds token supply/,
    );
  });

  it("safeMint: mints and stores seeds", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await token.write.setMintActive([true], { account: owner.account });
    const price = (await token.read.PRICE()) as bigint | number;
    const quantity = 2n;
    await token.write.safeMint([quantity], {
      account: owner.account,
      value: toBigInt(price) * quantity,
    });

    const totalSupply = (await token.read.totalSupply()) as bigint | number;
    assert.equal(toBigInt(totalSupply), quantity);

    const ownerOf0 = (await token.read.ownerOf([0n])) as string;
    assert.equal(ownerOf0.toLowerCase(), owner.account.address.toLowerCase());

    const seed0 = (await token.read.seeds([0n])) as {
      mnemonicSeed?: `0x${string}`;
      mnemonicStrength?: bigint | number;
      0?: `0x${string}`;
      1?: bigint | number;
    };
    const strength = toBigInt(seed0.mnemonicStrength ?? seed0[1] ?? 0n);
    assert.ok(strength >= 32n && strength <= 256n);
  });

  it("burn: requires burn active and ownership", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await token.write.setMintActive([true], { account: owner.account });
    const price = (await token.read.PRICE()) as bigint | number;
    await token.write.safeMint([1n], { account: owner.account, value: toBigInt(price) });

    await assert.rejects(
      token.write.burn([0n], { account: owner.account }),
      /Burning is not active/,
    );

    await token.write.setBurnActive([true], { account: owner.account });
    const hash = await token.write.burn([0n], { account: owner.account });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "BiscuitBurned",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });
    assert.equal(events.length, 1);

    await assert.rejects(token.read.ownerOf([0n]));
  });

  it("tokenURI/generateSVGImage/svg: require token existence", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await assert.rejects(token.read.tokenURI([0n]), /URI query for nonexistent token/);
    await assert.rejects(token.read.generateSVGImage([0n]), /URI query for nonexistent token/);
    await assert.rejects(token.read.svg([0n]), /URI query for nonexistent token/);
  });

  it("tokenURI/generateSVGImage/svg: render minted token", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await token.write.setMintActive([true], { account: owner.account });
    const price = (await token.read.PRICE()) as bigint | number;
    await token.write.safeMint([1n], { account: owner.account, value: toBigInt(price) });

    const tokenUri = (await token.read.tokenURI([0n])) as string;
    const encoded = tokenUri.split(",")[1];
    const json = JSON.parse(decodeBase64(encoded)) as { image: string };
    assert.ok(json.image.startsWith("data:image/svg+xml;base64,"));

    const image = (await token.read.generateSVGImage([0n])) as string;
    const svg = (await token.read.svg([0n])) as string;
    const decoded = decodeBase64(image);
    assert.equal(decoded, svg);
    assert.ok(svg.includes("alpha"));
  });

  it("setDefaultRoyalty: onlyOwner and fee cap", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await viem.assertions.revertWithCustomError(
      token.write.setDefaultRoyalty([receiver.account.address, 500n], { account: other.account }),
      token,
      "OwnableUnauthorizedAccount",
    );

    await assert.rejects(
      token.write.setDefaultRoyalty([receiver.account.address, 2000n], { account: owner.account }),
      /Royalty too high/,
    );

    const hash = await token.write.setDefaultRoyalty([receiver.account.address, 250n], {
      account: owner.account,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const events = await publicClient.getContractEvents({
      address: token.address,
      abi: token.abi,
      eventName: "DefaultRoyaltySet",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(events.length, 1);
    const royalty = (await token.read.royaltyInfo([1n, 10_000n])) as [string, bigint];
    assert.equal(royalty[1], 250n);
  });

  it("supportsInterface: ERC721 & ERC2981", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    const ERC721_ID = "0x80ac58cd" as const;
    const ERC2981_ID = "0x2a55205a" as const;
    const ERC165_ID = "0x01ffc9a7" as const;

    assert.equal(await token.read.supportsInterface([ERC721_ID]), true);
    assert.equal(await token.read.supportsInterface([ERC2981_ID]), true);
    assert.equal(await token.read.supportsInterface([ERC165_ID]), true);
  });

  it("withdraw: onlyOwner and non-zero balance", async () => {
    const { builder } = await deployBuilder(viem, owner);
    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builder.address,
    ]);

    await assert.rejects(
      token.write.withdraw({ account: owner.account }),
      /No ether left to withdraw/,
    );

    await token.write.setMintActive([true], { account: owner.account });
    const price = (await token.read.PRICE()) as bigint | number;
    await token.write.safeMint([1n], { account: owner.account, value: toBigInt(price) });

    const balanceBefore = await publicClient.getBalance({ address: token.address });
    assert.equal(balanceBefore, toBigInt(price));

    await token.write.withdraw({ account: owner.account });
    const balanceAfter = await publicClient.getBalance({ address: token.address });
    assert.equal(balanceAfter, 0n);
  });
});
