import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";
import { VulnerableBank } from "../typechain-types";

describe("VulnerableBank", function () {
  let vulnerableBank: VulnerableBank;
  let owner: Signer;
  let attacker: Signer;
  let user: Signer;

  beforeEach(async function () {
    console.log("Deploying a new VulnerableBank contract...");
    [owner, attacker, user] = await ethers.getSigners();

    const VulnerableBankFactory = await ethers.getContractFactory("VulnerableBank");
    vulnerableBank = await upgrades.deployProxy(VulnerableBankFactory, [], { initializer: 'initialize' }) as unknown as VulnerableBank;
    await vulnerableBank.waitForDeployment();
    console.log("VulnerableBank deployed to:", await vulnerableBank.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const contractOwner = await vulnerableBank.owner();
      const ownerAddress = await owner.getAddress();
      console.log("Contract owner:", contractOwner);
      console.log("Expected owner:", ownerAddress);
      expect(contractOwner).to.equal(ownerAddress);
    });

    it("Should have correct initial version", async function () {
      const version = await vulnerableBank.version();
      console.log("Contract version:", version);
      expect(version).to.equal(1n);
    });
  });

  describe("Deposits and Withdrawals", function () {
    it("Should allow deposits", async function () {
      const depositAmount = ethers.parseEther("1");
      console.log("Depositing", ethers.formatEther(depositAmount), "ETH");
      await vulnerableBank.connect(user).deposit({ value: depositAmount });
      const balance = await vulnerableBank.balances(await user.getAddress());
      console.log("User balance after deposit:", ethers.formatEther(balance), "ETH");
      expect(balance).to.equal(depositAmount);
    });

    it("Should allow withdrawals", async function () {
      const depositAmount = ethers.parseEther("1");
      const withdrawAmount = ethers.parseEther("0.5");
      console.log("Depositing", ethers.formatEther(depositAmount), "ETH");
      await vulnerableBank.connect(user).deposit({ value: depositAmount });
      console.log("Withdrawing", ethers.formatEther(withdrawAmount), "ETH");
      await vulnerableBank.connect(user).withdraw(withdrawAmount);
      const balance = await vulnerableBank.balances(await user.getAddress());
      console.log("User balance after withdrawal:", ethers.formatEther(balance), "ETH");
      expect(balance).to.equal(depositAmount - withdrawAmount);
    });

    it("Should not allow withdrawals exceeding balance", async function () {
      const depositAmount = ethers.parseEther("1");
      const withdrawAmount = ethers.parseEther("2");
      console.log("Depositing", ethers.formatEther(depositAmount), "ETH");
      await vulnerableBank.connect(user).deposit({ value: depositAmount });
      console.log("Attempting to withdraw", ethers.formatEther(withdrawAmount), "ETH");
      await expect(vulnerableBank.connect(user).withdraw(withdrawAmount))
        .to.be.revertedWith("Insufficient balance");
      console.log("Withdrawal correctly reverted");
    });
  });
});