// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

interface IBiscuitFont {
  struct Trait {
    address[] pages;
    uint256 totalBytes;
  }

  function lettersCount() external view returns (uint256);

  function digitsCount() external view returns (uint256);

  function letters() external view returns (bytes memory);

  function digits() external view returns (bytes memory);

  function addLetters(bytes calldata data) external;

  function addDigits(bytes calldata data) external;

  /**
   * @notice Register letters data from an existing SSTORE2 storage contract.
   * @dev The provided length must match the stored byte length.
   */
  function addLettersFromPointer(address pointer, uint256 len) external;

  /**
   * @notice Register digits data from an existing SSTORE2 storage contract.
   * @dev The provided length must match the stored byte length.
   */
  function addDigitsFromPointer(address pointer, uint256 len) external;

  event LettersPageAdded(uint256 indexed pageIndex, uint256 totalBytes);

  event DigitsPageAdded(uint256 indexed pageIndex, uint256 totalBytes);

  error EmptyBytes();

  error ZeroPointer();

  error BadLength();
}
