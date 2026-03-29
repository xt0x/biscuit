// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

library Utils {
  /**
   * @notice Generate a pseudo-random seed using block data and tokenId.
   * @dev Predictable on-chain randomness. Do not use for fairness-critical use cases.
   */
  function random(uint256 tokenId) internal view returns (uint256) {
    return
      uint256(
        keccak256(abi.encodePacked(tokenId, block.prevrandao, block.timestamp, block.number))
      );
  }

  /**
   * @notice Generates a pseudo-random number between 0 and '_max'
   * from an arbitrary input value.
   */
  function random(uint256 input, uint256 _max) internal pure returns (uint256) {
    require(_max > 0, "Max must be > 0");
    return uint256(keccak256(abi.encodePacked(input))) % _max;
  }
}
