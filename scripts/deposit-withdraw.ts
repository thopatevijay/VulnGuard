import { ethers } from "hardhat";
import { VulnerableBank } from "../typechain-types/contracts/VulnerableBank";
import { VulnerableBank__factory } from "../typechain-types/factories/contracts/VulnerableBank__factory";
import dotenv from 'dotenv';

dotenv.config();

async function main() {

    const vulnerableBankAddress = process.env.CONTRACT_ADDRESS;
    if (!vulnerableBankAddress) {
        console.error('VulnerableBank contract address not found');
        return;
    }
    console.log("VulnerableBank address:", vulnerableBankAddress);
    const vulnerableBank: VulnerableBank = VulnerableBank__factory.connect(vulnerableBankAddress, ethers.provider);
    console.log("VulnerableBank contract instance created");

    // Get a signer to perform transactions
    const [user] = await ethers.getSigners();
    console.log("Using signer address:", await user.getAddress());

    // Check initial balances
    const initialUserBalance = await ethers.provider.getBalance(user.address);
    const initialBankBalance = await ethers.provider.getBalance(vulnerableBankAddress);
    console.log("Initial user balance:", ethers.formatEther(initialUserBalance), "ETH");
    console.log("Initial bank balance:", ethers.formatEther(initialBankBalance), "ETH");

    // Perform deposit
    const depositAmount = ethers.parseEther("2");
    console.log("Depositing", ethers.formatEther(depositAmount), "ETH");
    const depositTx = await vulnerableBank.connect(user).deposit({ value: depositAmount });
    await depositTx.wait();
    console.log("Deposit transaction sent:", depositTx.hash);

    // Check balances after deposit
    const userBalanceAfterDeposit = await ethers.provider.getBalance(user.address);
    const bankBalanceAfterDeposit = await ethers.provider.getBalance(vulnerableBankAddress);
    console.log("User balance after deposit:", ethers.formatEther(userBalanceAfterDeposit), "ETH");
    console.log("Bank balance after deposit:", ethers.formatEther(bankBalanceAfterDeposit), "ETH");

    // Perform withdrawal
    // const withdrawAmount = ethers.parseEther("1");
    // console.log("Withdrawing", ethers.formatEther(withdrawAmount), "ETH");
    // const withdrawTx = await vulnerableBank.connect(user).withdraw(withdrawAmount);
    // await withdrawTx.wait();
    // console.log("Withdraw transaction sent:", withdrawTx.hash);

    // Check final balances
    const finalUserBalance = await ethers.provider.getBalance(user.address);
    const finalBankBalance = await ethers.provider.getBalance(vulnerableBankAddress);
    console.log("Final user balance:", ethers.formatEther(finalUserBalance), "ETH");
    console.log("Final bank balance:", ethers.formatEther(finalBankBalance), "ETH");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});