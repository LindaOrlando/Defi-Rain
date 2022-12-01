const winston = require('winston');
const path = require('path');
const config = require('../config/config');

class Logger {
  constructor() {
    this.logger = this.createLogger();
  }

  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    const transports = [
      new winston.transports.Console({
        level: config.logging.level,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ];

    if (config.logging.file.enabled) {
      transports.push(
        new winston.transports.File({
          filename: path.join(process.cwd(), config.logging.file.path),
          level: config.logging.level,
          format: logFormat,
          maxsize: config.logging.file.maxSize,
          maxFiles: config.logging.file.maxFiles
        })
      );
    }

    return winston.createLogger({
      level: config.logging.level,
      format: logFormat,
      transports,
      exitOnError: false
    });
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  logError(error, context = {}) {
    this.error('Error occurred', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }

  logRequest(req, res, responseTime) {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
  }

  logTransaction(txHash, status, gasUsed, blockNumber) {
    this.info('Transaction processed', {
      txHash,
      status,
      gasUsed,
      blockNumber
    });
  }

  logBlock(blockNumber, txCount, gasUsed) {
    this.info('Block processed', {
      blockNumber,
      txCount,
      gasUsed
    });
  }
}

module.exports = new Logger();
