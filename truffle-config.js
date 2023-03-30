const HDWalletProvider = require('@truffle/hdwallet-provider');
require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*",
      gas: 8000000,
      gasPrice: 20000000000
    },
    
    ganache: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*",
      gas: 8000000,
      gasPrice: 20000000000
    },
    
    ropsten: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        0,
        10
      ),
      network_id: 3,
      gas: 8000000,
      gasPrice: 20000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    rinkeby: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        `https://rinkeby.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        0,
        10
      ),
      network_id: 4,
      gas: 8000000,
      gasPrice: 20000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    goerli: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        0,
        10
      ),
      network_id: 5,
      gas: 8000000,
      gasPrice: 20000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    mainnet: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        0,
        10
      ),
      network_id: 1,
      gas: 8000000,
      gasPrice: 20000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    polygon: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        0,
        10
      ),
      network_id: 137,
      gas: 8000000,
      gasPrice: 30000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    bsc: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        'https://bsc-dataseed.binance.org/',
        0,
        10
      ),
      network_id: 56,
      gas: 8000000,
      gasPrice: 5000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    
    avalanche: {
      provider: () => new HDWalletProvider(
        process.env.MNEMONIC,
        'https://api.avax.network/ext/bc/C/rpc',
        0,
        10
      ),
      network_id: 43114,
      gas: 8000000,
      gasPrice: 25000000000,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  compilers: {
    solc: {
      version: "0.8.19",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
        evmVersion: "istanbul"
      }
    }
  },

  plugins: [
    "truffle-plugin-verify",
    "solidity-coverage"
  ],

  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY,
    polygonscan: process.env.POLYGONSCAN_API_KEY,
    bscscan: process.env.BSCSCAN_API_KEY,
    snowtrace: process.env.SNOWTRACE_API_KEY
  },

  mocha: {
    timeout: 100000,
    useColors: true,
    reporter: 'spec'
  },

  contracts_directory: './src/contracts',
  contracts_build_directory: './build/contracts',
  migrations_directory: './migrations',
  test_directory: './tests',

  // Gas reporter configuration
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY
  },

  // Solidity coverage configuration
  solc: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "istanbul"
    }
  }
};
