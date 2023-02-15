// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title BridgeContract
 * @dev Cross-chain bridge contract for Layer1 and Layer2 asset transfers
 * @author Defi-Rain Team
 */
contract BridgeContract is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Events
    event Deposit(
        address indexed user,
        address indexed token,
        uint256 amount,
        bytes32 indexed depositId,
        uint256 timestamp
    );
    
    event Withdrawal(
        address indexed user,
        address indexed token,
        uint256 amount,
        bytes32 indexed withdrawalId,
        uint256 timestamp
    );
    
    event DepositProofGenerated(
        bytes32 indexed depositId,
        bytes32 proof,
        uint256 timestamp
    );
    
    event WithdrawalCompleted(
        bytes32 indexed withdrawalId,
        bytes32 proof,
        uint256 timestamp
    );

    // Structs
    struct DepositInfo {
        address user;
        address token;
        uint256 amount;
        uint256 timestamp;
        bool isProcessed;
        bytes32 proof;
    }
    
    struct WithdrawalInfo {
        address user;
        address token;
        uint256 amount;
        uint256 timestamp;
        bool isCompleted;
        bytes32 proof;
    }

    // State variables
    mapping(bytes32 => DepositInfo) public deposits;
    mapping(bytes32 => WithdrawalInfo) public withdrawals;
    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public tokenBalances;
    
    address public layer2Bridge;
    uint256 public withdrawalDelay;
    uint256 public minimumDeposit;
    uint256 public maximumDeposit;
    uint256 public depositCounter;
    uint256 public withdrawalCounter;
    
    // Constants
    uint256 public constant MAX_WITHDRAWAL_DELAY = 30 days;
    uint256 public constant MIN_DEPOSIT = 0.001 ether;
    uint256 public constant MAX_DEPOSIT = 1000 ether;

    // Modifiers
    modifier onlyLayer2Bridge() {
        require(msg.sender == layer2Bridge, "Only Layer2 bridge can call this function");
        _;
    }
    
    modifier validToken(address token) {
        require(token != address(0), "Invalid token address");
        _;
    }
    
    modifier validAmount(uint256 amount) {
        require(amount >= minimumDeposit, "Amount too small");
        require(amount <= maximumDeposit, "Amount too large");
        _;
    }

    constructor(
        address _layer2Bridge,
        uint256 _withdrawalDelay,
        uint256 _minimumDeposit,
        uint256 _maximumDeposit
    ) {
        require(_layer2Bridge != address(0), "Invalid Layer2 bridge address");
        require(_withdrawalDelay <= MAX_WITHDRAWAL_DELAY, "Withdrawal delay too long");
        require(_minimumDeposit >= MIN_DEPOSIT, "Minimum deposit too low");
        require(_maximumDeposit <= MAX_DEPOSIT, "Maximum deposit too high");
        
        layer2Bridge = _layer2Bridge;
        withdrawalDelay = _withdrawalDelay;
        minimumDeposit = _minimumDeposit;
        maximumDeposit = _maximumDeposit;
    }

    /**
     * @dev Deposit ETH to Layer2
     */
    function depositETH() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "No ETH sent");
        require(msg.value >= minimumDeposit, "Deposit amount too small");
        require(msg.value <= maximumDeposit, "Deposit amount too large");
        
        bytes32 depositId = generateDepositId();
        
        deposits[depositId] = DepositInfo({
            user: msg.sender,
            token: address(0),
            amount: msg.value,
            timestamp: block.timestamp,
            isProcessed: false,
            proof: bytes32(0)
        });
        
        tokenBalances[address(0)] += msg.value;
        depositCounter++;
        
        emit Deposit(msg.sender, address(0), msg.value, depositId, block.timestamp);
    }

    /**
     * @dev Deposit ERC20 tokens to Layer2
     * @param token Token contract address
     * @param amount Amount to deposit
     */
    function depositToken(
        address token,
        uint256 amount
    ) external validToken(token) validAmount(amount) whenNotPaused nonReentrant {
        require(supportedTokens[token], "Token not supported");
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        bytes32 depositId = generateDepositId();
        
        deposits[depositId] = DepositInfo({
            user: msg.sender,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            isProcessed: false,
            proof: bytes32(0)
        });
        
        tokenBalances[token] += amount;
        depositCounter++;
        
        emit Deposit(msg.sender, token, amount, depositId, block.timestamp);
    }

    /**
     * @dev Generate deposit proof for Layer2 processing
     * @param depositId Deposit ID
     * @return proof Deposit proof
     */
    function generateDepositProof(
        bytes32 depositId
    ) external onlyLayer2Bridge returns (bytes32 proof) {
        DepositInfo storage deposit = deposits[depositId];
        require(deposit.user != address(0), "Deposit not found");
        require(!deposit.isProcessed, "Deposit already processed");
        
        proof = keccak256(abi.encodePacked(
            depositId,
            deposit.user,
            deposit.token,
            deposit.amount,
            deposit.timestamp
        ));
        
        deposit.proof = proof;
        deposit.isProcessed = true;
        
        emit DepositProofGenerated(depositId, proof, block.timestamp);
        
        return proof;
    }

    /**
     * @dev Complete withdrawal from Layer2
     * @param user User address
     * @param token Token address
     * @param amount Amount to withdraw
     * @param proof Withdrawal proof
     */
    function completeWithdrawal(
        address user,
        address token,
        uint256 amount,
        bytes32 proof
    ) external onlyLayer2Bridge validToken(token) whenNotPaused nonReentrant {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Invalid amount");
        require(proof != bytes32(0), "Invalid proof");
        
        // Verify withdrawal proof
        require(verifyWithdrawalProof(user, token, amount, proof), "Invalid withdrawal proof");
        
        bytes32 withdrawalId = generateWithdrawalId();
        
        withdrawals[withdrawalId] = WithdrawalInfo({
            user: user,
            token: token,
            amount: amount,
            timestamp: block.timestamp,
            isCompleted: true,
            proof: proof
        });
        
        withdrawalCounter++;
        
        // Transfer tokens
        if (token == address(0)) {
            require(address(this).balance >= amount, "Insufficient ETH balance");
            require(tokenBalances[token] >= amount, "Insufficient token balance");
            
            tokenBalances[token] -= amount;
            payable(user).transfer(amount);
        } else {
            require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient token balance");
            require(tokenBalances[token] >= amount, "Insufficient token balance");
            
            tokenBalances[token] -= amount;
            IERC20(token).safeTransfer(user, amount);
        }
        
        emit Withdrawal(user, token, amount, withdrawalId, block.timestamp);
        emit WithdrawalCompleted(withdrawalId, proof, block.timestamp);
    }

    /**
     * @dev Verify withdrawal proof
     * @param user User address
     * @param token Token address
     * @param amount Amount
     * @param proof Proof to verify
     * @return True if valid
     */
    function verifyWithdrawalProof(
        address user,
        address token,
        uint256 amount,
        bytes32 proof
    ) public view returns (bool) {
        bytes32 expectedProof = keccak256(abi.encodePacked(
            user,
            token,
            amount,
            block.timestamp - withdrawalDelay
        ));
        
        return proof == expectedProof;
    }

    /**
     * @dev Get deposit information
     * @param depositId Deposit ID
     * @return Deposit information
     */
    function getDeposit(bytes32 depositId) external view returns (
        address user,
        address token,
        uint256 amount,
        uint256 timestamp,
        bool isProcessed,
        bytes32 proof
    ) {
        DepositInfo memory deposit = deposits[depositId];
        return (
            deposit.user,
            deposit.token,
            deposit.amount,
            deposit.timestamp,
            deposit.isProcessed,
            deposit.proof
        );
    }

    /**
     * @dev Get withdrawal information
     * @param withdrawalId Withdrawal ID
     * @return Withdrawal information
     */
    function getWithdrawal(bytes32 withdrawalId) external view returns (
        address user,
        address token,
        uint256 amount,
        uint256 timestamp,
        bool isCompleted,
        bytes32 proof
    ) {
        WithdrawalInfo memory withdrawal = withdrawals[withdrawalId];
        return (
            withdrawal.user,
            withdrawal.token,
            withdrawal.amount,
            withdrawal.timestamp,
            withdrawal.isCompleted,
            withdrawal.proof
        );
    }

    /**
     * @dev Add supported token
     * @param token Token address
     */
    function addSupportedToken(address token) external onlyOwner validToken(token) {
        require(!supportedTokens[token], "Token already supported");
        
        supportedTokens[token] = true;
        
        emit TokenAdded(token);
    }

    /**
     * @dev Remove supported token
     * @param token Token address
     */
    function removeSupportedToken(address token) external onlyOwner validToken(token) {
        require(supportedTokens[token], "Token not supported");
        
        supportedTokens[token] = false;
        
        emit TokenRemoved(token);
    }

    /**
     * @dev Update Layer2 bridge address
     * @param newLayer2Bridge New Layer2 bridge address
     */
    function updateLayer2Bridge(address newLayer2Bridge) external onlyOwner {
        require(newLayer2Bridge != address(0), "Invalid Layer2 bridge address");
        require(newLayer2Bridge != layer2Bridge, "Same Layer2 bridge address");
        
        address oldLayer2Bridge = layer2Bridge;
        layer2Bridge = newLayer2Bridge;
        
        emit Layer2BridgeUpdated(oldLayer2Bridge, newLayer2Bridge);
    }

    /**
     * @dev Update withdrawal delay
     * @param newWithdrawalDelay New withdrawal delay in seconds
     */
    function updateWithdrawalDelay(uint256 newWithdrawalDelay) external onlyOwner {
        require(newWithdrawalDelay <= MAX_WITHDRAWAL_DELAY, "Withdrawal delay too long");
        require(newWithdrawalDelay != withdrawalDelay, "Same withdrawal delay");
        
        withdrawalDelay = newWithdrawalDelay;
    }

    /**
     * @dev Update deposit limits
     * @param newMinimumDeposit New minimum deposit
     * @param newMaximumDeposit New maximum deposit
     */
    function updateDepositLimits(
        uint256 newMinimumDeposit,
        uint256 newMaximumDeposit
    ) external onlyOwner {
        require(newMinimumDeposit >= MIN_DEPOSIT, "Minimum deposit too low");
        require(newMaximumDeposit <= MAX_DEPOSIT, "Maximum deposit too high");
        require(newMinimumDeposit < newMaximumDeposit, "Invalid deposit limits");
        
        minimumDeposit = newMinimumDeposit;
        maximumDeposit = newMaximumDeposit;
    }

    /**
     * @dev Get contract statistics
     * @return Total deposits, total withdrawals, total ETH balance, total token balance
     */
    function getStats() external view returns (
        uint256 totalDeposits,
        uint256 totalWithdrawals,
        uint256 ethBalance,
        uint256 totalTokenBalance
    ) {
        totalDeposits = depositCounter;
        totalWithdrawals = withdrawalCounter;
        ethBalance = address(this).balance;
        totalTokenBalance = tokenBalances[address(0)];
    }

    /**
     * @dev Get token balance
     * @param token Token address
     * @return Token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalances[token];
    }

    /**
     * @dev Check if token is supported
     * @param token Token address
     * @return True if supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    /**
     * @dev Generate deposit ID
     * @return Deposit ID
     */
    function generateDepositId() internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            depositCounter,
            blockhash(block.number - 1)
        ));
    }

    /**
     * @dev Generate withdrawal ID
     * @return Withdrawal ID
     */
    function generateWithdrawalId() internal view returns (bytes32) {
        return keccak256(abi.encodePacked(
            block.timestamp,
            msg.sender,
            withdrawalCounter,
            blockhash(block.number - 1)
        ));
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
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        if (token == address(0)) {
            require(address(this).balance >= amount, "Insufficient ETH balance");
            payable(owner()).transfer(amount);
        } else {
            require(IERC20(token).balanceOf(address(this)) >= amount, "Insufficient token balance");
            IERC20(token).safeTransfer(owner(), amount);
        }
    }

    // Additional events
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event Layer2BridgeUpdated(address indexed oldBridge, address indexed newBridge);
}
