// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IBiscuitBuilder} from "./interfaces/IBiscuitBuilder.sol";
import {IBiscuitFont} from "./interfaces/IBiscuitFont.sol";
import {IMnemonic} from "./interfaces/IMnemonic.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {BiscuitMetadata} from "./libs/BiscuitMetadata.sol";
import {BiscuitRenderer} from "./libs/BiscuitRenderer.sol";
import {Utils} from "./libs/Utils.sol";

/// @title BiscuitBuilder
contract BiscuitBuilder is Ownable, IBiscuitBuilder {
  /// @notice BiscuitFont contract instance
  IBiscuitFont public font;

  /// @notice Mnemonic contract instance
  IMnemonic public mnemonic;

  /// @notice Access modifier for font function
  bool public isFontLocked;

  /// @notice Access modifier for mnemonic function
  bool public isMnemonicLocked;

  /**
   * @notice Require that the seeder has not been locked.
   */
  modifier whenFontNotLocked() {
    require(!isFontLocked, "Font is locked");
    _;
  }

  /**
   * @notice Require that the seeder has not been locked.
   */
  modifier whenMnemonicNotLocked() {
    require(!isMnemonicLocked, "Mnemonic is locked");
    _;
  }

  constructor(address initialOwner, IBiscuitFont _font, IMnemonic _mnemonic) Ownable(initialOwner) {
    font = _font;
    mnemonic = _mnemonic;
  }

  /**
   * @notice Set the font.
   * @dev This function can only be called by the owner.
   */
  function setFont(IBiscuitFont _font) external onlyOwner whenFontNotLocked {
    address oldFont = address(font);
    font = _font;

    emit SetFontUpdated(oldFont, address(_font));
  }

  /**
   * @notice Lock the builder.
   * @dev This cannot be reversed and is only callable by the owner when not locked.
   */
  function lockFont() external onlyOwner whenFontNotLocked {
    require(!isFontLocked, "Already locked");
    isFontLocked = true;

    emit FontLocked();
  }

  /**
   * @notice Set the Mnemonic.
   * @dev This function can only be called by the owner.
   */
  function setMnemonic(IMnemonic _mnemonic) external onlyOwner whenMnemonicNotLocked {
    address oldMnemonic = address(mnemonic);
    mnemonic = _mnemonic;

    emit SetMnemonicUpdated(oldMnemonic, address(_mnemonic));
  }

  /**
   * @notice Lock the builder.
   * @dev This cannot be reversed and is only callable by the owner when not locked.
   */
  function lockMnemonic() external onlyOwner whenMnemonicNotLocked {
    require(!isMnemonicLocked, "Already locked");
    isMnemonicLocked = true;

    emit MnemonicLocked();
  }

  /**
   * @notice Given a token ID and seed, construct a token URI for a Biscuit token.
   * @dev The returned value may be a base64 encoded data URI or an API URL.
   */
  function tokenURI(
    uint256 tokenId,
    Seed calldata seed
  ) external view override returns (string memory) {
    return BiscuitMetadata.tokenURI(tokenId, generateSVGParams(seed));
  }

  /**
   * @notice Given a seed, construct a base64 encoded SVG image.
   */
  function generateSVGImage(Seed calldata seed) external view override returns (string memory) {
    return BiscuitMetadata.generateSVGImage(generateSVGParams(seed));
  }

  /**
   * @notice Given a seed, Get raw svg
   */
  function svg(Seed calldata seed) external view override returns (string memory) {
    return BiscuitRenderer._generateSVG(generateSVGParams(seed));
  }

  /**
   * @notice Generates parameters necessary for SVG rendering.
   */
  function generateSVGParams(
    Seed calldata seed
  ) internal view returns (BiscuitRenderer.SVGParams memory) {
    return
      BiscuitRenderer.SVGParams({
        letters: bytes(Base64.encode(font.letters())),
        digits: bytes(Base64.encode(font.digits())),
        mnemonic: mnemonic.generateMnemonic(seed.mnemonicStrength, seed.mnemonicSeed)
      });
  }

  /**
   * @notice Generate a pseudo-random seed using block data and tokenId.
   */
  function generateSeed(uint256 tokenId) external view override returns (Seed memory) {
    uint256 randomness = Utils.random(tokenId);
    uint256 strengthIndex = 8;

    return
      Seed({
        mnemonicSeed: keccak256(abi.encodePacked(randomness)),
        mnemonicStrength: (Utils.random(randomness, strengthIndex) + 1) << 5 // Must be a multiple of 32 from 32 to 256
      });
  }
}
