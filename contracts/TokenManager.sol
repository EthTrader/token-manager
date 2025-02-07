// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

// Uncomment this line to use console.log
// import "hardhat/console.sol";
import "./IDonut.sol";
import "./TokenController.sol";

contract TokenManager is TokenController {

    event BatchMint();

    address public constant MULTISIG = 0x367b68554f9CE16A87fD0B6cE4E70d465A0C940E;
    IDonut public constant DONUT = IDonut(0xC0F9bD5Fa5698B6505F643900FFA515Ea5dF54A9);
    uint public constant BATCH_AMOUNT = 20880000e18;
    uint public constant BATCH_INTERVAL = 52 weeks;
    uint public lastBatch;
    bool public allowChangeDonutController = true;

    modifier multisig {
        require(msg.sender == MULTISIG, "NOT_MULTISIG");
        _;
    }

    function changeDonutController(address newController) public multisig {
        require(allowChangeDonutController, "NOT_ALLOWED");
        require(newController != address(0), "INVALID_NEW_CONTROLLER");
        DONUT.changeController(newController);
    }

    function disableChangeDonutController() public multisig {
        allowChangeDonutController = false;
    }

    function mintBatch() public multisig {
        require(block.timestamp > lastBatch + BATCH_INTERVAL, "TOO_SOON");
        lastBatch = block.timestamp;
        DONUT.generateTokens(MULTISIG, BATCH_AMOUNT);
        emit BatchMint();
    }

}
