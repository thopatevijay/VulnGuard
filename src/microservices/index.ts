import express from 'express';
import { ethers } from 'ethers';
import { VulnerableBank__factory } from '../../typechain-types';
import { ExploitDetectionService } from './ExploitDetectionService';

const app = express();
const port = process.env.EXPLOIT_DETECTION_PORT || 3001;

async function startService() {
  const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || 'http://localhost:8545');
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS environment variable is not set');
  }

  const vulnerableBank = VulnerableBank__factory.connect(contractAddress, provider);
  const detectionService = new ExploitDetectionService(provider, vulnerableBank);

  app.get('/health', (req, res) => {
    res.status(200).send('Exploit Detection Service is healthy');
  });

  app.post('/start-monitoring', async (req, res) => {
    await detectionService.startMonitoring();
    res.status(200).send('Monitoring started');
  });

  app.listen(port, () => {
    console.log(`Exploit Detection Service listening at http://localhost:${port}`);
  });

  // Start monitoring by default
  await detectionService.startMonitoring();
}

startService().catch((error) => {
  console.error('Failed to start Exploit Detection Service:', error);
  process.exit(1);
});