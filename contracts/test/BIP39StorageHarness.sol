// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {BIP39Storage} from "../libs/BIP39Storage.sol";

/// @title BIP39Storage Test Harness
/// @notice Exposes BIP39Storage library functions for unit tests.
contract BIP39StorageHarness {
  using BIP39Storage for BIP39Storage.Storage;

  error WordIndexOutOfRange(uint16 wordIndex);
  error EmptyWord();
  error NotFoundWord();

  BIP39Storage.Storage private store;

  function setWordList(uint16 wordIndex, bytes calldata word) external {
    store.setWordList(wordIndex, word);
  }

  function wordList(uint16 wordIndex) external view returns (string memory) {
    return store.wordList(wordIndex);
  }

  function indexOfWordList(string calldata word) external view returns (uint16) {
    return store.indexOfWordList(word);
  }
}
