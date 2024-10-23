// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

contract TokenController {

    function proxyPayment(address) external payable returns(bool){
      return false;
    }

    function onTransfer(address, address, uint) external pure returns(bool){
      return true;
    }

    function onApprove(address, address, uint) external pure returns(bool){
      return true;
    }
    
}
