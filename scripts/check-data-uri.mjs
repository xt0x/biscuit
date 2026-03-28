import { network } from "hardhat";
import { stringToHex } from "viem";

const { viem } = await network.connect();
const metadata = await viem.deployContract("BiscuitMetadataHarness");

const letters = stringToHex("QUJD");
const digits = stringToHex("REVG");
const mnemonic = ["alpha", "beta", "gamma"];

const tokenUri = await metadata.read.tokenURI([1n, letters, digits, mnemonic]);

const [prefix, encoded] = tokenUri.split(",");
if (prefix !== "data:application/json;base64") {
  throw new Error(`Unexpected prefix: ${prefix}`);
}

const json = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
const image = json.image;
const [imgPrefix, imgEncoded] = image.split(",");

console.log("json.name:", json.name);
console.log("image prefix:", imgPrefix);
console.log("attributes length:", json.attributes?.length);
console.log(
  "svg starts with <svg:",
  Buffer.from(imgEncoded, "base64").toString("utf8").startsWith("<svg"),
);
