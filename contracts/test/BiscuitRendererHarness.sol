// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {BiscuitRenderer} from "../libs/BiscuitRenderer.sol";

contract BiscuitRendererHarness {
  function generateSVG(
    bytes calldata letters,
    bytes calldata digits,
    string[] calldata mnemonic
  ) external pure returns (string memory) {
    BiscuitRenderer.SVGParams memory params = BiscuitRenderer.SVGParams({
      letters: letters,
      digits: digits,
      mnemonic: mnemonic
    });
    return BiscuitRenderer._generateSVG(params);
  }

  function generateArt(string[] calldata mnemonic) external pure returns (bytes memory) {
    return BiscuitRenderer._generateArt(mnemonic);
  }

  function generatePathRow() external pure returns (bytes memory) {
    return BiscuitRenderer._generatePathRow();
  }

  function generatePathColumn() external pure returns (bytes memory) {
    return BiscuitRenderer._generatePathColumn();
  }
}
