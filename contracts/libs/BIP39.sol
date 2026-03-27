// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BIP39Storage} from "./BIP39Storage.sol";

/// @title BIP39
/// @author xt0x (https://github.com/xt0x)
/// @notice trezor (https://github.com/trezor/python-mnemonic/blob/master/src/mnemonic/mnemonic.py)
/// @dev Adapted from the reference code. This is a non-standard variant: it supports 32–256 bits
///      (3–24 words) and derives entropy by truncating the seed (no hashing).
///      Do not use in production wallets.
library BIP39 {
  using BIP39Storage for BIP39Storage.Storage;

  // =============================================================
  //                           ERRORS
  // =============================================================

  error InvalidStrengthValue(string message, uint256 strength);

  error InvalidMnemonicLength(string message, uint256 strength);

  error ChecksumMismatch();

  error InvalidEntropyLength(string message, uint256 strength);

  // =============================================================
  //                           CONSTANTS
  // =============================================================

  /// @notice Incremental width of entropy intensity.
  uint256 private constant _STEP_STRENGTH_BITS = 32;

  /// @notice Minimum value of entropy intensity.
  uint256 private constant _MIN_STRENGTH_BITS = 32;

  /// @notice Maximum value of entropy intensity.
  uint256 private constant _MAX_STRENGTH_BITS = 256;

  /// @notice Step range of mnemonic word counts.
  uint256 private constant _WORD_COUNT_STEP = 3;

  /// @notice Minimum number of words in mnemonic.
  uint256 private constant _MIN_WORD_COUNT = 3;

  /// @notice Maximum number of words in mnemonic
  uint256 private constant _MAX_WORD_COUNT = 24;

  /// @notice Incremental width of entropy length.
  uint256 private constant _STEP_ENTROPY_BYTES = 4;

  /// @notice Minimum entropy length.
  uint256 private constant _MIN_ENTROPY_BYTES = 4;

  /// @notice Maximum entropy length.
  uint256 private constant _MAX_ENTROPY_BYTES = 32;

  /// @notice Number of bits per byte.
  uint256 private constant _BITS_PER_BYTE = 8;

  /// @notice Number of bits represented per mnemonic word.
  uint256 private constant _BITS_PER_WORD = 11;

  /// @notice Bit mask (=0x7FF) to extract the index for 11 bits.
  uint256 private constant _BITMASK_WORD_INDEX = (1 << _BITS_PER_WORD) - 1;

  /// @notice Register width for bit packing (uint256 = 256 bit).
  uint256 private constant _UINT_BITS = 256;

  // =============================================================
  //                       BIP39 OPERATIONS
  // =============================================================

  /**
   * @notice Generates a mnemonic from arbitrary input.
   * @dev Entropy is derived by truncating the seed to 'strength' bits (no hashing).
   * Check-sum bits are appended per BIP39 and converted to indices.
   * Look-ups use 'wordList'.
   * @param  self Storage reference that exposes the BIP39 word-list.
   * @param  strength Entropy size in bits (32–256, step 32).
   * @param  seed Input value used as an entropy source.
   * @return mnemonic Array of words (length 3–24).
   */
  function generate(
    BIP39Storage.Storage storage self,
    uint256 strength,
    bytes32 seed
  ) internal view returns (string[] memory) {
    if (
      strength % _STEP_STRENGTH_BITS != 0 ||
      strength < _MIN_STRENGTH_BITS ||
      strength > _MAX_STRENGTH_BITS
    ) {
      revert InvalidStrengthValue(
        "Must be a multiple of 32 between 32 and 256, but it is not",
        strength
      );
    }
    bytes memory entropy = _slice(seed, strength / _BITS_PER_BYTE);
    return _toMnemonic(self, entropy);
  }

  /**
   * @notice Converts a mnemonic back to its raw entropy.
   * @dev This accepts 3–24 words (non-standard BIP39 range).
   * @param  self Storage reference that exposes the BIP39 word-list.
   * @param  words The mnemonic (3–24 words, multiple of 3).
   * @return entropy The original entropy bytes.
   */
  function toEntropy(
    BIP39Storage.Storage storage self,
    string[] calldata words
  ) internal view returns (bytes memory) {
    uint256 wordCount = words.length;
    if (
      wordCount % _WORD_COUNT_STEP != 0 ||
      wordCount < _MIN_WORD_COUNT ||
      wordCount > _MAX_WORD_COUNT
    ) {
      revert InvalidMnemonicLength(
        "Must be a multiple of 3 between 3 and 24, but it is not",
        wordCount
      );
    }

    unchecked {
      uint256 totalBits = wordCount * 11;
      uint256 checksumBits = totalBits / 33;
      uint256 entropyBits = totalBits - checksumBits;
      uint256 entropyLen = entropyBits / 8;

      uint256 concatLo;
      uint256 concatHi;
      for (uint256 i; i < wordCount; ++i) {
        uint256 idx = uint256(uint16(self.indexOfWordList(words[i])));
        uint256 offset = totalBits - _BITS_PER_WORD * (i + 1);

        if (offset + _BITS_PER_WORD <= _UINT_BITS) {
          concatLo |= idx << offset;
        } else {
          uint256 concatLoBits = _UINT_BITS - offset;
          concatLo |= (idx & ((1 << concatLoBits) - 1)) << offset;
          concatHi |= idx >> concatLoBits;
        }
      }

      // split into entropy + checksum
      uint256 entVal = (concatLo >> checksumBits) | (concatHi << (_UINT_BITS - checksumBits));
      uint256 checksum = concatLo & ((1 << checksumBits) - 1);

      // rebuild entropy as bytes
      bytes memory entropy = _unpack(entVal, entropyLen);

      // validate checksum
      bytes32 hash = _computeHash(entropy);
      uint256 firstBits = uint256(hash) >> (256 - checksumBits);
      if (firstBits != checksum) revert ChecksumMismatch();

      return entropy;
    }
  }

  /**
   * @notice Generates a mnemonic from raw entropy.
   * @dev This accepts 4–32 bytes (non-standard BIP39 range).
   * @param  self Storage reference that exposes the BIP39 word-list.
   * @param  entropy Entropy bytes (4–32 bytes, step 4).
   * @return mnemonic Array of words (length 3–24).
   */
  function _toMnemonic(
    BIP39Storage.Storage storage self,
    bytes memory entropy
  ) internal view returns (string[] memory) {
    uint256 entropyLen = entropy.length;
    if (
      entropyLen % _STEP_ENTROPY_BYTES != 0 ||
      entropyLen < _MIN_ENTROPY_BYTES ||
      entropyLen > _MAX_ENTROPY_BYTES
    ) {
      revert InvalidEntropyLength(
        "Must be a multiple of 4 between 4 and 32, but it is not",
        entropyLen
      );
    }

    unchecked {
      // Calculate Bits lengths.
      uint256 entBits = entropyLen * _BITS_PER_BYTE;
      uint256 checksumBits = entBits / _STEP_STRENGTH_BITS;
      uint256 totalBits = entBits + checksumBits;
      uint256 wordCount = totalBits / _BITS_PER_WORD;

      // Pack the entropy into a uint256 (≤ 256 bits, fits safely).
      uint256 entVal = _pack(entropy);

      // SHA-256 checksum and take the MSB (entropy_bits / 32).
      uint256 checksum = uint256(_computeHash(entropy)) >> (256 - checksumBits);

      // Concatenate entropy|checksum into one bitstring.
      uint256 concatLo = (entVal << checksumBits) | checksum; // Lower 256bits
      uint256 concatHi =
        totalBits > 256
          ? (entVal >> (256 - checksumBits)) // Upper 8bits
          : 0;

      return _indicesToWords(self, concatLo, concatHi, totalBits, wordCount);
    }
  }

  // =============================================================
  //                        PRIVATE HELPERS
  // =============================================================

  /**
   * @notice Calculate the SHA-256 checksum specified in BIP39.
   */
  function _computeHash(bytes memory x) internal pure returns (bytes32) {
    return sha256(x);
  }

  /**
   * @notice Cut 'entropyLen' bytes from the beginning of the 32-byte value and return them.
   */
  function _slice(bytes32 src, uint256 len) private pure returns (bytes memory sliced) {
    unchecked {
      sliced = new bytes(len);
      for (uint256 i = 0; i < len; ++i) sliced[i] = src[i];
    }
  }

  /**
   * @notice Pack variable-length byte sequence into uint256;
   * if less than 32 bytes, pack zeros on MSB side.
   */
  function _pack(bytes memory src) private pure returns (uint256 val) {
    assembly {
      val := mload(add(src, 32))
      let len := mload(src)
      if lt(len, 32) {
        val := shr(mul(sub(32, len), 8), val)
      }
    }
  }

  /**
   * @notice Slice the bitstring into 11-bit indices and map to words.
   */
  function _indicesToWords(
    BIP39Storage.Storage storage self,
    uint256 concatLo,
    uint256 concatHi,
    uint256 totalBits,
    uint256 wordCount
  ) private view returns (string[] memory mnemonic) {
    mnemonic = new string[](wordCount);

    unchecked {
      for (uint256 i; i < wordCount; ++i) {
        uint256 bitOffset = totalBits - _BITS_PER_WORD * (i + 1);

        uint256 idx =
          bitOffset + 11 <= 256
            ? (concatLo >> bitOffset) & _BITMASK_WORD_INDEX
            : ((concatLo >> bitOffset) | (concatHi << (256 - bitOffset))) & _BITMASK_WORD_INDEX;

        mnemonic[i] = self.wordList(uint16(idx));
      }
    }
  }

  /**
   * @notice Return uint256 to an array of the specified length in bytes,
   * with zeros on the high side.
   */
  function _unpack(uint256 val, uint256 len) private pure returns (bytes memory out) {
    out = new bytes(len);
    assembly {
      let dataPtr := add(out, 0x20)
      mstore(dataPtr, shl(mul(sub(32, len), 8), val))
    }
  }
}
