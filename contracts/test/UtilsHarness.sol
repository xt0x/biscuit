// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Utils} from "../libs/Utils.sol";

contract UtilsHarness {
  function randomToken(uint256 tokenId) external view returns (uint256) {
    return Utils.random(tokenId);
  }

  function randomMax(uint256 input, uint256 max) external pure returns (uint256) {
    return Utils.random(input, max);
  }
}
