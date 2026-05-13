# Test Design

## Purpose

Tests validate the on-chain components and supporting libraries. Coverage is
split between contract unit tests and broader integration checks.

## Layout

- Root `test/` files focus on unit-level behavior for each contract or library.
- `test/integration/` contains end-to-end scenarios that exercise deployment
  and cross-contract interactions.

## Current Test Areas

- `biscuit-token.test.ts`
  - Mint/burn flows, royalties, and metadata delegation.
- `biscuit-builder.test.ts`
  - Seed handling, SVG/metadata generation, and lock behavior.
- `biscuit-font.test.ts`
  - Chunk storage, concatenation, and edge cases.
- `mnemonic.test.ts` and `bip39*.test.ts`
  - Wordlist management, mnemonic generation, and validation.
- `biscuit-renderer.test.ts` and `biscuit-metadata.test.ts`
  - SVG output shape, attribute generation, and data URI formatting.
- `utils.test.ts`
  - Supporting helper behaviors.

## Execution

- Run all tests: `pnpm test`
- Solidity-focused: `pnpm test:solidity`
- Node-focused: `pnpm test:node`

## Principles

- Tests should avoid network dependencies outside the Hardhat local runtime.
- Rendering tests should assert stable structural output rather than brittle
  string matches when possible.
- Integration tests should validate that the full pipeline
  (seed -> SVG -> metadata) works end to end.
