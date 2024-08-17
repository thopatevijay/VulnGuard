import { ethers } from 'ethers';
import { ExploitDetectionService } from './ExploitDetectionService';
import { FrontRunningPreventionService } from './FrontRunningPreventionService';
import { ReportingService } from './ReportingService';
import { VulnerableBank__factory } from '../../typechain-types';
import express from 'express';
import dotenv from 'dotenv';
import { runSlitherAnalysis } from './runSlither';
import path from 'path';

dotenv.config();

async function main() {
  console.log('Initializing Services...');

  const app = express();
  const port = process.env.PORT || 3001;
  const reportingService = new ReportingService();

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

    console.log('Reporting Service initialized');

    const detectionService = new ExploitDetectionService(provider, vulnerableBank, reportingService);
    console.log('Exploit Detection Service initialized');

    const preventionService = new FrontRunningPreventionService(provider, vulnerableBank, signer, detectionService, reportingService);
    console.log('Front-Running Prevention Service initialized');

    await detectionService.startMonitoring();
    // await preventionService.start();

    app.use(express.static(path.join(__dirname, '..', '..', 'public')));

    app.get('/contract-info', async (req, res) => {
      try {
        const balance = await provider.getBalance(contractAddress);
        const isPaused = await vulnerableBank.paused();
        res.json({
          balance: ethers.formatEther(balance),
          isPaused
        });
      } catch (error) {
        console.error('Error fetching contract info:', error);
        res.status(500).json({ error: 'Failed to fetch contract info' });
      }
    });

    app.get('/analytics', async (req, res) => {
      try {
        const analytics = await reportingService.getAnalytics();
        res.json(analytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
      }
    });

    app.get('/alerts', async (req, res) => {
      try {
        const alerts = await reportingService.getAlerts();
        res.json(alerts);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
      }
    });

    app.get('/suspicious-sequences', async (req, res) => {
      try {
        const sequences = await detectionService.getSuspiciousSequences();
        res.json(sequences);
      } catch (error) {
        console.error('Error fetching suspicious sequences:', error);
        res.status(500).json({ error: 'Failed to fetch suspicious sequences' });
      }
    });

    // Run Slither analysis periodically (e.g., once a day)
    setInterval(() => {
      const contractPath = path.join(__dirname, '..', '..', 'contracts', 'VulnerableBank.sol');
      runSlitherAnalysis(contractPath).catch(error => {
        console.error('Error running Slither analysis:', error);
      });
    }, 24 * 60 * 60 * 1000);

    const server = app.listen(port, () => {
      console.log(`Services listening at http://localhost:${port}`);
    });

    console.log("All services are now active.");

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM signal received. Closing HTTP server and database connection.');
      await reportingService.closeConnection();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('An error occurred during initialization:', error);
    await reportingService.closeConnection();
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error('An unexpected error occurred:', error);
  const reportingService = new ReportingService();
  await reportingService.closeConnection();
  process.exit(1);
});