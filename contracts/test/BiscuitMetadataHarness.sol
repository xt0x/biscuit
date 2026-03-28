// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {BiscuitMetadata} from "../libs/BiscuitMetadata.sol";
import {BiscuitRenderer} from "../libs/BiscuitRenderer.sol";

contract BiscuitMetadataHarness {
  function tokenURI(
    uint256 tokenId,
    bytes calldata letters,
    bytes calldata digits,
    string[] calldata mnemonic
  ) external pure returns (string memory) {
    BiscuitRenderer.SVGParams memory params = BiscuitRenderer.SVGParams({
      letters: letters,
      digits: digits,
      mnemonic: mnemonic
    });
    return BiscuitMetadata.tokenURI(tokenId, params);
  }

  function generateSVGImage(
    bytes calldata letters,
    bytes calldata digits,
    string[] calldata mnemonic
  ) external pure returns (string memory) {
    BiscuitRenderer.SVGParams memory params = BiscuitRenderer.SVGParams({
      letters: letters,
      digits: digits,
      mnemonic: mnemonic
    });
    return BiscuitMetadata.generateSVGImage(params);
  }

  function attributes(string[] calldata values) external pure returns (bytes memory) {
    return BiscuitMetadata.attributes(values);
  }

  function trait(
    string calldata traitType,
    string calldata traitValue
  ) external pure returns (bytes memory) {
    return BiscuitMetadata.trait(traitType, traitValue);
  }
}
