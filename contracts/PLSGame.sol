// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PLSGame is Ownable {
    using SafeERC20 for ERC20;

    enum Status {
        Initiated,
        Completed,
        Aborted
    }
    // Initiated : Game started, players money in escrow
    // Completed: Game completed (Win/Loss)
    // Aborted: Game ended by mutual quit

    // Game Data Structure
    struct Game {
        string gameId;
        address player1;
        address player2;
        address winner;
        uint256 deposit; // deposit per user
        uint256 platFee;
        Status status;
    }

    uint256 public platFee = 2000; // 20%
    ERC20 public token; // game currency token
    address public feeWallet; // Wallet which receives earnings from game
    address public plsBonus;

    mapping(address => uint256) public wallet; // User's virtual wallets
    mapping(string => Game) public games; // all games
    mapping(string => bool) public gameExists; // whether gameId has been used before
    mapping(string => address) public refundClaimed; // maintain whether refund was claimed as a separate mapping for optimisation

    constructor(address _token, address _plsBonus) {
        token = ERC20(_token);
        feeWallet = msg.sender;
        plsBonus = _plsBonus;
    }

    modifier checkGameExists(string memory gameId) {
        require(gameExists[gameId], "Game does not exist");
        _;
    }

    modifier onlyBonusContract() {
        require(msg.sender == plsBonus, "Caller not bonus contract");
        _;
    }

    function depositBonusForUser(address user, uint256 amt) external onlyBonusContract {
        wallet[user] += amt;
    }

    // Deposit tokens to user's virtual wallet
    function depositToken(uint256 amt) external {
        wallet[msg.sender] += amt;
        token.safeTransferFrom(msg.sender, address(this), amt);
    }

    // Withdraw funds from user's virtual wallet
    function withdrawToken(uint256 amt) external {
        require(amt <= wallet[msg.sender], "Insufficient Balance");
        wallet[msg.sender] -= amt;
        token.safeTransfer(msg.sender, amt);
    }

    // Start a new game
    function addGame(
        string calldata gameId,
        address player1,
        address player2,
        uint256 deposit
    ) external onlyOwner {
        require(!gameExists[gameId], "Repeated Game ID");
        require(deposit <= wallet[player1], "Insufficient Balance:Player 1");
        require(deposit <= wallet[player2], "Insufficient Balance:Player 2");
        // Put user's money in escrow
        wallet[player1] -= deposit;
        wallet[player2] -= deposit;
        // Create entry for game
        gameExists[gameId] = true;
        games[gameId] = Game({
            gameId: gameId,
            player1: player1,
            player2: player2,
            winner: address(0),
            deposit: deposit,
            platFee: platFee,
            status: Status.Initiated
        });
    }

    // Update winner for game. Transfer money to admin wallet & user's admin wallet
    function markGameComplete(string calldata gameId, address winner) external onlyOwner checkGameExists(gameId) {
        Game storage game = games[gameId];
        require(game.status == Status.Initiated, "Game not in initial state");
        require(winner == game.player1 || winner == game.player2, "Winner address is not a participant");
        // Update game status
        game.status = Status.Completed;
        game.winner = winner;
        // Distribute money
        uint256 totalGamePrize = 2 * game.deposit;
        uint256 platFeeAmt = (totalGamePrize * game.platFee) / 10000;
        wallet[winner] += totalGamePrize - platFeeAmt;
        // Transfer fee to platform wallet
        token.safeTransfer(feeWallet, platFeeAmt);
    }

    // End game with mutual quit. Refund balances to virtual wallets
    function markGameForMutualQuit(string calldata gameId) external onlyOwner checkGameExists(gameId) {
        Game storage game = games[gameId];
        require(game.status == Status.Initiated, "Game not in initial state");
        game.status = Status.Aborted;
        // Refund balances to user
        // TODO: Do we take a platform fee ?
        wallet[game.player1] += game.deposit;
        wallet[game.player2] += game.deposit;
    }

    // Set value for platform fees
    function setPlatfee(uint256 _platFee) external onlyOwner {
        platFee = _platFee;
    }

    // Set address for fee wallet
    function setFeeWallet(address _feeWallet) external onlyOwner {
        feeWallet = _feeWallet;
    }

    // Set address for bonus contract
    function setBonusAddress(address _plsBonus) external onlyOwner {
        plsBonus = _plsBonus;
    }
}

// UNUSED CODE POST CHANGE IN FLOW. TO BE REMOVED LATER
// function claimWinnerMoney(string calldata gameId) external checkGameExists(gameId) {
//     Game storage game = games[gameId];
//     require(game.status == Status.Completed, "Game not in completed state");
//     require(!game.winnerClaimed, "Winner money already claimed");
//     game.winnerClaimed = true;
//     uint256 totalGamePrize = 2 * game.deposit;
//     uint256 platFeeAmt = (totalGamePrize * game.platFee) / 10000;
//     token.safeTransfer(game.winner, totalGamePrize - platFeeAmt);
//     token.safeTransfer(feeWallet, platFeeAmt);
// }

// Deposit tokens for a game to escrow
// function depositForGame(string calldata gameId) external checkGameExists(gameId) {
//     Game storage game = games[gameId];
//     require(game.status == Status.Initiated, "Game not in initial state");
//     require(game.player1 == msg.sender || game.player2 == msg.sender, "Player not part of game");
//     if (msg.sender == game.player1) {
//         require(!game.player1Paid, "Deposited already");
//         game.player1Paid = true;
//     } else if (msg.sender == game.player2) {
//         require(!game.player2Paid, "Deposited already");
//         game.player2Paid = true;
//     }
//     token.safeTransferFrom(msg.sender, address(this), game.deposit);
// }
