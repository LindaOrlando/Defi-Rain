const path = require('path');
require('dotenv').config();

class Config {
  constructor() {
    this.loadConfig();
  }

  loadConfig() {
    // Server Configuration
    this.server = {
      port: process.env.PORT || 3000,
      host: process.env.HOST || 'localhost',
      env: process.env.NODE_ENV || 'development'
    };

    // Database Configuration
    this.database = {
      mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/defi-rain',
        options: {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      },
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || '',
        db: process.env.REDIS_DB || 0
      }
    };

    // Blockchain Configuration
    this.blockchain = {
      ethereum: {
        rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://localhost:8545',
        chainId: process.env.ETHEREUM_CHAIN_ID || 1,
        gasLimit: process.env.GAS_LIMIT || 8000000,
        gasPrice: process.env.GAS_PRICE || '20000000000'
      },
      layer2: {
        rpcUrl: process.env.LAYER2_RPC_URL || 'http://localhost:3001',
        chainId: process.env.LAYER2_CHAIN_ID || 1001,
        blockTime: process.env.BLOCK_TIME || 2000
      }
    };

    // Rollup Configuration
    this.rollup = {
      batchSize: parseInt(process.env.ROLLUP_BATCH_SIZE) || 100,
      batchTimeout: parseInt(process.env.ROLLUP_BATCH_TIMEOUT) || 10000,
      maxGasPerBatch: parseInt(process.env.MAX_GAS_PER_BATCH) || 1000000,
      sequencerAddress: process.env.SEQUENCER_ADDRESS || '',
      validatorAddresses: process.env.VALIDATOR_ADDRESSES ? 
        process.env.VALIDATOR_ADDRESSES.split(',') : []
    };

    // Security Configuration
    this.security = {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
      encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key',
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 100
      }
    };

    // Logging Configuration
    this.logging = {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.LOG_FORMAT || 'combined',
      file: {
        enabled: process.env.LOG_FILE_ENABLED === 'true',
        path: process.env.LOG_FILE_PATH || 'logs/app.log',
        maxSize: process.env.LOG_MAX_SIZE || '10m',
        maxFiles: process.env.LOG_MAX_FILES || '5'
      }
    };

    // Monitoring Configuration
    this.monitoring = {
      enabled: process.env.MONITORING_ENABLED === 'true',
      metricsPort: parseInt(process.env.METRICS_PORT) || 9090,
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 30000
    };

    // API Configuration
    this.api = {
      version: process.env.API_VERSION || 'v1',
      prefix: process.env.API_PREFIX || '/api',
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: process.env.CORS_CREDENTIALS === 'true'
      }
    };
  }

  get(key) {
    return this[key];
  }

  set(key, value) {
    this[key] = value;
  }

  validate() {
    const required = [
      'server.port',
      'blockchain.ethereum.rpcUrl',
      'database.mongodb.uri'
    ];

    for (const key of required) {
      const value = this.getNestedValue(key);
      if (!value) {
        throw new Error(`Required configuration missing: ${key}`);
      }
    }

    return true;
  }

  getNestedValue(key) {
    return key.split('.').reduce((obj, key) => obj && obj[key], this);
  }
}

module.exports = new Config();
