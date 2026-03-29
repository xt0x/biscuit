# Contracts Design

## Purpose

This directory contains the on-chain system for the Biscuit NFT. It provides:

- An ERC-721A token contract with mint/burn controls.
- Deterministic seed generation per token.
- SVG rendering and JSON metadata generation entirely on-chain.
- Font and mnemonic wordlist storage optimized for gas.

## Core Components

- `BiscuitToken.sol`
  - ERC721A token with max supply and fixed mint price.
  - Stores a seed per token at mint time.
  - Delegates metadata/SVG rendering to the builder.
  - Owner-controlled mint/burn toggles and royalty settings.
- `BiscuitBuilder.sol`
  - Holds references to `BiscuitFont` and `Mnemonic`.
  - Generates token seeds and assembles SVG/metadata via libraries.
  - Supports locking font/mnemonic references to prevent changes.
- `BiscuitFont.sol`
  - Stores font data in SSTORE2-backed pages for letters and digits.
  - Concatenates pages on read to serve woff2 payloads.
- `Mnemonic.sol`
  - Stores a BIP-39 wordlist and exposes mnemonic generation.
  - Locks wordlist when complete to prevent mutation.

## Libraries and Interfaces

- `libs/BiscuitRenderer.sol`
  - Pure SVG generator for the 4x6 mnemonic grid.
- `libs/BiscuitMetadata.sol`
  - Builds base64 JSON metadata with SVG image and attributes.
- `libs/BIP39.sol`, `libs/BIP39Storage.sol`
  - Wordlist storage and mnemonic derivation.
- `libs/SSTORE2.sol`, `libs/Memory.sol`
  - Optimized storage and memory copy utilities.
- `interfaces/*`
  - Narrow interfaces to avoid coupling and simplify testing.

## Data Flow

1. `BiscuitToken.safeMint` generates and stores a seed for each token.
2. `BiscuitToken.tokenURI` calls `BiscuitBuilder.tokenURI` with the seed.
3. `BiscuitBuilder` pulls font/mnemonic data and renders SVG + metadata.
4. `BiscuitMetadata` base64-encodes the SVG and JSON response.

## Invariants and Controls

- `MAX_SUPPLY` and `PRICE` are constants enforced at mint time.
- Minting and burning are gated by owner toggles.
- Builder, font, and mnemonic references can be locked permanently.
- Wordlist can be locked only when complete (2048 words).

## Security Considerations

- Minting uses `ReentrancyGuard` for ETH safety.
- Rendering is pure/read-only and does not mutate state.
- External calls are limited to known contracts and libraries.

## Extending

- Keep SVG rendering in libraries to avoid contract bloat.
- New traits or visual elements should be added in `BiscuitRenderer` and
  surfaced through `BiscuitMetadata` attributes.
