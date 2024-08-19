import { ethers } from 'ethers';
import { ExploitDetectionService } from './ExploitDetectionService';
import { FrontRunningPreventionService } from './FrontRunningPreventionService';
import { ReportingService } from './ReportingService';
import { VulnerableBank__factory } from '../../typechain-types';
import express from 'express';
import dotenv from 'dotenv';
import { runSlitherAnalysis } from './runSlither';
import path from 'path';
import kleur from 'kleur';

dotenv.config();

async function main() {
  console.log(kleur.blue().bold('Initializing Services...'));

  const app = express();
  const port = process.env.PORT || 3001;
  const reportingService = new ReportingService();

  try {
    const provider = new ethers.JsonRpcProvider(process.env.PROVIDER_URL || 'http://localhost:8545');
    console.log(kleur.blue('Provider initialized. Attempting to connect...'));

    const network = await provider.getNetwork();
    console.log(kleur.green(`Connected to provider: ${network.name}, Chain ID: ${network.chainId}`));

    const contractAddress = process.env.CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error('Contract address not found');
    }
    console.log(kleur.blue(`VulnerableBank contract address: ${contractAddress}`));

    const vulnerableBank = VulnerableBank__factory.connect(contractAddress, provider);
    console.log(kleur.green('VulnerableBank contract instance created'));

    // Create a wallet for signing transactions
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not set in environment variables');
    }
    const signer = new ethers.Wallet(privateKey, provider);

    console.log(kleur.green('Reporting Service initialized'));

    const exploitDetectionService = new ExploitDetectionService(provider, vulnerableBank, reportingService);
    console.log(kleur.green('Exploit Detection Service initialized'));

    new FrontRunningPreventionService(provider, vulnerableBank, reportingService, exploitDetectionService);
    console.log(kleur.green('Front-Running Prevention Service initialized'));

    await exploitDetectionService.startMonitoring();

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
        const sequences = await exploitDetectionService.getSuspiciousSequences();
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
        console.error(kleur.red('Error running Slither analysis:'), error);
      });
    }, 24 * 60 * 60 * 1000);

    const server = app.listen(port, () => {
      console.log(kleur.green().bold(`Services listening at http://localhost:${port}`));
    });

    console.log(kleur.green().bold("All services are now active."));

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      console.log(kleur.yellow('SIGTERM signal received. Closing HTTP server and database connection.'));
      await reportingService.closeConnection();
      server.close(() => {
        console.log(kleur.yellow('HTTP server closed.'));
        process.exit(0);
      });
    });

  } catch (error) {
    console.error(kleur.red('An error occurred during initialization:'), error);
    await reportingService.closeConnection();
    process.exit(1);
  }
}

main().catch(async (error) => {
  console.error(kleur.red('An unexpected error occurred:'), error);
  const reportingService = new ReportingService();
  await reportingService.closeConnection();
  process.exit(1);
});