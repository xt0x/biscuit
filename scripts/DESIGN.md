# Scripts Design

## Purpose

This directory contains Node/Hardhat utilities used to prepare assets, deploy
supporting contracts, and generate SVG outputs for local verification.

## Script Inventory

- `prepare-fonts.mjs`
  - Subsets and chunks the font files used by the renderer.
  - Produces JSON chunk files in `assets/fonts/*`.
- `deploy-fonts.mjs`
  - Deploys `BiscuitFont` and uploads letter/digit chunks.
  - Can also append chunks to an existing `BiscuitFont` address.
- `render-svg.mjs`
  - Deploys a renderer harness and writes a simple SVG to `outputs/`.
- `render-svg-fake-mnemonic.mjs`
  - Deploys `Mnemonic`, `BiscuitFont`, and `BiscuitBuilder` on a local network.
  - Loads a fake wordlist and renders a mnemonic SVG to `outputs/`.
- `generate-fake-mnemonic-wordlist.mjs`
  - Builds a deterministic fake 2048-word list for local tests.
- `check-data-uri.mjs`
  - Sanity-checks data URIs produced by metadata/image renderers.
- `lint-sol.mjs`
  - Runs `solhint` with repo configuration.

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
- `render-svg-fake-mnemonic.mjs` uses random seeds, so output is non-deterministic
  unless the script is modified to accept a fixed seed.
