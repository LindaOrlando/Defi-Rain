const crypto = require('crypto');
const logger = require('./logger');

class MerkleTree {
  constructor(leaves = []) {
    this.leaves = leaves.map(leaf => this.hashLeaf(leaf));
    this.tree = this.buildTree();
    this.root = this.tree.length > 0 ? this.tree[this.tree.length - 1] : null;
  }

  /**
   * Hash a leaf node
   * @param {string|Buffer} data - Data to hash
   * @returns {string} Hashed leaf
   */
  hashLeaf(data) {
    try {
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
      const hash = crypto.createHash('sha256');
      hash.update(dataBuffer);
      const result = hash.digest('hex');
      
      logger.debug('Leaf hashed', { 
        dataLength: dataBuffer.length,
        hash: result.substring(0, 16) + '...'
      });
      
      return result;
    } catch (error) {
      logger.logError(error, { operation: 'hashLeaf' });
      throw error;
    }
  }

  /**
   * Hash two nodes together
   * @param {string} left - Left node hash
   * @param {string} right - Right node hash
   * @returns {string} Combined hash
   */
  hashNodes(left, right) {
    try {
      const combined = left < right ? left + right : right + left;
      const hash = crypto.createHash('sha256');
      hash.update(combined, 'hex');
      const result = hash.digest('hex');
      
      logger.debug('Nodes hashed together', { 
        left: left.substring(0, 8) + '...',
        right: right.substring(0, 8) + '...',
        result: result.substring(0, 16) + '...'
      });
      
      return result;
    } catch (error) {
      logger.logError(error, { operation: 'hashNodes' });
      throw error;
    }
  }

  /**
   * Build the Merkle tree
   * @returns {Array} Tree levels
   */
  buildTree() {
    try {
      if (this.leaves.length === 0) {
        return [];
      }

      if (this.leaves.length === 1) {
        return [this.leaves[0]];
      }

      let currentLevel = [...this.leaves];
      const tree = [currentLevel];

      while (currentLevel.length > 1) {
        const nextLevel = [];
        
        for (let i = 0; i < currentLevel.length; i += 2) {
          const left = currentLevel[i];
          const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
          const combined = this.hashNodes(left, right);
          nextLevel.push(combined);
        }
        
        tree.push(nextLevel);
        currentLevel = nextLevel;
      }

      logger.info('Merkle tree built successfully', { 
        leafCount: this.leaves.length,
        treeHeight: tree.length,
        root: this.root?.substring(0, 16) + '...'
      });

      return tree;
    } catch (error) {
      logger.logError(error, { operation: 'buildTree' });
      throw error;
    }
  }

  /**
   * Get the root hash
   * @returns {string|null} Root hash
   */
  getRoot() {
    return this.root;
  }

  /**
   * Generate a Merkle proof for a leaf
   * @param {number} index - Leaf index
   * @returns {Array} Proof path
   */
  getProof(index) {
    try {
      if (index < 0 || index >= this.leaves.length) {
        throw new Error('Invalid leaf index');
      }

      const proof = [];
      let currentIndex = index;
      let currentLevel = 0;

      while (currentLevel < this.tree.length - 1) {
        const level = this.tree[currentLevel];
        const isLeft = currentIndex % 2 === 0;
        const siblingIndex = isLeft ? currentIndex + 1 : currentIndex - 1;
        
        if (siblingIndex < level.length) {
          proof.push({
            hash: level[siblingIndex],
            position: isLeft ? 'right' : 'left'
          });
        }
        
        currentIndex = Math.floor(currentIndex / 2);
        currentLevel++;
      }

      logger.debug('Merkle proof generated', { 
        leafIndex: index,
        proofLength: proof.length,
        leafHash: this.leaves[index].substring(0, 16) + '...'
      });

      return proof;
    } catch (error) {
      logger.logError(error, { operation: 'getProof', index });
      throw error;
    }
  }

  /**
   * Verify a Merkle proof
   * @param {string} leaf - Leaf hash
   * @param {Array} proof - Proof path
   * @param {string} root - Root hash
   * @returns {boolean} Verification result
   */
  verifyProof(leaf, proof, root) {
    try {
      let currentHash = leaf;

      for (const node of proof) {
        if (node.position === 'left') {
          currentHash = this.hashNodes(node.hash, currentHash);
        } else {
          currentHash = this.hashNodes(currentHash, node.hash);
        }
      }

      const isValid = currentHash === root;
      
      logger.debug('Merkle proof verification completed', { 
        isValid,
        leaf: leaf.substring(0, 16) + '...',
        root: root.substring(0, 16) + '...'
      });

      return isValid;
    } catch (error) {
      logger.logError(error, { operation: 'verifyProof' });
      throw error;
    }
  }

  /**
   * Add a new leaf to the tree
   * @param {string|Buffer} data - New leaf data
   * @returns {string} New root hash
   */
  addLeaf(data) {
    try {
      const newLeaf = this.hashLeaf(data);
      this.leaves.push(newLeaf);
      this.tree = this.buildTree();
      this.root = this.tree.length > 0 ? this.tree[this.tree.length - 1] : null;
      
      logger.info('Leaf added to Merkle tree', { 
        newLeafCount: this.leaves.length,
        newRoot: this.root?.substring(0, 16) + '...'
      });

      return this.root;
    } catch (error) {
      logger.logError(error, { operation: 'addLeaf' });
      throw error;
    }
  }

  /**
   * Get tree statistics
   * @returns {Object} Tree statistics
   */
  getStats() {
    return {
      leafCount: this.leaves.length,
      treeHeight: this.tree.length,
      root: this.root,
      isEmpty: this.leaves.length === 0
    };
  }

  /**
   * Serialize the tree to JSON
   * @returns {Object} Serialized tree
   */
  toJSON() {
    return {
      leaves: this.leaves,
      tree: this.tree,
      root: this.root
    };
  }

  /**
   * Create a Merkle tree from JSON
   * @param {Object} data - Serialized tree data
   * @returns {MerkleTree} New Merkle tree instance
   */
  static fromJSON(data) {
    const tree = new MerkleTree();
    tree.leaves = data.leaves || [];
    tree.tree = data.tree || [];
    tree.root = data.root || null;
    return tree;
  }
}

module.exports = MerkleTree;
