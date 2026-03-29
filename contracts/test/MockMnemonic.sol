// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import {IMnemonic} from "../interfaces/IMnemonic.sol";

contract MockMnemonic is IMnemonic {
  string[] private _words;

  constructor(string[] memory words) {
    for (uint256 i = 0; i < words.length; ++i) {
      _words.push(words[i]);
    }
  }

  function generateMnemonic(uint256, bytes32) external view returns (string[] memory) {
    string[] memory out = new string[](_words.length);
    for (uint256 i = 0; i < _words.length; ++i) {
      out[i] = _words[i];
    }
    return out;
  }
}
