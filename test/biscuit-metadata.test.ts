import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const hexToUtf8 = (hex: `0x${string}`) => Buffer.from(hex.slice(2), "hex").toString("utf8");
const decodeBase64 = (input: string) => Buffer.from(input, "base64").toString("utf8");

describe("BiscuitMetadata (unit)", async () => {
  const { viem } = await network.connect();

  it("trait: returns JSON snippet", async () => {
    const metadata = await viem.deployContract("BiscuitMetadataHarness");
    const trait = (await metadata.read.trait(["FOO", "bar"])) as `0x${string}`;
    const traitStr = hexToUtf8(trait);

    assert.equal(traitStr, '{"trait_type": "FOO","value": "bar"}');
  });

  it("attributes: fills missing values and adds WORDS", async () => {
    const metadata = await viem.deployContract("BiscuitMetadataHarness");
    const attributes = (await metadata.read.attributes([["alpha", "beta"]])) as `0x${string}`;
    const attributesStr = hexToUtf8(attributes);

    assert.ok(attributesStr.includes('{"trait_type": "ONE","value": "alpha"}'));
    assert.ok(attributesStr.includes('{"trait_type": "TWO","value": "beta"}'));
    assert.ok(attributesStr.includes('{"trait_type": "THREE","value": "N/A"}'));
    assert.ok(attributesStr.includes('{"trait_type": "WORDS","value": "2"}'));
  });

  it("generateSVGImage: base64-encodes SVG", async () => {
    const metadata = await viem.deployContract("BiscuitMetadataHarness");
    const letters = stringToHex("QUJD");
    const digits = stringToHex("REVG");

    const image = (await metadata.read.generateSVGImage([letters, digits, ["alpha"]])) as string;
    const svg = decodeBase64(image);

    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("base64,QUJD"));
    assert.ok(svg.includes("base64,REVG"));
    assert.ok(svg.includes(">alpha</text>"));
  });

  it("tokenURI: returns base64 JSON with attributes", async () => {
    const metadata = await viem.deployContract("BiscuitMetadataHarness");
    const letters = stringToHex("QUJD");
    const digits = stringToHex("REVG");

    const tokenUri = (await metadata.read.tokenURI([
      42n,
      letters,
      digits,
      ["alpha", "beta"],
    ])) as string;
    const encoded = tokenUri.split(",")[1];
    const json = JSON.parse(decodeBase64(encoded));

    assert.equal(json.name, "Biscuit #42");
    assert.ok(json.image.startsWith("data:image/svg+xml;base64,"));
    assert.ok(Array.isArray(json.attributes));
    assert.equal(json.attributes.length, 25);
  });
});
