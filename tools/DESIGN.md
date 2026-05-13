# Tools Design

## Purpose

This directory contains Node/Hardhat utilities used to prepare assets, deploy
supporting contracts, and generate SVG outputs for local verification. Shell
entrypoints belong in `scripts/` if they are needed; CI and repository-wide
checks should stay in `package.json` and `.github/workflows`.

## Script Inventory

- `prepare-fonts.mjs`
  - Subsets and chunks the font files used by the renderer.
  - Produces JSON chunk files in `assets/fonts/*`.
- `deploy-fonts.mjs`
  - Deploys `BiscuitFont` and uploads letter/digit chunks.
  - Can also append chunks to an existing `BiscuitFont` address.
- `render-svg.mjs`
  - Deploys a renderer harness and writes a simple SVG to `outputs/`.
  - With `BISCUIT_RENDER_MODE=fake-mnemonic`, deploys `Mnemonic`,
    `BiscuitFont`, and `BiscuitBuilder` on a local network, then renders a
    mnemonic SVG.
- `generate-fake-mnemonic-wordlist.mjs`
  - Builds a deterministic fake 2048-word list for local tests.

## Inputs and Outputs

- Inputs: font assets under `assets/fonts/*` and wordlists under
  `assets/mnemonic/*`.
- Outputs: SVG files under `outputs/` and chunked fonts under `assets/fonts/*`.

## Network Assumptions

- Many scripts use `hardhat`'s in-process network by default.
- For a persistent local node, start it with `pnpm hardhat node` and run
  scripts with `--network localhost`.

## Notes

- When Solidity changes, run `pnpm hardhat compile` before running
  render/deploy scripts to avoid stale artifacts.
- `BISCUIT_RENDER_MODE=fake-mnemonic tools/render-svg.mjs` uses random seeds, so
  output is non-deterministic unless the script is modified to accept a fixed
  seed.
