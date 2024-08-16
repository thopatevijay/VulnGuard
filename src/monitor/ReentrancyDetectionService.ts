import { ethers } from 'ethers';
import { VulnerableBank } from '../../typechain-types/contracts/VulnerableBank';

export class ReentrancyDetectionService {
  private provider: ethers.Provider;
  private contract: VulnerableBank;

  constructor(provider: ethers.Provider, contract: VulnerableBank) {
    this.provider = provider;
    this.contract = contract;
  }

  async startMonitoring() {
    console.log('Starting to monitor mempool for potential reentrancy attacks...');

    this.provider.on('pending', (txHash) => {
      this.checkTransaction(txHash).catch(console.error);
    });
  }

  private async checkTransaction(txHash: string) {
    const tx = await this.provider.getTransaction(txHash);
    if (!tx) return;

    // Check if the transaction is interacting with our contract
    if (tx.to?.toLowerCase() === (await this.contract.getAddress()).toLowerCase()) {
      const decodedData = this.contract.interface.parseTransaction({ data: tx.data, value: tx.value });

      // Check if the transaction is calling the withdraw function
      if (decodedData && decodedData.name === 'withdraw') {
        console.log(`Potential reentrancy attack detected in pending transaction!`);
        console.log(`Transaction Hash: ${txHash}`);
        console.log(`From: ${tx.from}`);
        console.log(`Withdrawal amount: ${ethers.formatEther(decodedData.args[0] as bigint)} ETH`);

        this.alertReentrancyAttempt(txHash, tx.from!, decodedData.args[0] as bigint);
      }
    }
  }

  private alertReentrancyAttempt(txHash: string, from: string, amount: bigint) {
    console.log('ALERT: Potential reentrancy attempt detected!');
    console.log(`Transaction Hash: ${txHash}`);
    console.log(`From: ${from}`);
    console.log(`Amount: ${ethers.formatEther(amount)} ETH`);
  }
}