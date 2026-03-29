# Interfaces Design

## Purpose

Defines the minimal public surfaces for the core contracts. These interfaces
reduce coupling and enable testing/mocking without full contract imports.

## Contents

- `IBiscuitBuilder.sol`
  - Builder entry points for SVG/metadata generation and seed handling.
- `IBiscuitFont.sol`
  - Font storage and retrieval API for letters/digits.
- `IBiscuitToken.sol`
  - Token-facing interface for builder integration.
- `IMnemonic.sol`
  - Mnemonic generation interface used by the builder.

## Guidelines

- Keep interfaces minimal and stable.
- Use interfaces in contracts and tests to avoid circular dependencies.
- When adding new external functions, update the interface first.
