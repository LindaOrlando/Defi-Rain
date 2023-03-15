const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./config/config');
const logger = require('./utils/logger');
const routes = require('./api/routes');

class DefiRainServer {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = config.server.port;
    this.host = config.server.host;
  }

  /**
   * Initialize the server
   */
  async initialize() {
    try {
      await this.setupMiddleware();
      await this.setupRoutes();
      await this.setupErrorHandling();
      
      logger.info('DefiRain server initialized successfully', {
        port: this.port,
        host: this.host,
        environment: config.server.env
      });
    } catch (error) {
      logger.logError(error, { operation: 'server_initialize' });
      throw error;
    }
  }

  /**
   * Setup middleware
   */
  async setupMiddleware() {
    try {
      // Security middleware
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
        crossOriginEmbedderPolicy: false
      }));

      // CORS middleware
      this.app.use(cors({
        origin: config.api.cors.origin,
        credentials: config.api.cors.credentials,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }));

      // Compression middleware
      this.app.use(compression());

      // Logging middleware
      if (config.server.env !== 'test') {
        this.app.use(morgan('combined', {
          stream: {
            write: (message) => logger.info(message.trim())
          }
        }));
      }

      // Body parsing middleware
      this.app.use(express.json({ limit: '10mb' }));
      this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

      // Request logging middleware
      this.app.use((req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
          const duration = Date.now() - start;
          logger.logRequest(req, res, duration);
        });
        
        next();
      });

      logger.info('Middleware setup completed');
    } catch (error) {
      logger.logError(error, { operation: 'setup_middleware' });
      throw error;
    }
  }

  /**
   * Setup routes
   */
  async setupRoutes() {
    try {
      // Health check endpoint
      this.app.get('/', (req, res) => {
        res.json({
          name: 'Defi-Rain Layer2',
          version: '1.0.0',
          description: 'High-performance Layer2 scaling solution for Ethereum',
          status: 'running',
          timestamp: new Date().toISOString()
        });
      });

      // API routes
      this.app.use(config.api.prefix, routes);

      // 404 handler
      this.app.use('*', (req, res) => {
        res.status(404).json({
          error: 'Not Found',
          message: `Route ${req.originalUrl} not found`,
          timestamp: new Date().toISOString()
        });
      });

      logger.info('Routes setup completed', {
        apiPrefix: config.api.prefix,
        totalRoutes: this.getRouteCount()
      });
    } catch (error) {
      logger.logError(error, { operation: 'setup_routes' });
      throw error;
    }
  }

  /**
   * Setup error handling
   */
  async setupErrorHandling() {
    try {
      // Global error handler
      this.app.use((error, req, res, next) => {
        logger.logError(error, {
          operation: 'global_error_handler',
          path: req.path,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        // Don't leak error details in production
        const isDevelopment = config.server.env === 'development';
        const errorResponse = {
          error: 'Internal Server Error',
          message: isDevelopment ? error.message : 'Something went wrong',
          timestamp: new Date().toISOString(),
          requestId: req.id || 'unknown'
        };

        if (isDevelopment) {
          errorResponse.stack = error.stack;
        }

        res.status(500).json(errorResponse);
      });

      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        logger.logError(error, { operation: 'uncaught_exception' });
        process.exit(1);
      });

      // Handle unhandled promise rejections
      process.on('unhandledRejection', (reason, promise) => {
        logger.logError(new Error(reason), { 
          operation: 'unhandled_rejection',
          promise: promise.toString()
        });
        process.exit(1);
      });

      // Handle SIGTERM
      process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        this.shutdown();
      });

      // Handle SIGINT
      process.on('SIGINT', () => {
        logger.info('SIGINT received, shutting down gracefully');
        this.shutdown();
      });

      logger.info('Error handling setup completed');
    } catch (error) {
      logger.logError(error, { operation: 'setup_error_handling' });
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start() {
    try {
      await this.initialize();
      
      this.server = this.app.listen(this.port, this.host, () => {
        logger.info('DefiRain server started successfully', {
          port: this.port,
          host: this.host,
          environment: config.server.env,
          pid: process.pid
        });
      });

      // Handle server errors
      this.server.on('error', (error) => {
        logger.logError(error, { operation: 'server_error' });
        throw error;
      });

    } catch (error) {
      logger.logError(error, { operation: 'start_server' });
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop() {
    try {
      if (this.server) {
        await new Promise((resolve, reject) => {
          this.server.close((error) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
        
        logger.info('DefiRain server stopped successfully');
      }
    } catch (error) {
      logger.logError(error, { operation: 'stop_server' });
      throw error;
    }
  }

  /**
   * Shutdown the server gracefully
   */
  async shutdown() {
    try {
      logger.info('Starting graceful shutdown...');
      
      await this.stop();
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.logError(error, { operation: 'shutdown' });
      process.exit(1);
    }
  }

  /**
   * Get route count
   * @returns {number} Number of routes
   */
  getRouteCount() {
    // This is a simplified count, in a real implementation
    // you would traverse the router stack to get actual count
    return 15; // Approximate count of our API routes
  }

  /**
   * Get server info
   * @returns {Object} Server information
   */
  getServerInfo() {
    return {
      port: this.port,
      host: this.host,
      environment: config.server.env,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      version: process.version,
      platform: process.platform
    };
  }
}

// Create and start server if this file is run directly
if (require.main === module) {
  const server = new DefiRainServer();
  
  server.start().catch((error) => {
    logger.logError(error, { operation: 'server_startup' });
    process.exit(1);
  });
}

module.exports = DefiRainServer;
