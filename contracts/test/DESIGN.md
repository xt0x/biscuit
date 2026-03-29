# Contract Test Harnesses Design

## Purpose

This directory holds Solidity harnesses and mocks used by the TypeScript test
suite. They expose internal library functions or simulate edge cases that are
hard to reach through production contracts.

## Contents

- `BiscuitRendererHarness.sol` and `BiscuitMetadataHarness.sol`
  - Surface library functions for SVG/metadata tests.
- `BIP39Harness.sol` and `BIP39StorageHarness.sol`
  - Exercise mnemonic logic and wordlist storage.
- `SSTORE2Harness.sol`, `UtilsHarness.sol`
  - Validate helper libraries in isolation.
- `MockMnemonic.sol`
  - Minimal mnemonic implementation for unit tests.
- `StopCode.sol`
  - Utility contract used by SSTORE2 tests.

## Guidelines

- Harnesses should be minimal and deterministic.
- Avoid adding production logic here.
- Prefer explicit, narrow test helpers over general-purpose mocks.
