// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

interface IDonut {
  function changeController(address newController) external;
  function generateTokens(address owner, uint amount) external returns (bool);
}