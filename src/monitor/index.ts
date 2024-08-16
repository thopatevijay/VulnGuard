import { ethers } from 'ethers';
import { ReentrancyDetectionService } from './ReentrancyDetectionService';
import { VulnerableBank__factory } from '../../typechain-types/factories/contracts/VulnerableBank__factory';

async function main() {
  // Connect to the Ethereum network
  const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || 'http://localhost:8545');

  // need to provide the deployed contract address
  const contractAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS environment variable is not set');
  }

  // Create a contract instance
  const vulnerableBank = VulnerableBank__factory.connect(contractAddress, provider);

  // Initialize the ReentrancyDetectionService
  const detectionService = new ReentrancyDetectionService(provider, vulnerableBank);

  // Start monitoring
  await detectionService.startMonitoring();

  console.log("Reentrancy detection service is now monitoring the mempool.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});