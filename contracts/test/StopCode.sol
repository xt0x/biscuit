// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title STOP Code Contract
/// @notice Deploys with a 1-byte runtime (0x00).
contract StopCode {
  constructor() {
    assembly {
      mstore(0x00, 0x00)
      return(0x00, 0x01)
    }
  }
}
