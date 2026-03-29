# Integration Tests Design

## Purpose

Integration tests validate that multiple contracts work together as a system.
They focus on deployment flow, cross-contract wiring, and end-to-end rendering.

## Coverage

- Full stack deployments with builder, font, and mnemonic contracts.
- Rendering pipelines from seed to SVG and metadata.
- Font upload and retrieval behavior under realistic usage.

## Guidelines

- Keep test setup explicit and reproducible.
- Prefer realistic data flows over heavy mocking.
- Assert on structural output instead of full string equality when possible.
