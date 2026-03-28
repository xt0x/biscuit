// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BIP39} from "./libs/BIP39.sol";
import {BIP39Storage} from "./libs/BIP39Storage.sol";
import {IMnemonic} from "./interfaces/IMnemonic.sol";

/// @notice Stores a BIP39 wordlist and exposes mnemonic generation/validation.
contract Mnemonic is IMnemonic, Ownable {
  using BIP39Storage for BIP39Storage.Storage;

  /// @notice Revert when the wordlist is already locked.
  error WordListLocked();

  /// @notice Revert when attempting to lock before full registration.
  error WordListIncomplete(uint16 count);

  /// @notice Storage structure holding a BIP39 word list of 2048 words
  BIP39Storage.Storage private bip39Storage;

  /// @notice Whether the wordlist updates are locked.
  bool public isSetWordListLocked;

  /// @notice Count of word indices that have been initialized.
  uint16 public wordListCount;

  /**
   * @notice Allow execution only if wordlist is not locked.
   */
  modifier whenSetWordListUnlocked() {
    if (isSetWordListLocked) revert WordListLocked();
    _;
  }

  /**
   * @notice Initialize the owner for wordlist management.
   */
  constructor(address initialOwner) Ownable(initialOwner) {}

  /**
   * @notice Generate a BIP39 mnemonic from the given seed.
   */
  function generateMnemonic(
    uint256 strength,
    bytes32 seed
  ) public view override returns (string[] memory) {
    return BIP39.generate(bip39Storage, strength, seed);
  }

  /**
   * @notice Verifies if the mnemonic is valid and returns the original entropy if correct.
   */
  function isValidMnemonic(string[] calldata words) public view returns (bytes memory) {
    return BIP39.toEntropy(bip39Storage, words);
  }

  /**
   * @notice Register or overwrite a word at the given index.
   * @dev Only callable by the owner when not locked.
   */
  function setWordList(
    uint16 wordIndex,
    bytes calldata word
  ) external onlyOwner whenSetWordListUnlocked {
    if (!bip39Storage.isWordSet(wordIndex)) {
      unchecked {
        ++wordListCount;
      }
    }
    bip39Storage.setWordList(wordIndex, word);
  }

  /**
   * @notice Retrieve a word from the index.
   */
  function wordList(uint16 wordIndex) external view returns (string memory) {
    return bip39Storage.wordList(wordIndex);
  }

  /**
   * @notice Retrieve the index of a word.
   */
  function indexOfWordList(string calldata word) external view returns (uint16) {
    return bip39Storage.indexOfWordList(word);
  }

  /**
   * @notice Locks the word list and permanently prohibits further changes.
   */
  function lockWordList() external onlyOwner whenSetWordListUnlocked {
    _lockWordList();
  }

  /**
   * @notice Locks the word list if all indices have been initialized.
   */
  function lockWordListIfComplete() external onlyOwner whenSetWordListUnlocked {
    if (!isWordListComplete()) revert WordListIncomplete(wordListCount);
    _lockWordList();
  }

  /**
   * @notice Returns true if all 2048 indices are initialized.
   */
  function isWordListComplete() public view returns (bool) {
    return wordListCount == 2048;
  }

  /**
   * @notice Internal lock implementation.
   */
  function _lockWordList() internal {
    isSetWordListLocked = true;

    emit SetWordListLocked();
  }
}
