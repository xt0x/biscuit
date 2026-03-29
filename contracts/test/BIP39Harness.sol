// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {BIP39} from "../libs/BIP39.sol";
import {BIP39Storage} from "../libs/BIP39Storage.sol";

/// @title BIP39 Test Harness
/// @notice Exposes BIP39 library functions for unit tests.
contract BIP39Harness {
  using BIP39Storage for BIP39Storage.Storage;

  error InvalidStrengthValue(string message, uint256 strength);
  error InvalidMnemonicLength(string message, uint256 strength);
  error EmptyWord();
  error NotFoundWord();
  error ChecksumMismatch();
  error InvalidEntropyLength(string message, uint256 strength);

  BIP39Storage.Storage private store;

  function setWordList(uint16 wordIndex, bytes calldata word) external {
    store.setWordList(wordIndex, word);
  }

  function generate(uint256 strength, bytes32 seed) external view returns (string[] memory) {
    return BIP39.generate(store, strength, seed);
  }

  function toEntropy(string[] calldata words) external view returns (bytes memory) {
    return BIP39.toEntropy(store, words);
  }
}
