import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { Contract, Signer } from "ethers";

describe("VulnerableBank", function () {
  let vulnerableBank: Contract;
  let owner: Signer;
  let attacker: Signer;
  let user: Signer;

  beforeEach(async function () {
    [owner, attacker, user] = await ethers.getSigners();

    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    vulnerableBank = await upgrades.deployProxy(VulnerableBank, [], { initializer: 'initialize' });
    await vulnerableBank.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await vulnerableBank.owner()).to.equal(await owner.getAddress());
    });

    it("Should have correct initial version", async function () {
      expect(await vulnerableBank.version()).to.equal(1);
    });
  });
});