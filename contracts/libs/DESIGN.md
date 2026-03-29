# Libraries Design

## Purpose

Provides reusable, mostly pure utilities used across the contracts. Libraries
keep core contracts small and make functionality easier to test in isolation.

## Contents

- `BiscuitRenderer.sol`
  - SVG layout generator for the mnemonic grid.
- `BiscuitMetadata.sol`
  - JSON metadata construction and base64 encoding.
- `BIP39.sol` and `BIP39Storage.sol`
  - Mnemonic derivation and wordlist storage helpers.
- `SSTORE2.sol`
  - Minimal storage contract for cheap byte persistence.
- `Memory.sol`
  - Memory copy utilities for concatenation.
- `Utils.sol`
  - Small helper utilities (randomness, formatting, etc.).

## Design Notes

- Libraries are used by contracts via `internal` calls to avoid external calls.
- Rendering is purely functional and deterministic given input parameters.
- Storage helpers are optimized for gas and on-chain byte assembly.

## Guidelines

- Keep new functionality pure when possible.
- Avoid stateful logic in libraries; prefer contracts for state.
- Add harness contracts under `contracts/test/` for library testing.
