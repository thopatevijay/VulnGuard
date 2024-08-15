import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Signer } from "ethers";
import { VulnerableBank, SecureBank, AttackerContract } from "../typechain-types";

describe("Bank Contract Upgrade", function () {
    let vulnerableBank: VulnerableBank;
    let secureBank: SecureBank;
    let attackerContract: AttackerContract;
    let owner: Signer;
    let attacker: Signer;
    let user: Signer;

    beforeEach(async function () {
        console.log("\n--- Test Setup ---");
        [owner, attacker, user] = await ethers.getSigners();
        console.log("Signers initialized");

        // Deploy VulnerableBank
        const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
        vulnerableBank = await upgrades.deployProxy(VulnerableBank, [], { initializer: 'initialize' }) as unknown as VulnerableBank;
        await vulnerableBank.waitForDeployment();
        console.log("VulnerableBank deployed to:", await vulnerableBank.getAddress());

        // Deploy AttackerContract
        const AttackerContract = await ethers.getContractFactory("AttackerContract");
        attackerContract = await AttackerContract.deploy(await vulnerableBank.getAddress()) as AttackerContract;
        await attackerContract.waitForDeployment();
        console.log("AttackerContract deployed to:", await attackerContract.getAddress());
    });

    it("Should be vulnerable to reentrancy before upgrade", async function () {
        console.log("\n--- Testing Reentrancy Vulnerability (Pre-Upgrade) ---");

        console.log("Depositing 5 ETH to VulnerableBank...");
        await vulnerableBank.connect(user).deposit({ value: ethers.parseEther("5") });

        const initialBankBalance = await ethers.provider.getBalance(await vulnerableBank.getAddress());
        console.log("Initial VulnerableBank balance:", ethers.formatEther(initialBankBalance), "ETH");

        console.log("Executing attack...");
        await attackerContract.connect(attacker).attack({ value: ethers.parseEther("1") });

        const finalBankBalance = await ethers.provider.getBalance(await vulnerableBank.getAddress());
        const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());

        console.log("Final VulnerableBank balance:", ethers.formatEther(finalBankBalance), "ETH");
        console.log("AttackerContract balance:", ethers.formatEther(attackerBalance), "ETH");

        expect(attackerBalance).to.be.gt(ethers.parseEther("1"), "Attacker should have gained extra ETH");
        expect(finalBankBalance).to.be.lt(initialBankBalance, "Bank balance should have decreased");
    });

    it("Should upgrade to SecureBank and fix vulnerability", async function () {
        console.log("\n--- Upgrading to SecureBank ---");

        const SecureBank = await ethers.getContractFactory("SecureBank");
        console.log("Upgrading contract...");
        secureBank = await upgrades.upgradeProxy(await vulnerableBank.getAddress(), SecureBank) as unknown as SecureBank;
        console.log("Upgrade complete. SecureBank address:", await secureBank.getAddress());

        console.log("Reinitializing to update version...");
        await secureBank.reinitialize();

        const newVersion = await secureBank.version();
        console.log("New contract version:", newVersion.toString());
        expect(newVersion).to.equal(2n, "Version should be updated to 2");

        console.log("\n--- Testing Reentrancy Protection (Post-Upgrade) ---");

        console.log("Depositing 5 ETH to SecureBank...");
        await secureBank.connect(user).deposit({ value: ethers.parseEther("5") });

        const initialBankBalance = await ethers.provider.getBalance(await secureBank.getAddress());
        console.log("Initial SecureBank balance:", ethers.formatEther(initialBankBalance), "ETH");

        console.log("Attempting attack...");
        await expect(
            attackerContract.connect(attacker).attack({ value: ethers.parseEther("1") })
        ).to.be.reverted;
        console.log("Attack reverted as expected");

        const finalBankBalance = await ethers.provider.getBalance(await secureBank.getAddress());
        console.log("Final SecureBank balance:", ethers.formatEther(finalBankBalance), "ETH");

        expect(finalBankBalance).to.equal(initialBankBalance, "Bank balance should remain unchanged");
    });

    it("Should only allow VulnerableBank owner to upgrade", async function () {
        console.log("\n--- Testing Upgrade Access Control ---");

        const SecureBank = await ethers.getContractFactory("SecureBank");

        console.log("Attempting upgrade from non-owner account...");
        await expect(
            upgrades.upgradeProxy(await vulnerableBank.getAddress(), SecureBank.connect(attacker))
        ).to.be.reverted;
        console.log("Upgrade correctly reverted for non-owner");

        console.log("Attempting upgrade from owner account...");
        const upgradeTx = await upgrades.upgradeProxy(await vulnerableBank.getAddress(), SecureBank.connect(owner));
        await upgradeTx.waitForDeployment();
        console.log("Upgrade successful for owner");

        secureBank = await ethers.getContractAt("SecureBank", await vulnerableBank.getAddress()) as SecureBank;

        console.log("Verifying upgrade...");
        expect(await secureBank.version()).to.equal(1n);

        console.log("Calling reinitialize...");
        await secureBank.connect(owner).reinitialize();
        expect(await secureBank.version()).to.equal(2n);
        console.log("Reinitialization successful");
    });

    it("Should maintain state (balances) after upgrade", async function () {
        console.log("\n--- Testing State Preservation During Upgrade ---");

        console.log("Depositing 2 ETH to VulnerableBank...");
        await vulnerableBank.connect(user).deposit({ value: ethers.parseEther("2") });

        const balanceBeforeUpgrade = await vulnerableBank.balances(await user.getAddress());
        console.log("User balance before upgrade:", ethers.formatEther(balanceBeforeUpgrade), "ETH");

        console.log("Upgrading to SecureBank...");
        const SecureBank = await ethers.getContractFactory("SecureBank");
        secureBank = await upgrades.upgradeProxy(await vulnerableBank.getAddress(), SecureBank) as unknown as SecureBank;
        console.log("Upgrade complete");

        const balanceAfterUpgrade = await secureBank.balances(await user.getAddress());
        console.log("User balance after upgrade:", ethers.formatEther(balanceAfterUpgrade), "ETH");

        expect(balanceAfterUpgrade).to.equal(balanceBeforeUpgrade, "Balance should be maintained after upgrade");
    });

    it("Should allow withdrawals after upgrade", async function () {
        console.log("\n--- Testing Withdrawal Functionality After Upgrade ---");

        console.log("Depositing 2 ETH to VulnerableBank...");
        await vulnerableBank.connect(user).deposit({ value: ethers.parseEther("2") });

        console.log("Upgrading to SecureBank...");
        const SecureBank = await ethers.getContractFactory("SecureBank");
        secureBank = await upgrades.upgradeProxy(await vulnerableBank.getAddress(), SecureBank) as unknown as SecureBank;
        console.log("Upgrade complete");

        const balanceBeforeWithdrawal = await secureBank.balances(await user.getAddress());
        console.log("User balance before withdrawal:", ethers.formatEther(balanceBeforeWithdrawal), "ETH");

        console.log("Withdrawing 1 ETH...");
        await secureBank.connect(user).withdraw(ethers.parseEther("1"));

        const balanceAfterWithdrawal = await secureBank.balances(await user.getAddress());
        console.log("User balance after withdrawal:", ethers.formatEther(balanceAfterWithdrawal), "ETH");

        expect(balanceAfterWithdrawal).to.equal(ethers.parseEther("1"), "Balance should be 1 ETH after withdrawal");
    });
});