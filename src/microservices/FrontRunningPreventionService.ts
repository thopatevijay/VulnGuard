import { ethers } from 'ethers';
import { VulnerableBank } from '../../typechain-types';
import { ExploitDetectionService } from './ExploitDetectionService';

export class FrontRunningPreventionService {
  private provider: ethers.Provider;
  private contract: VulnerableBank;
  private signer: ethers.Signer;
  private detectionService: ExploitDetectionService;
  private isContractPaused: boolean = false;
  private isPanicMode: boolean = false;
  private lastPauseAttemptTime: number = 0;
  private readonly PAUSE_COOLDOWN: number = 100; // 100 ms cooldown
  private readonly PANIC_MODE_DURATION: number = 30000; // 30 seconds
  private contractAddress: string;

  constructor(
    provider: ethers.Provider,
    contract: VulnerableBank,
    signer: ethers.Signer,
    detectionService: ExploitDetectionService
  ) {
    this.provider = provider;
    this.signer = signer;
    this.detectionService = detectionService;
    this.contractAddress = '';
    // Connect the contract to the signer
    this.contract = contract.connect(signer) as VulnerableBank;
  }

  async start() {
    console.log('Starting Front-Running Prevention Service...');
    this.contractAddress = await this.contract.getAddress();
    this.detectionService.on('potentialAttack', this.handlePotentialAttack.bind(this));
    await this.updateContractPauseStatus();
    this.monitorMempool();
  }

  private async monitorMempool() {
    this.provider.on('pending', async (txHash) => {
      try {
        const tx = await this.provider.getTransaction(txHash);
        if (tx && this.isSupiciousTransaction(tx)) {
          console.log(`Potential attack transaction detected in mempool: ${txHash}`);
          await this.flashPause(tx);
        }
      } catch (error) {
        console.error('Error monitoring mempool:', error);
      }
    });
  }

  private isSupiciousTransaction(tx: ethers.TransactionResponse): boolean {
    if (tx.to === this.contractAddress) return true;
    if (tx.value > ethers.parseEther('1')) return true;
    return false;
  }

  private async handlePotentialAttack(attackInfo: { type: string; sequence: string; latestTx: any }) {
    console.log(`Potential ${attackInfo.type} attack detected. Attempting to pause contract...`);
    await this.flashPause(attackInfo.latestTx);
  }

  private async flashPause(suspiciousTx: ethers.TransactionResponse | null) {
    const currentTime = Date.now();
    if (!this.isContractPaused && currentTime - this.lastPauseAttemptTime > this.PAUSE_COOLDOWN) {
      this.lastPauseAttemptTime = currentTime;
      this.activatePanicMode();
      await this.pauseContract(suspiciousTx);
    } else {
      console.log('Skipping pause attempt due to cooldown or contract already paused.');
    }
  }

  private activatePanicMode() {
    this.isPanicMode = true;
    console.log('Panic mode activated');
    setTimeout(() => {
      this.isPanicMode = false;
      console.log('Panic mode deactivated');
    }, this.PANIC_MODE_DURATION);
  }

  private async pauseContract(suspiciousTx: ethers.TransactionResponse | null) {
    try {
      const { maxFeePerGas, maxPriorityFeePerGas } = await this.getAggressiveGasFees(suspiciousTx);
      console.log('Attempting to pause contract...');
      console.log(`Max Fee Per Gas: ${maxFeePerGas}, Max Priority Fee Per Gas: ${maxPriorityFeePerGas}`);
      const pauseTx = await this.contract.pause({
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasLimit: 500000,
      });
      console.log(`Flash pause transaction submitted: ${pauseTx.hash}`);
      const receipt = await pauseTx.wait(1);
      if (receipt) {
        console.log(`Contract paused successfully. Block number: ${receipt.blockNumber}`);
        this.isContractPaused = true;
      } else {
        console.log('Contract pause transaction completed, but no receipt was returned. Retrying...');
        await this.retryPauseWithHigherGas(suspiciousTx);
      }
    } catch (error) {
      console.error('Failed to pause contract:', error);
      await this.retryPauseWithHigherGas(suspiciousTx);
    }
  }

  private async getAggressiveGasFees(suspiciousTx: ethers.TransactionResponse | null): Promise<{ maxFeePerGas: bigint, maxPriorityFeePerGas: bigint }> {
    const feeData = await this.provider.getFeeData();
    let maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits('100', 'gwei');
    let maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.parseUnits('2', 'gwei');
    
    if (suspiciousTx && suspiciousTx.maxFeePerGas) {
      maxFeePerGas = (suspiciousTx.maxFeePerGas * 200n) / 100n; // 200% of suspicious tx
    }

    if (this.isPanicMode) {
      maxFeePerGas *= 3n;
    }

    // Ensure maxPriorityFeePerGas is always less than maxFeePerGas
    maxPriorityFeePerGas = maxFeePerGas / 2n;

    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  private async retryPauseWithHigherGas(suspiciousTx: ethers.TransactionResponse | null) {
    try {
      const { maxFeePerGas, maxPriorityFeePerGas } = await this.getAggressiveGasFees(suspiciousTx);
      console.log('Retrying pause with higher gas...');
      console.log(`Retry Max Fee Per Gas: ${maxFeePerGas * 2n}, Retry Max Priority Fee Per Gas: ${maxPriorityFeePerGas * 2n}`);
      const pauseTx = await this.contract.pause({
        maxFeePerGas: maxFeePerGas * 2n,
        maxPriorityFeePerGas: maxPriorityFeePerGas * 2n,
        gasLimit: 600000,
      });
      console.log(`Ultra-aggressive retry pause transaction submitted: ${pauseTx.hash}`);
      const receipt = await pauseTx.wait(1);
      if (receipt) {
        console.log(`Contract paused successfully on retry. Block number: ${receipt.blockNumber}`);
        this.isContractPaused = true;
      } else {
        console.log('Contract pause retry transaction completed, but no receipt was returned.');
      }
    } catch (error) {
      console.error('Failed to pause contract on retry:', error);
    }
  }

  private async updateContractPauseStatus() {
    try {
      this.isContractPaused = await this.contract.paused();
      console.log(`Contract pause status: ${this.isContractPaused ? 'Paused' : 'Active'}`);
    } catch (error) {
      console.error('Failed to update contract pause status:', error);
    }
  }
}