// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {SSTORE2} from "../libs/SSTORE2.sol";

/// @title SSTORE2 Test Harness
/// @notice Exposes SSTORE2 library functions for unit tests.
contract SSTORE2Harness {
  address public lastPointer;

  function write(bytes calldata data) external returns (address) {
    address pointer = SSTORE2.write(data);
    lastPointer = pointer;
    return pointer;
  }

  function read(address pointer) external view returns (bytes memory) {
    return SSTORE2.read(pointer);
  }
}
