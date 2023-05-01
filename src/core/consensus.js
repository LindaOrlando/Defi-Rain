const logger = require('../utils/logger');
const config = require('../config/config');

class ConsensusManager {
  constructor() {
    this.proposals = new Map();
    this.votes = new Map();
    this.proposalCounter = 0;
    this.quorumThreshold = 0.51; // 51% threshold
    this.votingPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  }

  /**
   * Create a new governance proposal
   * @param {string} proposer - Proposer address
   * @param {string} title - Proposal title
   * @param {string} description - Proposal description
   * @param {string} type - Proposal type
   * @param {Object} parameters - Proposal parameters
   */
  async createProposal(proposer, title, description, type, parameters = {}) {
    try {
      const proposalId = this.generateProposalId();
      const proposal = {
        id: proposalId,
        proposer,
        title,
        description,
        type,
        parameters,
        status: 'active',
        createdAt: Date.now(),
        votingEndsAt: Date.now() + this.votingPeriod,
        votes: {
          for: 0,
          against: 0,
          abstain: 0
        },
        totalVotes: 0,
        voters: new Set()
      };

      this.proposals.set(proposalId, proposal);
      this.votes.set(proposalId, new Map());
      this.proposalCounter++;

      logger.info('Governance proposal created', {
        proposalId,
        proposer,
        title,
        type
      });

      return proposal;
    } catch (error) {
      logger.logError(error, { operation: 'createProposal', proposer });
      throw error;
    }
  }

