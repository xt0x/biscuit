// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBiscuitBuilder} from "./interfaces/IBiscuitBuilder.sol";
import {IBiscuitToken} from "./interfaces/IBiscuitToken.sol";
import {ERC721A} from "erc721a/contracts/ERC721A.sol";

/// @title BiscuitToken
contract BiscuitToken is IBiscuitToken, ERC721A, Ownable, ReentrancyGuard, ERC2981 {
  /// @notice BiscuitBuilder contract instance
  IBiscuitBuilder public builder;

  /// @notice Max supply
  uint256 public constant MAX_SUPPLY = 256;

  /// @notice Mint price
  uint256 public constant PRICE = 0.01 ether;

  /// @notice Access modifier for mint function
  bool public isMintActive;

  /// @notice Access modifier for burn function
  bool public isBurnActive;

  /// @notice Access modifier for builder function
  bool public isBuilderLocked;

  /// @notice Mapping of tokenId to seed
  mapping(uint256 => IBiscuitBuilder.Seed) public seeds;

  /**
   * @notice Require that the seeder has not been locked.
   */
  modifier whenBuilderNotLocked() {
    require(!isBuilderLocked, "Builder is locked");
    _;
  }

  constructor(
    address initialOwner,
    address receiver,
    uint96 feeNumerator,
    IBiscuitBuilder _builder
  ) ERC721A("Biscuit", "BISCUIT") Ownable(initialOwner) {
    _setDefaultRoyalty(receiver, feeNumerator);
    builder = _builder;
  }

  /**
   * @notice Set the builder.
   * @dev This function can only be called by the owner.
   */
  function setBuilder(IBiscuitBuilder _builder) external onlyOwner whenBuilderNotLocked {
    address oldBuilder = address(builder);
    builder = _builder;

    emit BuilderUpdated(oldBuilder, address(_builder));
  }

  /**
   * @notice Lock the builder.
   * @dev This cannot be reversed and is only callable by the owner when not locked.
   */
  function lockBuilder() external onlyOwner whenBuilderNotLocked {
    isBuilderLocked = true;

    emit BuilderLocked();
  }

  /**
   * @notice Securely mint the specified quantity of tokens.
   * @dev To counter reentry attacks, use ReentrancyGuard to protect
   * against malicious duplicate calls.
   * @param quantity The number of tokens to mint.
   */
  function safeMint(uint256 quantity) external payable nonReentrant {
    require(isMintActive, "Biscuit Mint Not Active");
    require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds token supply");
    require(PRICE * quantity == msg.value, "Insufficient ETH");

    uint256 startId = _nextTokenId();
    for (uint256 i = 0; i < quantity; ++i) {
      seeds[startId + i] = builder.generateSeed(startId + i);
    }

    _safeMint(msg.sender, quantity);
  }

  /**
   * @notice Mint active status updated.
   * @dev This function can only be called by the owner.
   */
  function setMintActive(bool _val) external onlyOwner {
    isMintActive = _val;
  }

  /**
   * @notice Burn active status updated.
   * @dev This function can only be called by the owner.
   */
  function setBurnActive(bool _val) external onlyOwner {
    isBurnActive = _val;
  }

  /**
   * @notice Burn a token.
   */
  function burn(uint256 tokenId) external {
    require(isBurnActive, "Burning is not active");
    _burn(tokenId, true);

    emit BiscuitBurned(tokenId);
  }

  /**
   * @notice Return the token URI metadata for a given token.
   */
  function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "URI query for nonexistent token");
    return builder.tokenURI(tokenId, seeds[tokenId]);
  }

  /**
   * @notice Render the base64-encoded SVG image for the specified token.
   */
  function generateSVGImage(uint256 tokenId) public view returns (string memory) {
    require(_exists(tokenId), "URI query for nonexistent token");
    return builder.generateSVGImage(seeds[tokenId]);
  }

  /**
   * @notice Render the SVG for a given token.
   */
  function svg(uint256 tokenId) public view returns (string memory) {
    require(_exists(tokenId), "URI query for nonexistent token");
    return builder.svg(seeds[tokenId]);
  }

  /**
   * @notice Reset default royalties.
   * @dev This function can only be called by the owner.
   * @param receiver New royalty recipient address.
   * @param feeNumerator feeNumerator Percentage of royalties (n/10000).
   */
  function setDefaultRoyalty(address receiver, uint96 feeNumerator) public onlyOwner {
    require(feeNumerator <= 1000, "Royalty too high");
    _setDefaultRoyalty(receiver, feeNumerator);

    emit DefaultRoyaltySet(receiver, feeNumerator);
  }

  /**
   * @notice Interface support determination.
   */
  function supportsInterface(
    bytes4 interfaceId
  ) public view virtual override(ERC721A, ERC2981) returns (bool) {
    return ERC721A.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
  }

  /**
   * @notice Withdraw ether from the contract.
   * @dev This function can only be called by the owner.
   */
  function withdraw() external onlyOwner nonReentrant {
    uint256 balance = address(this).balance;
    require(balance > 0, "No ether left to withdraw");
    // send ETH to msg.sender
    (bool success, ) = (msg.sender).call{value: balance}("");
    require(success, "Transfer failed.");
  }
}
