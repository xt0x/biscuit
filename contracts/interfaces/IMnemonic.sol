// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IMnemonic {
  event SetWordListLocked();

  function generateMnemonic(uint256 strength, bytes32 seed) external view returns (string[] memory);
}
