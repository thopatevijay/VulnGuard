import { ethers } from 'ethers';
import { ExploitDetectionService } from './ExploitDetectionService';
import { VulnerableBank__factory } from '../../typechain-types';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Initializing Exploit Detection Service...');

  const app = express();
  const port = process.env.PORT || 3001;

  try {
    const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || 'http://localhost:8545');
    console.log('Provider initialized. Attempting to connect...');

    const network = await provider.getNetwork();
    console.log('Connected to provider:', network.name, 'Chain ID:', network.chainId);

    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      console.error('VulnerableBank contract address not found');
      return;
    }
    console.log('VulnerableBank contract address:', contractAddress);


    const vulnerableBank = VulnerableBank__factory.connect(contractAddress, provider);
    console.log('VulnerableBank contract instance created');

    const detectionService = new ExploitDetectionService(provider, vulnerableBank);
    console.log('Exploit Detection Service initialized');

    await detectionService.startMonitoring();

    app.get('/suspicious-sequences', (req, res) => {
      const sequences = detectionService.getSuspiciousSequences();
      res.json(sequences);
    });

    app.listen(port, () => {
      console.log(`Exploit Detection Service listening at http://localhost:${port}`);
    });

    console.log("Exploit detection service is now active.");
  } catch (error) {
    console.error('An error occurred during initialization:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});