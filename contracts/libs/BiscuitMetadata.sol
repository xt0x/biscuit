// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

// solhint-disable quotes
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {BiscuitRenderer} from "./BiscuitRenderer.sol";

/// @title BiscuitMetadata
library BiscuitMetadata {
  using Strings for uint256;

  /**
   * @notice Render the JSON Metadata for a given token.
   */
  function tokenURI(
    uint256 tokenId,
    BiscuitRenderer.SVGParams memory params
  ) internal pure returns (string memory) {
    string memory image = generateSVGImage(params);

    // prettier-ignore
    bytes memory dataURI = abi.encodePacked(
      '{', '"name": "Biscuit #', tokenId.toString(), '",',
        '"description": "",',
        '"image": "data:image/svg+xml;base64,', image, '",',
        '"attributes": [', attributes(params.mnemonic), ']',
      '}'
    );

    return string(abi.encodePacked("data:application/json;base64,", Base64.encode(dataURI)));
  }

  /**
   * @notice Renders base64-encoded JSON metadata for the specified token.
   */
  function generateSVGImage(
    BiscuitRenderer.SVGParams memory params
  ) internal pure returns (string memory) {
    return Base64.encode(bytes(BiscuitRenderer._generateSVG(params)));
  }

  /**
   * @notice Render the JSON attributes for a given token.
   */
  function attributes(string[] memory values) internal pure returns (bytes memory) {
    unchecked {
      // prettier-ignore
      string[24] memory traitIndexLabels = [
        "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN",
        "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", 
        "NINETEEN", "TWENTY", "TWENTY-ONE", "TWENTY-TWO", "TWENTY-THREE", "TWENTY-FOUR"
      ];
      bytes memory traits;

      for (uint256 i; i < 24; ++i) {
        string memory value = i < values.length ? values[i] : "N/A";

        traits = abi.encodePacked(traits, trait(traitIndexLabels[i], value), ",");
      }

      return abi.encodePacked(traits, trait("WORDS", uint256(values.length).toString()));
    }
  }

  /**
   * @notice Generate the JSON snippet for a single attribute.
   */
  function trait(
    string memory traitType,
    string memory traitValue
  ) internal pure returns (bytes memory) {
    // prettier-ignore
    return
      abi.encodePacked(
        "{",
          '"trait_type": "', traitType, '",',
          '"value": "', traitValue, '"',
        "}"
      );
  }
}
