// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract SecureBank is Initializable, PausableUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
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
        __ReentrancyGuard_init();
        version = 1;
    }

    function reinitialize() public reinitializer(2) {
        version = 2;
    }

    function deposit() public payable whenNotPaused {
        balances[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint _amount) public nonReentrant whenNotPaused {
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        
        balances[msg.sender] -= _amount;
        
        (bool sent, ) = msg.sender.call{value: _amount}("");
        require(sent, "Failed to send Ether");
        
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