import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { stringToHex } from "viem";

const hexToUtf8 = (hex: `0x${string}`) => Buffer.from(hex.slice(2), "hex").toString("utf8");

describe("BiscuitRenderer (unit)", async () => {
  const { viem } = await network.connect();

  it("generatePathRow: renders 4 path uses", async () => {
    const renderer = await viem.deployContract("BiscuitRendererHarness");
    const row = (await renderer.read.generatePathRow()) as `0x${string}`;
    const rowStr = hexToUtf8(row);

    assert.equal((rowStr.match(/href="#path"/g) || []).length, 4);
    assert.ok(rowStr.includes('x="0"'));
    assert.ok(rowStr.includes('x="103"'));
    assert.ok(rowStr.includes('x="206"'));
    assert.ok(rowStr.includes('x="309"'));
  });

  it("generatePathColumn: renders 6 row uses", async () => {
    const renderer = await viem.deployContract("BiscuitRendererHarness");
    const column = (await renderer.read.generatePathColumn()) as `0x${string}`;
    const columnStr = hexToUtf8(column);

    assert.equal((columnStr.match(/href="#row"/g) || []).length, 6);
    assert.ok(columnStr.includes('y="0"'));
    assert.ok(columnStr.includes('y="24"'));
    assert.ok(columnStr.includes('y="48"'));
    assert.ok(columnStr.includes('y="72"'));
    assert.ok(columnStr.includes('y="96"'));
    assert.ok(columnStr.includes('y="120"'));
  });

  it("generateArt: renders 24 indices and supplied words", async () => {
    const renderer = await viem.deployContract("BiscuitRendererHarness");
    const art = (await renderer.read.generateArt([["alpha", "beta"]])) as `0x${string}`;
    const artStr = hexToUtf8(art);

    assert.equal((artStr.match(/class=\"index\"/g) || []).length, 24);
    assert.ok(artStr.includes(">1. </text>"));
    assert.ok(artStr.includes(">2. </text>"));
    assert.ok(artStr.includes(">alpha</text>"));
    assert.ok(artStr.includes(">beta</text>"));
  });

  it("generateSVG: embeds fonts and content", async () => {
    const renderer = await viem.deployContract("BiscuitRendererHarness");
    const letters = stringToHex("QUJD");
    const digits = stringToHex("REVG");

    const svg = (await renderer.read.generateSVG([letters, digits, ["alpha", "beta"]])) as string;

    assert.ok(svg.includes("data:font/woff2; charset=utf-8; base64,QUJD"));
    assert.ok(svg.includes("data:font/woff2; charset=utf-8; base64,REVG"));
    assert.ok(svg.includes('class="index"'));
    assert.ok(svg.includes('class="mnemonic"'));
    assert.ok(svg.includes(">alpha</text>"));
  });
});
