import { network } from "hardhat";
import { stringToHex } from "viem";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const { viem } = await network.connect();
const renderer = await viem.deployContract("BiscuitRendererHarness");

const letters = stringToHex("QUJD");
const digits = stringToHex("REVG");
const mnemonic = ["alpha", "beta", "gamma", "delta"];

const svg = await renderer.read.generateSVG([letters, digits, mnemonic]);

const outPath = "/Users/xx/Developer/biscuit/tmp/biscuit.svg";
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, svg, "utf8");

console.log(outPath);
