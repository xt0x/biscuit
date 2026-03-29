// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

interface IBiscuitBuilder {
  struct Seed {
    bytes32 mnemonicSeed;
    uint256 mnemonicStrength;
  }

  event SetFontUpdated(address, address);

  event FontLocked();

  event SetMnemonicUpdated(address, address);

  event MnemonicLocked();

  event BIP39Updated(address, address);

  function tokenURI(uint256 tokenId, Seed memory seed) external view returns (string memory);

  function generateSVGImage(Seed memory seed) external view returns (string memory);

  function svg(Seed memory seed) external view returns (string memory);

  function generateSeed(uint256 tokenId) external view returns (Seed memory);
}
