// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title VulnerableBank
/// @dev This contract contains a known reentrancy vulnerability in the withdraw function
/// @custom:security-contact
contract VulnerableBank is Initializable, PausableUpgradeable, OwnableUpgradeable {
    mapping(address => uint) public balances;
    uint256 public version;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract setting the deployer as the initial owner
    /// @dev Sets up Pausable and Ownable functionalities and sets the initial version
    function initialize() initializer public {
        __Pausable_init();
        __Ownable_init(msg.sender);
        version = 1;
    }

    /// @notice Allows users to deposit Ether into their account
    /// @dev Increases the user's balance and emits a Deposit event
    function deposit() public payable whenNotPaused {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Allows users to withdraw Ether from their account
    /// @dev This function is vulnerable to reentrancy attacks
    /// @param _amount The amount of Ether to withdraw
    function withdraw(uint _amount) public whenNotPaused {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        // Vulnerable: Send Ether before updating the balance
        (bool sent, ) = msg.sender.call{value: _amount}("");
        require(sent, "Failed to send Ether");
        
        // Update the balance after the transfer, allowing underflow
        unchecked {
            balances[msg.sender] -= _amount;
        }
        
        emit Withdrawal(msg.sender, _amount);
    }

    /// @notice Returns the total balance of the contract
    /// @return The total Ether balance held by the contract
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    /// @notice Pauses the contract
    /// @dev Can only be called by the contract owner
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpauses the contract
    /// @dev Can only be called by the contract owner
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Returns the current version of the contract
    /// @return The version number
    function getVersion() public view returns (uint256) {
        return version;
    }
}