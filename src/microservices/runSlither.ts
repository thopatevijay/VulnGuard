import { spawn } from 'child_process';
import { ReportingService } from './ReportingService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function runSlitherAnalysis(contractPath?: string) {
  const reportingService = new ReportingService();
  
  try {
    console.log('Running Slither analysis...');
    const defaultContractPath = path.join(__dirname, '..', '..', 'contracts', 'VulnerableBank.sol');
    const targetContract = contractPath || defaultContractPath;
    
    console.log(`Analyzing contract: ${targetContract}`);
    
    const projectRoot = path.join(__dirname, '..', '..');
    const openZeppelinPath = path.join('node_modules', '@openzeppelin', 'contracts-upgradeable');
    
    const command = 'slither';
    const args = [
      targetContract,
      '--json',
      '-',
      '--solc-remaps',
      `@openzeppelin/contracts-upgradeable=${openZeppelinPath}`
    ];
    console.log(`Executing command: ${command} ${args.join(' ')}`);
    
    const slitherProcess = spawn(command, args, { cwd: projectRoot });

    let stdout = '';
    let stderr = '';

    slitherProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log('Slither output:', data.toString());
    });

    slitherProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error('Slither error:', data.toString());
    });

    slitherProcess.on('close', async (code) => {
      console.log(`Slither process exited with code ${code}`);

      let report;
      try {
        report = JSON.parse(stdout);
        console.log(`Slither analysis completed. Found ${report.results.detectors.length} issues.`);
      } catch (parseError) {
        console.log('Failed to parse JSON, using raw output');
        report = { raw_output: stdout, stderr: stderr };
      }

      if (code !== 0) {
        console.log(`Slither found issues (exit code ${code}). This is normal and doesn't indicate a failure.`);
        report.exit_code = code;
      }

      try {
        await reportingService.saveSlitherReport(report);
        console.log('Slither report saved to database');
      } catch (dbError) {
        console.error('Failed to save Slither report to database:', dbError);
      } finally {
        await reportingService.closeConnection();
        process.exit(0);  // Always exit with 0 to indicate successful execution of our script
      }
    });
  } catch (error) {
    console.error('Error in runSlitherAnalysis:', error);
    await reportingService.closeConnection();
    process.exit(1);
  }
}

// If script is run directly, use the first command-line argument as the contract path
if (require.main === module) {
  const contractPath = process.argv[2];
  runSlitherAnalysis(contractPath);
}

export { runSlitherAnalysis };