import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.PROVIDER_URL || !process.env.PRIVATE_KEY) {
  throw new Error("Please set PROVIDER_URL and PRIVATE_KEY in your environment.");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    ganache: {
      chainId: 1337,
      url: process.env.PROVIDER_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};

export default config;