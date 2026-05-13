<div align="center">
  <img src="assets/branding/biscuit-caveat-tight.light.svg#gh-light-mode-only" alt="Biscuit" width="300"/>
  <img src="assets/branding/biscuit-caveat-tight.dark.svg#gh-dark-mode-only" alt="Biscuit" width="300"/>
  <h1>Biscuit</h1>
  <p><strong>Ethereum smart contracts that generate on-chain metadata</strong></p>
  <img alt="CI" src="https://img.shields.io/badge/CI-enabled-blue" />
  <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-blue" />
  <img alt="Solidity" src="https://img.shields.io/badge/solidity-0.8.28-363636" />
  <img alt="Hardhat" src="https://img.shields.io/badge/hardhat-3.2.0-FFDB1A" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8.3-3178C6" />
  <img alt="Node" src="https://img.shields.io/badge/node-%3E%3D22.13.0-339933" />
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.30.0-F69220" />
  <img alt="Network" src="https://img.shields.io/badge/network-sepolia-6F7FFF" />
</div>

---

## What is Biscuit?

Biscuit is a project that generates pseudo mnemonic codes on-chain inspired by [BIP39](https://bips.dev/39/) and turns them into NFTs.

BIP39 describes how to add a checksum to entropy and map it to words from a fixed wordlist (commonly used as 12/24-word phrases).

<p><span style="opacity:0.7">⚠️ Warning: This project is for entertainment purposes only. <strong>Do not use it to generate real wallet mnemonics.</strong> The authors assume no responsibility for any losses resulting from use of this repository.</span></p>
<p><span style="opacity:0.7">Note: Some SVG previews may render correctly only in Chromium-based browsers.</span></p>

<div align="center">
  <img src="assets/branding/biscuit.svg" alt="Biscuit.svg" width="400"/>
</div>

## Quick Start

```shell
corepack enable
./start.sh
```

Manual steps:

```shell
pnpm install
pnpm fonts:prepare
pnpm hardhat compile
pnpm hardhat run tools/render-svg.mjs
```

Outputs are written to `outputs/`.

## Config

Copy `.env.example` to `.env` and fill:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY` (never commit this or use a wallet with real funds)

Hardhat loads `.env` automatically via `dotenv/config`.

## Architecture

<pre><code>biscuit/
├── .github/          # GitHub configuration
│   └── workflows/    # CI workflows
├── artifacts/        # Hardhat build artifacts
├── assets/           # Fonts, wordlists, and branding assets
│   ├── branding/     # README images
│   ├── fonts/        # Font sources and subsets
│   │   ├── caveat/   # Caveat font files
│   │   └── inter/    # Inter font files
│   └── mnemonic/     # Wordlists for mnemonic generation
├── cache/            # Hardhat compiler cache
├── contracts/        # Solidity contracts and libraries
│   ├── interfaces/   # Contract interfaces
│   ├── libs/         # Shared libraries (rendering, utils)
│   └── test/         # Solidity test harnesses
├── ignition/         # Hardhat Ignition modules
├── test/             # TypeScript/Node tests
│   └── integration/  # Integration tests
├── tools/            # Node/Hardhat developer utilities
└── outputs/          # Local outputs (generated SVGs, scratch files)
</code></pre>

## Sequence

```mermaid
sequenceDiagram
  actor Operator
  actor Client
  participant Fonts as Font prep
  participant Font as BiscuitFont
  participant Mnemonic as Mnemonic
  participant Builder as BiscuitBuilder
  participant Meta as BiscuitMetadata
  participant Renderer as BiscuitRenderer

  Operator->>Fonts: prepare font chunks
  Operator->>Font: deploy and upload chunks
  Operator->>Mnemonic: deploy and set wordlist
  Operator->>Builder: deploy with Font and Mnemonic
  Operator->>Builder: lock Font and Mnemonic

  opt Generate seed optional
    Client->>Builder: generateSeed tokenId
    Builder-->>Client: Seed mnemonicSeed and mnemonicStrength
  end

  Client->>Builder: tokenURI tokenId and seed
  Builder->>Font: letters
  Font-->>Builder: letters bytes
  Builder->>Font: digits
  Font-->>Builder: digits bytes
  Builder->>Mnemonic: generateMnemonic strength and seed
  Mnemonic-->>Builder: words
  Builder->>Meta: tokenURI with SVG params
  Meta->>Renderer: generate SVG
  Renderer-->>Meta: raw SVG
  Meta-->>Builder: base64 JSON data URI
  Builder-->>Client: tokenURI data URI
```

## License

GPL-3.0 - see [LICENSE](LICENSE).
