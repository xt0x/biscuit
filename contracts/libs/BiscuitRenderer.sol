// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// solhint-disable quotes
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title BiscuitRenderer
library BiscuitRenderer {
  using Strings for uint256;

  /// @notice Number of grid columns
  uint256 private constant _COLS = 4;

  /// @notice Number of rows in grid
  uint256 private constant _ROWS = 6;

  /// @notice Horizontal offset when duplicating columns
  uint256 private constant _STEP_X = 103;

  /// @notice Vertical offset when duplicating rows
  uint256 private constant _STEP_Y = 24;

  /// @notice Offset in X direction from index number to start drawing word
  uint256 private constant _LETTERS_START_OFFSET_X = 10;

  struct SVGParams {
    bytes letters; // Caveat Font (base64)
    bytes digits; // Inter Font (base64)
    string[] mnemonic; // Mnemonic of 24 words or less
  }

  /**
   * @notice Generate the complete SVG code for the given params.
   */
  function _generateSVG(SVGParams memory params) internal pure returns (string memory) {
    return
      string(
        // prettier-ignore
        abi.encodePacked(
          '<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style="width:100%;background:#fff;">',
            '<defs>',
              '<style>',
                '@font-face{',
                  'font-display: swap;',
                  'font-family: \'Caveat\';',
                  'font-style: normal;',
                  'font-weight: 700;',
                  'src: url(\'data:font/woff2; charset=utf-8; base64,', params.letters, ') format(\'woff2\');',
                '}',
                '@font-face{',
                  'font-display: swap;',
                  'font-family: \'Inter\';',
                  'font-style: italic;',
                  'font-weight: 700;',
                  'src: url(\'data:font/woff2; charset=utf-8; base64,', params.digits, ') format(\'woff2\');',
                '}',
                '.index {',
                  'font-family: "Inter";',
                  'font-size: 6px;',
                '}',
                '.mnemonic {',
                  'font-family: "Caveat";',
                  'font-size: 18px;',
                '}',
              '</style>',
              '<path id="path" d="M0 0 83 0" stroke="#000" stroke-width="0.5"/>',
              _generatePathRow(),
            '</defs>',
            '<rect width="512" height="512" fill="#fff"/>',
            '<g transform="translate(60, 204)">',
              _generatePathColumn(),
              _generateArt(params.mnemonic),
            '</g>',
          '</svg>'
        )
      );
  }

  /**
   * @notice Index and mnemonic in place.
   */
  function _generateArt(string[] memory data) internal pure returns (bytes memory) {
    unchecked {
      bytes memory out;
      uint256 dataLength = data.length;

      for (uint256 i; i < _COLS; ++i) {
        for (uint256 j; j < _ROWS; ++j) {
          uint256 idx = i * _ROWS + j;
          // prettier-ignore
          out = abi.encodePacked(
            out,
            '<text class="index" ', 'x="', (i * _STEP_X).toString(), '" y="', (j * _STEP_Y).toString(), '">',
              (idx + 1).toString(),
            ". </text>",
            '<text class="mnemonic" x="', (i * _STEP_X + _LETTERS_START_OFFSET_X).toString(), '" y="', (j * _STEP_Y).toString(), '">',
              idx < dataLength ? data[idx] : "",
            "</text>"
          );
        }
      }
      return out;
    }
  }

  /**
   * @notice Generate the SVG code for a single underline row.
   */
  function _generatePathRow() internal pure returns (bytes memory) {
    unchecked {
      bytes memory rowPaths;
      for (uint256 i; i < _COLS; ++i) {
        // prettier-ignore
        rowPaths = abi.encodePacked(
          rowPaths,
          '<use href="#path" x="', (i * _STEP_X).toString(), '" y="0"/>'
        );
      }
      return abi.encodePacked('<g id="row">', rowPaths, "</g>");
    }
  }

  /**
   * @notice Generate the SVG code for the entire 4x6 underline.
   */
  function _generatePathColumn() internal pure returns (bytes memory) {
    unchecked {
      bytes memory colPaths;
      for (uint256 i; i < _ROWS; ++i) {
        // prettier-ignore
        colPaths = abi.encodePacked(
          colPaths,
          '<use href="#row" y="', (i * _STEP_Y).toString(), '"/>'
        );
      }
      return abi.encodePacked('<g id="grid" x="196" y="160">', colPaths, "</g>");
    }
  }
}
