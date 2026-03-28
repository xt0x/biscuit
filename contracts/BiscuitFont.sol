// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SSTORE2} from "./libs/SSTORE2.sol";
import {Memory} from "./libs/Memory.sol";
import {IBiscuitFont} from "./interfaces/IBiscuitFont.sol";

/// @notice Stores font data in SSTORE2-backed pages.
contract BiscuitFont is IBiscuitFont, Ownable {
  /// @notice SSTORE2 data offset (skip STOP opcode).
  uint256 private constant _DATA_OFFSET = 1;

  /// @notice Letters trait storage.
  Trait private _letters;

  /// @notice Digits trait storage.
  Trait private _digits;

  constructor(address initialOwner) Ownable(initialOwner) {}

  /**
   * @notice Return the number of stored letters chunks.
   */
  function lettersCount() external view returns (uint256) {
    return _letters.pages.length;
  }

  /**
   * @notice Return the number of stored digits chunks.
   */
  function digitsCount() external view returns (uint256) {
    return _digits.pages.length;
  }

  /**
   * @notice Return the concatenated letters raw woff2 payload.
   */
  function letters() public view override returns (bytes memory) {
    return _concatenate(_letters);
  }

  /**
   * @notice Return the concatenated digits raw woff2 payload.
   */
  function digits() public view override returns (bytes memory) {
    return _concatenate(_digits);
  }

  /**
   * @notice Add a batch of Letters font data.
   * @dev This function can only be called by the owner.
   * Uses the “Caveat” typeface by Impallari Type for creating this letters.
   * License: https://fonts.google.com/specimen/Caveat/license
   */
  function addLetters(bytes calldata data) external override onlyOwner {
    _addPage(_letters, data);
    emit LettersPageAdded(_letters.pages.length - 1, _letters.totalBytes);
  }

  /**
   * @notice Add a batch of Digits font data.
   * @dev This function can only be called by the owner.
   * Uses the “Inter” typeface by Impallari Type for creating this letters.
   * License: https://fonts.google.com/specimen/Inter/license
   */
  function addDigits(bytes calldata data) external override onlyOwner {
    _addPage(_digits, data);
    emit DigitsPageAdded(_digits.pages.length - 1, _digits.totalBytes);
  }

  /**
   * @notice Add a batch of font data from an existing storage contract.
   * @dev This function can only be called by the owner.
   */
  function addLettersFromPointer(address pointer, uint256 len) external override onlyOwner {
    _addPointer(_letters, pointer, len);
    emit LettersPageAdded(_letters.pages.length - 1, _letters.totalBytes);
  }

  /**
   * @notice Add a batch of font data from an existing storage contract.
   * @dev This function can only be called by the owner.
   */
  function addDigitsFromPointer(address pointer, uint256 len) external override onlyOwner {
    _addPointer(_digits, pointer, len);
    emit DigitsPageAdded(_digits.pages.length - 1, _digits.totalBytes);
  }

  /**
   * @notice Write arbitrary binary data to SSTORE2 and register its pointer to Trait.
   * @dev Throws EmptyBytes error if data is empty.
   * @param trait Trait structure to write to
   * @param data byte sequence to be written
   */
  function _addPage(Trait storage trait, bytes calldata data) internal {
    if (data.length == 0) revert EmptyBytes();
    address pointer = SSTORE2.write(data);
    trait.pages.push(pointer);
    trait.totalBytes += data.length;
  }

  /**
   * @notice Register an existing SSTORE2 pointer and byte length.
   * @dev Throws ZeroPointer or BadLength on invalid inputs.
   * @param trait Trait structure to which to add
   * @param pointer Address of SSTORE2 contract
   * @param len Chunk byte length
   */
  function _addPointer(Trait storage trait, address pointer, uint256 len) internal {
    if (pointer == address(0)) revert ZeroPointer();
    uint256 codeLength = pointer.code.length;
    if (codeLength <= _DATA_OFFSET) revert BadLength();
    uint256 dataLength = codeLength - _DATA_OFFSET;
    if (len == 0 || len != dataLength) revert BadLength();
    trait.pages.push(pointer);
    trait.totalBytes += len;
  }

  /**
   * @notice Combines all chunks registered in Trait and returns them as a single bytes array.
   */
  function _concatenate(Trait storage trait) internal view returns (bytes memory out) {
    out = new bytes(trait.totalBytes);

    uint256 dst;
    assembly {
      dst := add(out, 0x20)
    }
    for (uint256 i; i < trait.pages.length; ) {
      bytes memory data = SSTORE2.read(trait.pages[i]);

      uint256 src;
      uint256 len;
      assembly {
        src := add(data, 0x20)
        len := mload(data)
      }

      Memory.copy(src, dst, len);
      dst += len;

      unchecked {
        ++i;
      }
    }
  }
}