  /**
   * Vote on a proposal
   * @param {string} proposalId - Proposal ID
   * @param {string} voter - Voter address
   * @param {string} vote - Vote choice (for, against, abstain)
   * @param {number} weight - Vote weight
   */
  async vote(proposalId, voter, vote, weight = 1) {
    try {
      if (!this.proposals.has(proposalId)) {
        throw new Error('Proposal not found');
      }

      const proposal = this.proposals.get(proposalId);
      
      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active');
      }

      if (Date.now() > proposal.votingEndsAt) {
        throw new Error('Voting period has ended');
      }

      if (proposal.voters.has(voter)) {
        throw new Error('Already voted on this proposal');
      }

      if (!['for', 'against', 'abstain'].includes(vote)) {
        throw new Error('Invalid vote choice');
      }

      const voteRecord = {
        voter,
        vote,
        weight,
        timestamp: Date.now()
      };

      this.votes.get(proposalId).set(voter, voteRecord);
      proposal.votes[vote] += weight;
      proposal.totalVotes += weight;
      proposal.voters.add(voter);

      logger.info('Vote cast on proposal', {
        proposalId,
        voter,
        vote,
        weight
      });

      return voteRecord;
    } catch (error) {
      logger.logError(error, { operation: 'vote', proposalId, voter });
      throw error;
    }
  }

  /**
   * Execute a proposal
   * @param {string} proposalId - Proposal ID
   */
  async executeProposal(proposalId) {
    try {
      if (!this.proposals.has(proposalId)) {
        throw new Error('Proposal not found');
      }

      const proposal = this.proposals.get(proposalId);
      
      if (proposal.status !== 'passed') {
        throw new Error('Proposal has not passed');
      }

      // Execute proposal based on type
      const result = await this.executeProposalByType(proposal);
      
      proposal.status = 'executed';
      proposal.executedAt = Date.now();

      logger.info('Proposal executed successfully', {
        proposalId,
        type: proposal.type,
        result
      });

      return result;
    } catch (error) {
      logger.logError(error, { operation: 'executeProposal', proposalId });
      throw error;
    }
  }

  /**
   * Execute proposal by type
   * @param {Object} proposal - Proposal object
   * @returns {Object} Execution result
   */
  async executeProposalByType(proposal) {
    try {
      switch (proposal.type) {
        case 'parameter_change':
          return await this.executeParameterChange(proposal);
        case 'upgrade':
          return await this.executeUpgrade(proposal);
        case 'funding':
          return await this.executeFunding(proposal);
        case 'emergency':
          return await this.executeEmergency(proposal);
        default:
          throw new Error('Unknown proposal type');
      }
    } catch (error) {
      logger.logError(error, { operation: 'executeProposalByType', proposalId: proposal.id });
      throw error;
    }
  }

  /**
   * Execute parameter change proposal
   * @param {Object} proposal - Proposal object
   * @returns {Object} Execution result
   */
  async executeParameterChange(proposal) {
    // Mock implementation
    logger.info('Parameter change proposal executed', {
      proposalId: proposal.id,
      parameters: proposal.parameters
    });

    return { success: true, type: 'parameter_change' };
  }

  /**
   * Execute upgrade proposal
   * @param {Object} proposal - Proposal object
   * @returns {Object} Execution result
   */
  async executeUpgrade(proposal) {
    // Mock implementation
    logger.info('Upgrade proposal executed', {
      proposalId: proposal.id,
      parameters: proposal.parameters
    });

    return { success: true, type: 'upgrade' };
  }

  /**
   * Execute funding proposal
   * @param {Object} proposal - Proposal object
   * @returns {Object} Execution result
   */
  async executeFunding(proposal) {
    // Mock implementation
    logger.info('Funding proposal executed', {
      proposalId: proposal.id,
      parameters: proposal.parameters
    });

    return { success: true, type: 'funding' };
  }

  /**
   * Execute emergency proposal
   * @param {Object} proposal - Proposal object
   * @returns {Object} Execution result
   */
  async executeEmergency(proposal) {
    // Mock implementation
    logger.info('Emergency proposal executed', {
      proposalId: proposal.id,
      parameters: proposal.parameters
    });

    return { success: true, type: 'emergency' };
  }

  /**
   * Check if proposal has passed
   * @param {string} proposalId - Proposal ID
   * @returns {boolean} True if passed
   */
  checkProposalPassed(proposalId) {
    try {
      if (!this.proposals.has(proposalId)) {
        return false;
      }

      const proposal = this.proposals.get(proposalId);
      
      if (proposal.status !== 'active') {
        return proposal.status === 'passed';
      }

      const totalVotes = proposal.totalVotes;
      const forVotes = proposal.votes.for;
      const againstVotes = proposal.votes.against;

      if (totalVotes === 0) {
        return false;
      }

      const forPercentage = forVotes / totalVotes;
      const passed = forPercentage >= this.quorumThreshold;

      if (passed) {
        proposal.status = 'passed';
        logger.info('Proposal passed', {
          proposalId,
          forVotes,
          againstVotes,
          forPercentage: (forPercentage * 100).toFixed(2) + '%'
        });
      }

      return passed;
    } catch (error) {
      logger.logError(error, { operation: 'checkProposalPassed', proposalId });
      return false;
    }
  }

  /**
   * Get proposal information
   * @param {string} proposalId - Proposal ID
   * @returns {Object|null} Proposal information
   */
  getProposal(proposalId) {
    return this.proposals.get(proposalId) || null;
  }

  /**
   * Get all proposals
   * @returns {Array} Array of proposals
   */
  getAllProposals() {
    return Array.from(this.proposals.values());
  }

  /**
   * Get active proposals
   * @returns {Array} Array of active proposals
   */
  getActiveProposals() {
    return Array.from(this.proposals.values()).filter(p => p.status === 'active');
  }

  /**
   * Get proposal votes
   * @param {string} proposalId - Proposal ID
   * @returns {Array} Array of votes
   */
  getProposalVotes(proposalId) {
    if (!this.votes.has(proposalId)) {
      return [];
    }

    return Array.from(this.votes.get(proposalId).values());
  }

  /**
   * Generate proposal ID
   * @returns {string} Proposal ID
   */
  generateProposalId() {
    return `proposal_${this.proposalCounter}_${Date.now()}`;
  }

  /**
   * Get consensus statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const totalProposals = this.proposals.size;
    const activeProposals = this.getActiveProposals().length;
    const passedProposals = Array.from(this.proposals.values()).filter(p => p.status === 'passed').length;
    const executedProposals = Array.from(this.proposals.values()).filter(p => p.status === 'executed').length;

    return {
      totalProposals,
      activeProposals,
      passedProposals,
      executedProposals,
      quorumThreshold: this.quorumThreshold,
      votingPeriod: this.votingPeriod
    };
  }
}

module.exports = ConsensusManager;