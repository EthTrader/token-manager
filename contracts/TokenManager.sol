// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./IDonut.sol";
import "./TokenController.sol";

contract TokenManager is TokenController {
    address public constant MULTISIG = 0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E;
    IDonut public constant DONUT = IDonut(0xC0F9bD5Fa5698B6505F643900FFA515Ea5dF54A9);
    uint public constant BATCH_AMOUNT = 7000000e18;
    uint public constant BATCH_INTERVAL = 52 weeks;
    uint public lastBatch;

    modifier multisig {
        require(msg.sender == MULTISIG, "NOT_MULTISIG");
        _;
    }

    function changeDonutController(address newController) public multisig {
        DONUT.changeController(newController);
    }

    function mintBatch() public multisig {
        require(block.timestamp > lastBatch + BATCH_INTERVAL, "TOO_SOON");
        lastBatch = block.timestamp;
        DONUT.generateTokens(MULTISIG, BATCH_AMOUNT);
    }

}
