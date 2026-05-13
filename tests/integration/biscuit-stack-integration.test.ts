import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const decodeBase64 = (input: string) => Buffer.from(input, "base64").toString("utf8");
const toBigInt = (value: bigint | number) => (typeof value === "bigint" ? value : BigInt(value));

const letters = stringToHex("ABC");
const digits = stringToHex("DEF");
const wordsA = ["alpha", "beta", "gamma"];
const wordsB = ["delta", "epsilon", "zeta"];

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

describe("BiscuitBuilder + BiscuitToken (integration)", async () => {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, receiver] = await viem.getWalletClients();

  it("end-to-end flow across builder and token", async () => {
    const fontA = await deployFont(viem, owner);
    const fontB = await deployFont(viem, owner);
    const mnemonicA = await viem.deployContract("MockMnemonic", [wordsA]);
    const mnemonicB = await viem.deployContract("MockMnemonic", [wordsB]);

    const builderA = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      fontA.address,
      mnemonicA.address,
    ]);

    assert.equal(await builderA.read.isFontLocked(), false);
    assert.equal(await builderA.read.isMnemonicLocked(), false);
    assert.equal((await builderA.read.font()).toLowerCase(), fontA.address.toLowerCase());
    assert.equal((await builderA.read.mnemonic()).toLowerCase(), mnemonicA.address.toLowerCase());

    const seed = (await builderA.read.generateSeed([1n])) as {
      mnemonicSeed: `0x${string}`;
      mnemonicStrength: bigint;
    };

    await builderA.write.setFont([fontB.address], { account: owner.account });
    await builderA.write.setMnemonic([mnemonicB.address], { account: owner.account });

    const svg = (await builderA.read.svg([seed])) as string;
    const image = (await builderA.read.generateSVGImage([seed])) as string;
    const tokenUri = (await builderA.read.tokenURI([7n, seed])) as string;

    assert.equal(decodeBase64(image), svg);
    assert.ok(tokenUri.startsWith("data:application/json;base64,"));

    await builderA.write.lockFont({ account: owner.account });
    await builderA.write.lockMnemonic({ account: owner.account });
    assert.equal(await builderA.read.isFontLocked(), true);
    assert.equal(await builderA.read.isMnemonicLocked(), true);

    const builderB = await viem.deployContract("BiscuitBuilder", [
      owner.account.address,
      fontA.address,
      mnemonicA.address,
    ]);

    const token = await viem.deployContract("BiscuitToken", [
      owner.account.address,
      receiver.account.address,
      500n,
      builderA.address,
    ]);

    assert.equal(await token.read.isMintActive(), false);
    assert.equal(await token.read.isBurnActive(), false);
    assert.equal(await token.read.isBuilderLocked(), false);
    assert.equal((await token.read.builder()).toLowerCase(), builderA.address.toLowerCase());

    await token.write.setBuilder([builderB.address], { account: owner.account });
    await token.write.lockBuilder({ account: owner.account });

    await token.write.setMintActive([true], { account: owner.account });
    await token.write.setBurnActive([true], { account: owner.account });

    const price = (await token.read.PRICE()) as bigint | number;
    await token.write.safeMint([1n], { account: owner.account, value: toBigInt(price) });

    const mintedUri = (await token.read.tokenURI([0n])) as string;
    const encoded = mintedUri.split(",")[1];
    const json = JSON.parse(decodeBase64(encoded)) as { image: string };
    assert.ok(json.image.startsWith("data:image/svg+xml;base64,"));

    const mintedImage = (await token.read.generateSVGImage([0n])) as string;
    const mintedSvg = (await token.read.svg([0n])) as string;
    assert.equal(decodeBase64(mintedImage), mintedSvg);

    await token.write.burn([0n], { account: owner.account });

    await token.write.setDefaultRoyalty([receiver.account.address, 250n], {
      account: owner.account,
    });
    const supportsErc721 = await token.read.supportsInterface(["0x80ac58cd"]);
    assert.equal(supportsErc721, true);

    const balanceBefore = await publicClient.getBalance({ address: token.address });
    await token.write.withdraw({ account: owner.account });
    const balanceAfter = await publicClient.getBalance({ address: token.address });
    assert.equal(balanceBefore, toBigInt(price));
    assert.equal(balanceAfter, 0n);
  });
});
