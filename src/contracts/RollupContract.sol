// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title RollupContract
 * @dev Main rollup contract for Layer2 scaling solution
 * @author Defi-Rain Team
 */
contract RollupContract is Ownable, ReentrancyGuard, Pausable {
    // Events
    event BatchSubmitted(
        uint256 indexed batchIndex,
        bytes32 indexed stateRoot,
        uint256 timestamp,
        address indexed sequencer
    );
    
    event BatchChallenged(
        uint256 indexed batchIndex,
        address indexed challenger,
        string reason
    );
    
    event StateRootUpdated(
        bytes32 indexed newStateRoot,
        uint256 indexed batchIndex,
        uint256 timestamp
    );
    
    event SequencerUpdated(
        address indexed oldSequencer,
        address indexed newSequencer
    );

    // Structs
    struct Batch {
        bytes32 stateRoot;
        bytes32 merkleRoot;
        uint256 timestamp;
        address sequencer;
        bool isChallenged;
        bool isFinalized;
    }

    // State variables
    mapping(uint256 => Batch) public batches;
    mapping(address => bool) public validators;
    mapping(address => uint256) public validatorStakes;
    
    bytes32 public currentStateRoot;
    uint256 public batchCounter;
    address public sequencer;
    uint256 public challengePeriod;
    uint256 public minimumStake;
    uint256 public maxBatchSize;
    
    // Constants
    uint256 public constant MAX_CHALLENGE_PERIOD = 7 days;
    uint256 public constant MIN_STAKE = 1 ether;
    uint256 public constant MAX_BATCH_SIZE = 1000;

    // Modifiers
    modifier onlySequencer() {
        require(msg.sender == sequencer, "Only sequencer can call this function");
        _;
    }
    
    modifier onlyValidator() {
        require(validators[msg.sender], "Only validator can call this function");
        _;
    }
    
    modifier validBatchIndex(uint256 batchIndex) {
        require(batchIndex < batchCounter, "Invalid batch index");
        _;
    }

    constructor(
        address _sequencer,
        uint256 _challengePeriod,
        uint256 _minimumStake
    ) {
        require(_sequencer != address(0), "Invalid sequencer address");
        require(_challengePeriod <= MAX_CHALLENGE_PERIOD, "Challenge period too long");
        require(_minimumStake >= MIN_STAKE, "Minimum stake too low");
        
        sequencer = _sequencer;
        challengePeriod = _challengePeriod;
        minimumStake = _minimumStake;
        maxBatchSize = MAX_BATCH_SIZE;
        currentStateRoot = bytes32(0);
    }

    /**
     * @dev Submit a new batch to the rollup
     * @param stateRoot New state root after batch execution
     * @param merkleRoot Merkle root of batch transactions
     * @param batchData Encoded batch data
     */
    function submitBatch(
        bytes32 stateRoot,
        bytes32 merkleRoot,
        bytes calldata batchData
    ) external onlySequencer whenNotPaused nonReentrant {
        require(stateRoot != bytes32(0), "Invalid state root");
        require(merkleRoot != bytes32(0), "Invalid merkle root");
        require(batchData.length > 0, "Empty batch data");
        
        // Validate batch size
        require(batchData.length <= maxBatchSize * 32, "Batch too large");
        
        // Create new batch
        Batch memory newBatch = Batch({
            stateRoot: stateRoot,
            merkleRoot: merkleRoot,
            timestamp: block.timestamp,
            sequencer: msg.sender,
            isChallenged: false,
            isFinalized: false
        });
        
        batches[batchCounter] = newBatch;
        
        emit BatchSubmitted(batchCounter, stateRoot, block.timestamp, msg.sender);
        
        batchCounter++;
    }

    /**
     * @dev Challenge a submitted batch
     * @param batchIndex Index of the batch to challenge
     * @param reason Reason for the challenge
     */
    function challengeBatch(
        uint256 batchIndex,
        string calldata reason
    ) external onlyValidator validBatchIndex(batchIndex) whenNotPaused {
        Batch storage batch = batches[batchIndex];
        
        require(!batch.isChallenged, "Batch already challenged");
        require(!batch.isFinalized, "Batch already finalized");
        require(
            block.timestamp <= batch.timestamp + challengePeriod,
            "Challenge period expired"
        );
        
        batch.isChallenged = true;
        
        emit BatchChallenged(batchIndex, msg.sender, reason);
    }

    /**
     * @dev Finalize a batch after challenge period
     * @param batchIndex Index of the batch to finalize
     */
    function finalizeBatch(
        uint256 batchIndex
    ) external validBatchIndex(batchIndex) whenNotPaused {
        Batch storage batch = batches[batchIndex];
        
        require(!batch.isFinalized, "Batch already finalized");
        require(
            block.timestamp > batch.timestamp + challengePeriod,
            "Challenge period not expired"
        );
        
        if (!batch.isChallenged) {
            // Update state root if batch was not challenged
            currentStateRoot = batch.stateRoot;
            emit StateRootUpdated(currentStateRoot, batchIndex, block.timestamp);
        }
        
        batch.isFinalized = true;
    }

    /**
     * @dev Register as a validator
     */
    function registerValidator() external payable whenNotPaused {
        require(msg.value >= minimumStake, "Insufficient stake");
        require(!validators[msg.sender], "Already registered");
        
        validators[msg.sender] = true;
        validatorStakes[msg.sender] = msg.value;
        
        emit ValidatorRegistered(msg.sender, msg.value);
    }

    /**
     * @dev Unregister as a validator and withdraw stake
     */
    function unregisterValidator() external onlyValidator whenNotPaused {
        uint256 stake = validatorStakes[msg.sender];
        require(stake > 0, "No stake to withdraw");
        
        validators[msg.sender] = false;
        validatorStakes[msg.sender] = 0;
        
        payable(msg.sender).transfer(stake);
        
        emit ValidatorUnregistered(msg.sender, stake);
    }

    /**
     * @dev Get batch information
     * @param batchIndex Index of the batch
     * @return Batch information
     */
    function getBatch(uint256 batchIndex) external view validBatchIndex(batchIndex) returns (
        bytes32 stateRoot,
        bytes32 merkleRoot,
        uint256 timestamp,
        address sequencer,
        bool isChallenged,
        bool isFinalized
    ) {
        Batch memory batch = batches[batchIndex];
        return (
            batch.stateRoot,
            batch.merkleRoot,
            batch.timestamp,
            batch.sequencer,
            batch.isChallenged,
            batch.isFinalized
        );
    }

    /**
     * @dev Get current state root
     * @return Current state root
     */
    function getCurrentStateRoot() external view returns (bytes32) {
        return currentStateRoot;
    }

    /**
     * @dev Get total number of batches
     * @return Total batch count
     */
    function getBatchCount() external view returns (uint256) {
        return batchCounter;
    }

    /**
     * @dev Check if address is a validator
     * @param addr Address to check
     * @return True if validator
     */
    function isValidator(address addr) external view returns (bool) {
        return validators[addr];
    }

    /**
     * @dev Get validator stake
     * @param addr Validator address
     * @return Stake amount
     */
    function getValidatorStake(address addr) external view returns (uint256) {
        return validatorStakes[addr];
    }

    /**
     * @dev Update sequencer address
     * @param newSequencer New sequencer address
     */
    function updateSequencer(address newSequencer) external onlyOwner {
        require(newSequencer != address(0), "Invalid sequencer address");
        require(newSequencer != sequencer, "Same sequencer address");
        
        address oldSequencer = sequencer;
        sequencer = newSequencer;
        
        emit SequencerUpdated(oldSequencer, newSequencer);
    }

    /**
     * @dev Update challenge period
     * @param newChallengePeriod New challenge period in seconds
     */
    function updateChallengePeriod(uint256 newChallengePeriod) external onlyOwner {
        require(newChallengePeriod <= MAX_CHALLENGE_PERIOD, "Challenge period too long");
        require(newChallengePeriod != challengePeriod, "Same challenge period");
        
        challengePeriod = newChallengePeriod;
    }

    /**
     * @dev Update minimum stake
     * @param newMinimumStake New minimum stake amount
     */
    function updateMinimumStake(uint256 newMinimumStake) external onlyOwner {
        require(newMinimumStake >= MIN_STAKE, "Minimum stake too low");
        require(newMinimumStake != minimumStake, "Same minimum stake");
        
        minimumStake = newMinimumStake;
    }

    /**
     * @dev Update maximum batch size
     * @param newMaxBatchSize New maximum batch size
     */
    function updateMaxBatchSize(uint256 newMaxBatchSize) external onlyOwner {
        require(newMaxBatchSize <= MAX_BATCH_SIZE, "Batch size too large");
        require(newMaxBatchSize > 0, "Invalid batch size");
        require(newMaxBatchSize != maxBatchSize, "Same batch size");
        
        maxBatchSize = newMaxBatchSize;
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Emergency withdraw function for owner
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
    }

    // Additional events
    event ValidatorRegistered(address indexed validator, uint256 stake);
    event ValidatorUnregistered(address indexed validator, uint256 stake);
}
