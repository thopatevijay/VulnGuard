import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";
import { VulnerableBank, AttackerContract } from "../typechain-types";

describe("VulnerableBank", function () {
    let vulnerableBank: VulnerableBank;
    let attackerContract: AttackerContract;
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

    describe("Pausable Functionality", function () {
        it("Should allow owner to pause the contract", async function () {
            console.log("Attempting to pause the contract...");
            await vulnerableBank.connect(owner).pause();
            const isPaused = await vulnerableBank.paused();
            console.log("Contract paused state:", isPaused);
            expect(isPaused).to.be.true;
        });

        it("Should allow owner to unpause the contract", async function () {
            console.log("Pausing the contract...");
            await vulnerableBank.connect(owner).pause();
            console.log("Attempting to unpause the contract...");
            await vulnerableBank.connect(owner).unpause();
            const isPaused = await vulnerableBank.paused();
            console.log("Contract paused state:", isPaused);
            expect(isPaused).to.be.false;
        });

        it("Should not allow non-owner to pause the contract", async function () {
            console.log("Attempting to pause the contract from non-owner account...");
            await expect(vulnerableBank.connect(attacker).pause())
                .to.be.revertedWithCustomError(vulnerableBank, "OwnableUnauthorizedAccount");
            console.log("Pause attempt correctly reverted");
        });

        it("Should not allow deposits when paused", async function () {
            console.log("Pausing the contract...");
            await vulnerableBank.connect(owner).pause();
            console.log("Attempting to deposit while contract is paused...");
            await expect(vulnerableBank.connect(user).deposit({ value: ethers.parseEther("1") }))
                .to.be.revertedWithCustomError(vulnerableBank, "EnforcedPause");
            console.log("Deposit attempt correctly reverted");
        });

        it("Should not allow withdrawals when paused", async function () {
            console.log("Depositing 1 ETH...");
            await vulnerableBank.connect(user).deposit({ value: ethers.parseEther("1") });
            console.log("Pausing the contract...");
            await vulnerableBank.connect(owner).pause();
            console.log("Attempting to withdraw while contract is paused...");
            await expect(vulnerableBank.connect(user).withdraw(ethers.parseEther("0.5")))
                .to.be.revertedWithCustomError(vulnerableBank, "EnforcedPause");
            console.log("Withdrawal attempt correctly reverted");
        });
    });

    describe("Reentrancy Vulnerability", function () {
        beforeEach(async function () {
            // Deploy the AttackerContract
            const AttackerContractFactory = await ethers.getContractFactory("AttackerContract");
            attackerContract = await AttackerContractFactory.deploy(await vulnerableBank.getAddress()) as AttackerContract;
            await attackerContract.waitForDeployment();
            console.log("AttackerContract deployed to:", await attackerContract.getAddress());
        });

        it("Should be vulnerable to reentrancy attack", async function () {
            // add some funds to the VulnerableBank
            await vulnerableBank.connect(user).deposit({ value: ethers.parseEther("5") });
            const initialBankBalance = await ethers.provider.getBalance(await vulnerableBank.getAddress());
            console.log("VulnerableBank balance before attack:", ethers.formatEther(initialBankBalance), "ETH");

            // perform the attack
            const attackTx = await attackerContract.connect(attacker).attack({ value: ethers.parseEther("1") });
            await attackTx.wait();
            console.log("Attack transaction completed");

            // Check the balance of the AttackerContract
            const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
            console.log("AttackerContract balance after attack:", ethers.formatEther(attackerBalance), "ETH");

            // Check the balance of the VulnerableBank
            const finalBankBalance = await ethers.provider.getBalance(await vulnerableBank.getAddress());
            console.log("VulnerableBank balance after attack:", ethers.formatEther(finalBankBalance), "ETH");

            // The AttackerContract should have more than 1 ETH (the initial deposit)
            expect(attackerBalance).to.be.gt(ethers.parseEther("1"));

            // The VulnerableBank should have less ETH than it started with
            expect(finalBankBalance).to.be.lt(initialBankBalance);
        });
    });
});