// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice https://github.com/ethereum/solidity-examples/blob/master/src/unsafe/Memory.sol
library Memory {
  uint256 internal constant WORD_SIZE = 32;

  /**
   * @notice Copy `len` bytes from memory address `src` to address `dest`.
   */
  function copy(uint256 src, uint256 dest, uint256 len) internal pure {
    for (; len >= WORD_SIZE; len -= WORD_SIZE) {
      assembly {
        mstore(dest, mload(src))
      }
      dest += WORD_SIZE;
      src += WORD_SIZE;
    }

    if (len == 0) return;

    uint256 mask = 256 ** (WORD_SIZE - len) - 1;
    assembly {
      let srcpart := and(mload(src), not(mask))
      let destpart := and(mload(dest), mask)
      mstore(dest, or(destpart, srcpart))
    }
  }

  /**
   * @notice Return the data pointer and length for a bytes array.
   */
  function fromBytes(bytes memory bts) internal pure returns (uint256 addr, uint256 len) {
    len = bts.length;
    assembly {
      addr := add(bts, 32)
    }
  }
}
