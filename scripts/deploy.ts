import { ethers, upgrades } from "hardhat";

async function main() {
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  console.log("Deploying VulnerableBank...");
  const vulnerableBank = await upgrades.deployProxy(VulnerableBank, [], { initializer: 'initialize' });
  await vulnerableBank.deployed();
  console.log("VulnerableBank deployed to:", vulnerableBank.address);

  const version = await vulnerableBank.version();
  console.log("Contract version:", version);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});