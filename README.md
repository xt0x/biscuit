# biscuit

This repository is initialized with environment setup only. Contract code will be added in subsequent PRs.

## Requirements

- Node.js 22.10+ (LTS)
- pnpm

## Setup

```shell
corepack enable
pnpm install
```

## Environment variables

Copy `.env.example` to `.env` and fill:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`
  Hardhat loads `.env` automatically via `dotenv/config`.

## Lint and format

```shell
pnpm lint
pnpm lint:sol
pnpm format
pnpm format:check
```

## Tests

```shell
pnpm test
pnpm test:solidity
pnpm test:node
```

## Notes

- Solidity contracts and Ignition modules will be added after initial setup.
