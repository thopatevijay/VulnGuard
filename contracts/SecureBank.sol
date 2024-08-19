// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/// @title SecureBank - An upgradeable and secure bank contract
/// @notice This contract implements a secure version of the bank with protection against reentrancy attacks
/// @dev This contract uses OpenZeppelin's upgradeable contracts
/// @custom:security-contact
contract SecureBank is Initializable, PausableUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    mapping(address => uint) public balances;
    uint256 public version;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    /// @notice Prevents the implementation contract from being initialized
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract setting the deployer as the initial owner
    /// @dev Sets up Pausable, Ownable, and ReentrancyGuard functionalities and sets the initial version
    function initialize() initializer public {
        __Pausable_init();
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        version = 1;
    }

    /// @notice Reinitializes the contract to update its version
    /// @dev Can only be called by the owner and only once to upgrade to version 2
    function reinitialize() public reinitializer(2) onlyOwner {
        version = 2;
    }

    /// @notice Allows users to deposit Ether into their account
    /// @dev Increases the user's balance and emits a Deposit event
    function deposit() public payable whenNotPaused {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Allows users to withdraw Ether from their account
    /// @dev Implements checks-effects-interactions pattern and uses ReentrancyGuard for additional security
    /// @param _amount The amount of Ether to withdraw
    function withdraw(uint _amount) public nonReentrant whenNotPaused {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        balances[msg.sender] -= _amount;
        
        (bool sent, ) = msg.sender.call{value: _amount}("");
        require(sent, "Failed to send Ether");
        
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