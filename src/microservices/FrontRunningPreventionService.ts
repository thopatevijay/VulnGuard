import { ethers } from 'ethers';
import { VulnerableBank } from '../../typechain-types';
import { ReportingService } from './ReportingService';
import { ExploitDetectionService } from './ExploitDetectionService';

export class FrontRunningPreventionService {
  private provider: ethers.JsonRpcProvider;
  private contract: VulnerableBank;
  private contractAddress: string;
  private reportingService: ReportingService;
  private isContractPaused: boolean = false;
  private pauseTransactionHash: string | null = null;
  private lastPauseAttempt: number = 0;
  private readonly PAUSE_COOLDOWN: number = 5000; // 5 seconds cooldown

  constructor(provider: ethers.JsonRpcProvider, contract: VulnerableBank, reportingService: ReportingService, exploitDetectionService: ExploitDetectionService) {
    this.provider = provider;
    this.contract = contract;
    this.contractAddress = '';
    this.reportingService = reportingService;

    exploitDetectionService.on('potentialExploitDetected', this.handlePotentialExploit.bind(this));
  }

  private async handlePotentialExploit(exploitInfo: { type: string, sequence: string, suspiciousTransactions: any[] }) {
    console.log(`[${new Date().toISOString()}] Potential exploit detected. Attempting to pause contract...`);
    await this.attemptHighPriorityPause(exploitInfo.suspiciousTransactions[0]);
  }

  private async attemptHighPriorityPause(suspiciousTx: any) {
    const now = Date.now();
    if (now - this.lastPauseAttempt < this.PAUSE_COOLDOWN) {
      console.log(`[${new Date().toISOString()}] Pause attempt cooldown in effect. Skipping this attempt.`);
      return;
    }
    this.lastPauseAttempt = now;

    if (this.isContractPaused || this.pauseTransactionHash) {
      console.log(`[${new Date().toISOString()}] Pause already in progress or contract already paused. Skipping pause attempt.`);
      return;
    }

    console.log(`[${new Date().toISOString()}] Attempting high-priority pause...`);

    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const signer = this.provider.getSigner();
        const address = await (await signer).getAddress();

        // Check if the contract is already paused
        const isPaused = await this.contract.paused();
        if (isPaused) {
          console.log(`[${new Date().toISOString()}] Contract is already paused.`);
          this.isContractPaused = true;
          return;
        }

        const suspiciousGasPrice = await this.provider.getTransaction(suspiciousTx.hash).then(tx => tx?.gasPrice || ethers.parseUnits('100', 'gwei'));
        const pauseGasPrice = suspiciousGasPrice * BigInt(300 + attempt * 100) / BigInt(100);

        console.log(`[${new Date().toISOString()}] Attempt ${attempt + 1}: Using gas price ${ethers.formatUnits(pauseGasPrice, 'gwei')} gwei`);

        const gasLimit = 500000;

        const pauseTx = await this.contract.connect(await signer).pause({
          gasLimit: gasLimit,
          gasPrice: pauseGasPrice,
        });

        this.pauseTransactionHash = pauseTx.hash;
        console.log(`[${new Date().toISOString()}] High-priority pause transaction sent: ${pauseTx.hash}`);

        const receipt = await pauseTx.wait(1);
        console.log(`[${new Date().toISOString()}] Contract pause transaction mined in block: ${receipt?.blockNumber}`);

        // Verify the pause was successful
        const finalPauseState = await this.contract.paused();
        if (finalPauseState) {
          console.log(`[${new Date().toISOString()}] Contract pause verified successfully.`);
          this.isContractPaused = true;
          await this.reportingService.logAlert('contractPaused', `Contract paused due to potential exploit. Transaction: ${pauseTx.hash}`);
          return;
        } else {
          throw new Error('Contract pause transaction succeeded, but contract is not paused');
        }
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to pause contract (Attempt ${attempt + 1}):`, error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        this.pauseTransactionHash = null;

        if (attempt === maxAttempts - 1) {
          console.log(`[${new Date().toISOString()}] Max attempts reached. Implementing fallback mechanism.`);
          await this.reportingService.logAlert('pauseFailed', 'Failed to pause contract after multiple attempts');
        } else {
          console.log(`[${new Date().toISOString()}] Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
  }
}