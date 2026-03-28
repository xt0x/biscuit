import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const decodeBase64 = (input: string) => Buffer.from(input, "base64").toString("utf8");

describe("BiscuitRenderer + BiscuitMetadata (integration)", async () => {
  const { viem } = await network.connect();

  it("generateSVGImage matches raw SVG", async () => {
    const renderer = await viem.deployContract("BiscuitRendererHarness");
    const metadata = await viem.deployContract("BiscuitMetadataHarness");
    const letters = stringToHex("QUJD");
    const digits = stringToHex("REVG");
    const mnemonic = ["alpha", "beta", "gamma"];

    const svg = (await renderer.read.generateSVG([letters, digits, mnemonic])) as string;
    const image = (await metadata.read.generateSVGImage([letters, digits, mnemonic])) as string;
    const decoded = decodeBase64(image);

    assert.equal(decoded, svg);
  });

  it("tokenURI JSON image SVG matches raw SVG", async () => {
    const renderer = await viem.deployContract("BiscuitRendererHarness");
    const metadata = await viem.deployContract("BiscuitMetadataHarness");
    const letters = stringToHex("QUJD");
    const digits = stringToHex("REVG");
    const mnemonic = ["alpha", "beta", "gamma"];

    const svg = (await renderer.read.generateSVG([letters, digits, mnemonic])) as string;
    const tokenUri = (await metadata.read.tokenURI([7n, letters, digits, mnemonic])) as string;
    const encoded = tokenUri.split(",")[1];
    const json = JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as {
      image: string;
    };
    const imageEncoded = json.image.split(",")[1];
    const decoded = Buffer.from(imageEncoded, "base64").toString("utf8");

    assert.equal(decoded, svg);
  });
});
