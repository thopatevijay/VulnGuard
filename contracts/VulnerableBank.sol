// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract VulnerableBank is Initializable, PausableUpgradeable, OwnableUpgradeable {
    mapping(address => uint) public balances;
    uint256 public version;

    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() initializer public {
        __Pausable_init();
        __Ownable_init(msg.sender);
        version = 1;
    }

    function deposit() public payable whenNotPaused {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

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

    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getVersion() public view returns (uint256) {
        return version;
    }
}