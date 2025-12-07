import "dotenv/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1, // Optimize for smaller bytecode size (lower = smaller contract, higher gas per call)
        // runs: 1 = smallest bytecode, higher gas costs per function call
        // runs: 200 = balanced (default)
        // runs: 10000+ = optimized for gas efficiency, larger bytecode
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    mainnet: {
      url: process.env.RPC_URL || "",
      accounts: process.env.DID_BACKEND_SIGNER_PRIVATE_KEY
        ? [process.env.DID_BACKEND_SIGNER_PRIVATE_KEY]
        : [],
      chainId: 1,
      gasPrice: "auto",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DID_BACKEND_SIGNER_PRIVATE_KEY
        ? [process.env.DID_BACKEND_SIGNER_PRIVATE_KEY]
        : [],
      chainId: 11155111,
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
    },
  },
  paths: {
    sources: "./src/contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};

