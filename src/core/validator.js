const logger = require('../utils/logger');
const config = require('../config/config');

class ValidatorManager {
  constructor() {
    this.validators = new Map();
    this.stakes = new Map();
    this.performance = new Map();
    this.minimumStake = config.rollup.minimumStake || 1000000000000000000; // 1 ETH
  }

  /**
   * Register a new validator
   * @param {string} address - Validator address
   * @param {string} publicKey - Validator public key
   * @param {number} stake - Stake amount
   */
  async registerValidator(address, publicKey, stake) {
    try {
      if (this.validators.has(address)) {
        throw new Error('Validator already registered');
      }

      if (stake < this.minimumStake) {
        throw new Error('Insufficient stake amount');
      }

      if (!this.validatePublicKey(publicKey)) {
        throw new Error('Invalid public key format');
      }

      const validator = {
        address,
        publicKey,
        stake,
        registeredAt: Date.now(),
        isActive: true,
        performance: {
          totalBatches: 0,
          successfulBatches: 0,
          failedBatches: 0,
          uptime: 100
        }
      };

      this.validators.set(address, validator);
      this.stakes.set(address, stake);
      this.performance.set(address, validator.performance);

      logger.info('Validator registered successfully', {
        address,
        stake: stake.toString(),
        publicKey: publicKey.substring(0, 20) + '...'
      });

      return validator;
    } catch (error) {
      logger.logError(error, { operation: 'registerValidator', address });
      throw error;
    }
  }

  /**
   * Unregister a validator
   * @param {string} address - Validator address
   */
  async unregisterValidator(address) {
    try {
      if (!this.validators.has(address)) {
        throw new Error('Validator not found');
      }

      const validator = this.validators.get(address);
      validator.isActive = false;

      this.validators.delete(address);
      this.stakes.delete(address);
      this.performance.delete(address);

      logger.info('Validator unregistered successfully', { address });

      return true;
    } catch (error) {
      logger.logError(error, { operation: 'unregisterValidator', address });
      throw error;
    }
  }

  /**
   * Update validator stake
   * @param {string} address - Validator address
   * @param {number} newStake - New stake amount
   */
  async updateStake(address, newStake) {
    try {
      if (!this.validators.has(address)) {
        throw new Error('Validator not found');
      }

      if (newStake < this.minimumStake) {
        throw new Error('Insufficient stake amount');
      }

      const validator = this.validators.get(address);
      const oldStake = validator.stake;
      
      validator.stake = newStake;
      this.stakes.set(address, newStake);

      logger.info('Validator stake updated', {
        address,
        oldStake: oldStake.toString(),
        newStake: newStake.toString()
      });

      return validator;
    } catch (error) {
      logger.logError(error, { operation: 'updateStake', address });
      throw error;
    }
  }

  /**
   * Get validator information
   * @param {string} address - Validator address
   * @returns {Object|null} Validator information
   */
  getValidator(address) {
    return this.validators.get(address) || null;
  }

  /**
   * Get all validators
   * @returns {Array} Array of validators
   */
  getAllValidators() {
    return Array.from(this.validators.values());
  }

  /**
   * Get active validators
   * @returns {Array} Array of active validators
   */
  getActiveValidators() {
    return Array.from(this.validators.values()).filter(v => v.isActive);
  }

  /**
   * Update validator performance
   * @param {string} address - Validator address
   * @param {boolean} success - Whether the batch was successful
   */
  updatePerformance(address, success) {
    try {
      if (!this.performance.has(address)) {
        return;
      }

      const perf = this.performance.get(address);
      perf.totalBatches++;

      if (success) {
        perf.successfulBatches++;
      } else {
        perf.failedBatches++;
      }

      perf.uptime = (perf.successfulBatches / perf.totalBatches) * 100;

      logger.debug('Validator performance updated', {
        address,
        totalBatches: perf.totalBatches,
        successRate: perf.uptime.toFixed(2) + '%'
      });
    } catch (error) {
      logger.logError(error, { operation: 'updatePerformance', address });
    }
  }

  /**
   * Get validator performance
   * @param {string} address - Validator address
   * @returns {Object|null} Performance data
   */
  getPerformance(address) {
    return this.performance.get(address) || null;
  }

  /**
   * Validate public key format
   * @param {string} publicKey - Public key to validate
   * @returns {boolean} Validation result
   */
  validatePublicKey(publicKey) {
    try {
      // Basic validation for Ethereum public key format
      return publicKey && publicKey.length === 130 && publicKey.startsWith('0x');
    } catch (error) {
      return false;
    }
  }

  /**
   * Get validator statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const totalValidators = this.validators.size;
    const activeValidators = this.getActiveValidators().length;
    const totalStake = Array.from(this.stakes.values()).reduce((sum, stake) => sum + stake, 0);
    const averageStake = totalValidators > 0 ? totalStake / totalValidators : 0;

    return {
      totalValidators,
      activeValidators,
      totalStake: totalStake.toString(),
      averageStake: averageStake.toString(),
      minimumStake: this.minimumStake.toString()
    };
  }

  /**
   * Check if address is a validator
   * @param {string} address - Address to check
   * @returns {boolean} True if validator
   */
  isValidator(address) {
    return this.validators.has(address) && this.validators.get(address).isActive;
  }

  /**
   * Get validator stake
   * @param {string} address - Validator address
   * @returns {number} Stake amount
   */
  getStake(address) {
    return this.stakes.get(address) || 0;
  }
}

module.exports = ValidatorManager;