// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IBiscuitToken {
  event BuilderUpdated(address, address builder);

  event BuilderLocked();

  event BiscuitBurned(uint256);

  event DefaultRoyaltySet(address, uint96);
}
