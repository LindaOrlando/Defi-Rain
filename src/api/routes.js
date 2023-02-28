const express = require('express');
const router = express.Router();
const RollupManager = require('../core/rollup');
const CrossChainBridge = require('../core/bridge');
const logger = require('../utils/logger');

// Initialize managers
const rollupManager = new RollupManager();
const bridgeManager = new CrossChainBridge();

// Initialize managers
(async () => {
  try {
    await rollupManager.initialize();
    await bridgeManager.initialize();
    logger.info('API routes initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize API routes:', error);
  }
})();

// Health check endpoint
router.get('/health', (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        rollup: 'running',
        bridge: 'running'
      }
    };
    
    res.json(health);
  } catch (error) {
    logger.logError(error, { operation: 'health_check' });
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Rollup endpoints
router.post('/rollup/submit', async (req, res) => {
  try {
    const { transaction } = req.body;
    
    if (!transaction) {
      return res.status(400).json({ error: 'Transaction data required' });
    }
    
    await rollupManager.addTransaction(transaction);
    
    res.json({
      success: true,
      message: 'Transaction submitted successfully',
      transactionId: transaction.id
    });
  } catch (error) {
    logger.logError(error, { operation: 'submit_transaction' });
    res.status(500).json({ error: error.message });
  }
});

router.get('/rollup/batches', (req, res) => {
  try {
    const batches = rollupManager.getAllBatches();
    const stats = rollupManager.getStats();
    
    res.json({
      batches,
      stats,
      totalBatches: batches.length
    });
  } catch (error) {
    logger.logError(error, { operation: 'get_batches' });
    res.status(500).json({ error: 'Failed to get batches' });
  }
});

router.get('/rollup/batch/:batchId', (req, res) => {
  try {
    const { batchId } = req.params;
    const batch = rollupManager.getBatch(batchId);
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    res.json(batch);
  } catch (error) {
    logger.logError(error, { operation: 'get_batch', batchId: req.params.batchId });
    res.status(500).json({ error: 'Failed to get batch' });
  }
});

router.get('/rollup/stats', (req, res) => {
  try {
    const stats = rollupManager.getStats();
    res.json(stats);
  } catch (error) {
    logger.logError(error, { operation: 'get_rollup_stats' });
    res.status(500).json({ error: 'Failed to get rollup stats' });
  }
});

// Bridge endpoints
router.post('/bridge/deposit', async (req, res) => {
  try {
    const { userAddress, tokenAddress, amount, options } = req.body;
    
    if (!userAddress || !amount) {
      return res.status(400).json({ error: 'User address and amount required' });
    }
    
    const result = await bridgeManager.deposit(userAddress, tokenAddress, amount, options);
    
    res.json(result);
  } catch (error) {
    logger.logError(error, { operation: 'deposit' });
    res.status(500).json({ error: error.message });
  }
});

router.post('/bridge/withdraw', async (req, res) => {
  try {
    const { userAddress, tokenAddress, amount, options } = req.body;
    
    if (!userAddress || !amount) {
      return res.status(400).json({ error: 'User address and amount required' });
    }
    
    const result = await bridgeManager.withdraw(userAddress, tokenAddress, amount, options);
    
    res.json(result);
  } catch (error) {
    logger.logError(error, { operation: 'withdraw' });
    res.status(500).json({ error: error.message });
  }
});

router.post('/bridge/complete-withdrawal', async (req, res) => {
  try {
    const { withdrawalId } = req.body;
    
    if (!withdrawalId) {
      return res.status(400).json({ error: 'Withdrawal ID required' });
    }
    
    const result = await bridgeManager.completeWithdrawal(withdrawalId);
    
    res.json(result);
  } catch (error) {
    logger.logError(error, { operation: 'complete_withdrawal' });
    res.status(500).json({ error: error.message });
  }
});

router.get('/bridge/deposit/:depositId', (req, res) => {
  try {
    const { depositId } = req.params;
    const deposit = bridgeManager.getDeposit(depositId);
    
    if (!deposit) {
      return res.status(404).json({ error: 'Deposit not found' });
    }
    
    res.json(deposit);
  } catch (error) {
    logger.logError(error, { operation: 'get_deposit', depositId: req.params.depositId });
    res.status(500).json({ error: 'Failed to get deposit' });
  }
});

router.get('/bridge/withdrawal/:withdrawalId', (req, res) => {
  try {
    const { withdrawalId } = req.params;
    const withdrawal = bridgeManager.getWithdrawal(withdrawalId);
    
    if (!withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    res.json(withdrawal);
  } catch (error) {
    logger.logError(error, { operation: 'get_withdrawal', withdrawalId: req.params.withdrawalId });
    res.status(500).json({ error: 'Failed to get withdrawal' });
  }
});

router.get('/bridge/stats', (req, res) => {
  try {
    const stats = bridgeManager.getStats();
    res.json(stats);
  } catch (error) {
    logger.logError(error, { operation: 'get_bridge_stats' });
    res.status(500).json({ error: 'Failed to get bridge stats' });
  }
});

router.get('/bridge/events', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const events = bridgeManager.getBridgeEvents(limit);
    
    res.json({
      events,
      total: events.length,
      limit
    });
  } catch (error) {
    logger.logError(error, { operation: 'get_bridge_events' });
    res.status(500).json({ error: 'Failed to get bridge events' });
  }
});

// Transaction endpoints
router.get('/transactions/:txHash', (req, res) => {
  try {
    const { txHash } = req.params;
    
    // In a real implementation, this would query the blockchain
    const transaction = {
      hash: txHash,
      from: '0x0000000000000000000000000000000000000000',
      to: '0x0000000000000000000000000000000000000000',
      value: '0',
      gas: '21000',
      gasPrice: '20000000000',
      nonce: 0,
      blockNumber: 12345,
      blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      transactionIndex: 0,
      status: 'success'
    };
    
    res.json(transaction);
  } catch (error) {
    logger.logError(error, { operation: 'get_transaction', txHash: req.params.txHash });
    res.status(500).json({ error: 'Failed to get transaction' });
  }
});

// Block endpoints
router.get('/blocks/:blockNumber', (req, res) => {
  try {
    const { blockNumber } = req.params;
    
    // In a real implementation, this would query the blockchain
    const block = {
      number: parseInt(blockNumber),
      hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      parentHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: Date.now(),
      gasLimit: '8000000',
      gasUsed: '4000000',
      transactions: [],
      miner: '0x0000000000000000000000000000000000000000'
    };
    
    res.json(block);
  } catch (error) {
    logger.logError(error, { operation: 'get_block', blockNumber: req.params.blockNumber });
    res.status(500).json({ error: 'Failed to get block' });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  logger.logError(error, { 
    operation: 'api_error',
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

module.exports = router;
