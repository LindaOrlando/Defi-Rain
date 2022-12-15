const crypto = require('crypto');
const logger = require('./logger');

class CryptoUtils {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
  }

  /**
   * Generate a random key
   * @param {number} length - Key length in bytes
   * @returns {Buffer} Random key
   */
  generateKey(length = this.keyLength) {
    try {
      const key = crypto.randomBytes(length);
      logger.debug('Generated new encryption key', { keyLength: length });
      return key;
    } catch (error) {
      logger.logError(error, { operation: 'generateKey', length });
      throw error;
    }
  }

  /**
   * Generate a random IV
   * @param {number} length - IV length in bytes
   * @returns {Buffer} Random IV
   */
  generateIV(length = this.ivLength) {
    try {
      const iv = crypto.randomBytes(length);
      logger.debug('Generated new IV', { ivLength: length });
      return iv;
    } catch (error) {
      logger.logError(error, { operation: 'generateIV', length });
      throw error;
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   * @param {string|Buffer} data - Data to encrypt
   * @param {Buffer} key - Encryption key
   * @param {Buffer} iv - Initialization vector
   * @returns {Object} Encrypted data with tag
   */
  encrypt(data, key, iv) {
    try {
      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('defi-rain', 'utf8'));
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      const result = {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
      
      logger.debug('Data encrypted successfully', { 
        dataLength: Buffer.byteLength(data),
        algorithm: this.algorithm
      });
      
      return result;
    } catch (error) {
      logger.logError(error, { operation: 'encrypt' });
      throw error;
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   * @param {Object} encryptedData - Encrypted data object
   * @param {Buffer} key - Decryption key
   * @returns {string} Decrypted data
   */
  decrypt(encryptedData, key) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      const decipher = crypto.createDecipher(this.algorithm, key);
      
      decipher.setAAD(Buffer.from('defi-rain', 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.debug('Data decrypted successfully', { 
        encryptedLength: encrypted.length,
        algorithm: this.algorithm
      });
      
      return decrypted;
    } catch (error) {
      logger.logError(error, { operation: 'decrypt' });
      throw error;
    }
  }

  /**
   * Generate a hash of data
   * @param {string|Buffer} data - Data to hash
   * @param {string} algorithm - Hash algorithm
   * @returns {string} Hash in hex format
   */
  hash(data, algorithm = 'sha256') {
    try {
      const hash = crypto.createHash(algorithm);
      hash.update(data);
      const result = hash.digest('hex');
      
      logger.debug('Data hashed successfully', { 
        algorithm,
        dataLength: Buffer.byteLength(data)
      });
      
      return result;
    } catch (error) {
      logger.logError(error, { operation: 'hash', algorithm });
      throw error;
    }
  }

  /**
   * Generate HMAC
   * @param {string|Buffer} data - Data to sign
   * @param {string|Buffer} key - HMAC key
   * @param {string} algorithm - Hash algorithm
   * @returns {string} HMAC in hex format
   */
  hmac(data, key, algorithm = 'sha256') {
    try {
      const hmac = crypto.createHmac(algorithm, key);
      hmac.update(data);
      const result = hmac.digest('hex');
      
      logger.debug('HMAC generated successfully', { 
        algorithm,
        dataLength: Buffer.byteLength(data)
      });
      
      return result;
    } catch (error) {
      logger.logError(error, { operation: 'hmac', algorithm });
      throw error;
    }
  }

  /**
   * Generate a random string
   * @param {number} length - String length
   * @returns {string} Random string
   */
  randomString(length = 32) {
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      logger.debug('Random string generated', { length });
      return result;
    } catch (error) {
      logger.logError(error, { operation: 'randomString', length });
      throw error;
    }
  }

  /**
   * Generate a secure random number
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number
   */
  secureRandom(min = 0, max = 1) {
    try {
      const range = max - min;
      const randomBytes = crypto.randomBytes(4);
      const randomValue = randomBytes.readUInt32BE(0) / 0xffffffff;
      
      const result = min + Math.floor(randomValue * range);
      
      logger.debug('Secure random number generated', { min, max, result });
      return result;
    } catch (error) {
      logger.logError(error, { operation: 'secureRandom', min, max });
      throw error;
    }
  }

  /**
   * Verify data integrity using HMAC
   * @param {string|Buffer} data - Data to verify
   * @param {string} signature - Expected signature
   * @param {string|Buffer} key - HMAC key
   * @param {string} algorithm - Hash algorithm
   * @returns {boolean} Verification result
   */
  verify(data, signature, key, algorithm = 'sha256') {
    try {
      const expectedSignature = this.hmac(data, key, algorithm);
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
      
      logger.debug('Data verification completed', { 
        algorithm,
        isValid,
        dataLength: Buffer.byteLength(data)
      });
      
      return isValid;
    } catch (error) {
      logger.logError(error, { operation: 'verify', algorithm });
      throw error;
    }
  }
}

module.exports = new CryptoUtils();
