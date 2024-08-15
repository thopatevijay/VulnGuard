import { ethers } from "hardhat";

async function main() {
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
   // Use the address from current deployment
  const vulnerableBank = await VulnerableBank.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");

  const [signer] = await ethers.getSigners();

  console.log("Performing normal Deposit & Withdraw operations...");

  // Deposit
  const depositAmount = ethers.utils.parseEther("1"); // 1 ETH
  await vulnerableBank.connect(signer).deposit({ value: depositAmount });
  console.log(`Deposited ${ethers.utils.formatEther(depositAmount)} ETH`);

  // Check balance
  let balance = await vulnerableBank.getBalance();
  console.log(`Balance after deposit: ${ethers.utils.formatEther(balance)} ETH`);

  // Withdraw
  const withdrawAmount = ethers.utils.parseEther("0.5"); // 0.5 ETH
  await vulnerableBank.connect(signer).withdraw(withdrawAmount);
  console.log(`Withdrawn ${ethers.utils.formatEther(withdrawAmount)} ETH`);

  // Check balance again
  balance = await vulnerableBank.getBalance();
  console.log(`Balance after withdrawal: ${ethers.utils.formatEther(balance)} ETH`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});