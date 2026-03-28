import { mkdirSync, writeFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { wordlists } from "bip39";
import wordList from "word-list-json";

const OUTPUT_DIR = new URL("../assets/mnemonic/", import.meta.url);
const OUTPUT_FILE = new URL("fake-wordlist.json", OUTPUT_DIR);
const TARGET_COUNT = 2048;

const getLengthRange = (words) => {
  let min = Infinity;
  let max = -Infinity;
  for (const word of words) {
    const len = word.length;
    if (len < min) min = len;
    if (len > max) max = len;
  }
  return { min, max };
};

const bip39List = wordlists.english.map((word) => word.toLowerCase());
const bip39Words = new Set(bip39List);
const { min: minLength, max: maxLength } = getLengthRange(bip39List);
const candidates = Array.from(
  new Set(
    wordList.map((word) => String(word).toLowerCase().trim()).filter(Boolean),
  ),
).filter(
  (word) =>
    /^[a-z]+$/.test(word) &&
    !bip39Words.has(word) &&
    word.length >= minLength &&
    word.length <= maxLength,
);

if (candidates.length < TARGET_COUNT) {
  throw new Error(
    `Not enough candidate words (${candidates.length}) after filtering out BIP-39 words and enforcing length ${minLength}-${maxLength}.`,
  );
}

const selection = candidates.slice();
for (let i = selection.length - 1; i > 0; i -= 1) {
  const j = randomInt(i + 1);
  [selection[i], selection[j]] = [selection[j], selection[i]];
}

const chosen = selection.slice(0, TARGET_COUNT);

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(OUTPUT_FILE, `${JSON.stringify(chosen, null, 2)}\n`, "utf8");

console.log(
  `Wrote ${chosen.length} words to ${OUTPUT_FILE.pathname} (length ${minLength}-${maxLength}).`,
);
