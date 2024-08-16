import { ethers } from 'ethers';
import { ExploitDetectionService } from './ExploitDetectionService';
import { FrontRunningPreventionService } from './FrontRunningPreventionService';
import { VulnerableBank__factory } from '../../typechain-types';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Initializing Services...');
  
  const app = express();
  const port = process.env.PORT || 3001;

  try {
    const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || 'http://localhost:8545');
    console.log('Provider initialized. Attempting to connect...');
    
    const network = await provider.getNetwork();
    console.log('Connected to provider:', network.name, 'Chain ID:', network.chainId);

    const contractAddress = process.env.CONTRACT_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";
    console.log('VulnerableBank contract address:', contractAddress);

    const vulnerableBank = VulnerableBank__factory.connect(contractAddress, provider);
    console.log('VulnerableBank contract instance created');

    // Create a wallet for signing transactions
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not set in environment variables');
    }
    const signer = new ethers.Wallet(privateKey, provider);

    const detectionService = new ExploitDetectionService(provider, vulnerableBank);
    console.log('Exploit Detection Service initialized');

    const preventionService = new FrontRunningPreventionService(provider, vulnerableBank, signer, detectionService);
    console.log('Front-Running Prevention Service initialized');

    await detectionService.startMonitoring();
    await preventionService.start();

    app.get('/suspicious-sequences', (req, res) => {
      const sequences = detectionService.getSuspiciousSequences();
      res.json(sequences);
    });

    app.listen(port, () => {
      console.log(`Services listening at http://localhost:${port}`);
    });

    console.log("All services are now active.");
  } catch (error) {
    console.error('An error occurred during initialization:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});