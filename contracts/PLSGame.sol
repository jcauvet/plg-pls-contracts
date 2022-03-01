// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PLSGame is Ownable {
    using SafeERC20 for ERC20;
    // A - 100
    // B - 200
    // 50 A/B =>

    enum Status {
        Initiated,
        Completed,
        Aborted
    }

    struct Game {
        string gameId;
        address player1;
        address player2;
        bool player1Paid;
        bool player2Paid;
        address winner;
        bool winnerClaimed;
        uint256 deposit; // deposit per user
        uint256 platFee;
        Status status;
    }

    uint256 public platFee = 2000; // 20%
    ERC20 public token;
    address public feeWallet;

    mapping(string => Game) games; // all games
    mapping(string => bool) gameExists; // whether gameId has been used before
    mapping(string => address) refundClaimed; // maintain whether refund was claimed as a separate mapping for optimisation

    constructor(address _token) {
        token = ERC20(_token);
        feeWallet = msg.sender;
    }

    modifier checkGameExists(string memory gameId) {
        require(gameExists[gameId], "Game does not exist");
        _;
    }

    // Start a new game
    function addGame(
        string calldata gameId,
        address player1,
        address player2,
        uint256 deposit
    ) external onlyOwner {
        require(!gameExists[gameId], "Repeated Game ID");

        gameExists[gameId] = true;
        games[gameId] = Game({
            gameId: gameId,
            player1: player1,
            player2: player2,
            player1Paid: false,
            player2Paid: false,
            winner: address(0),
            winnerClaimed: false,
            deposit: deposit,
            platFee: platFee,
            status: Status.Initiated
        });
    }

    // Deposit tokens for a game to escrow
    function depositForGame(string calldata gameId) external checkGameExists(gameId) {
        Game storage game = games[gameId];
        require(game.status == Status.Initiated, "Game not in initial state");
        require(game.player1 == msg.sender || game.player2 == msg.sender, "Player not part of game");
        if (msg.sender == game.player1) {
            require(!game.player1Paid, "Deposited already");
            game.player1Paid = true;
        } else if (msg.sender == game.player2) {
            require(!game.player2Paid, "Deposited already");
            game.player2Paid = true;
        }
        token.safeTransferFrom(msg.sender, address(this), game.deposit);
    }

    // Update result for game
    function markGameComplete(string calldata gameId, address winner) external onlyOwner checkGameExists(gameId) {
        Game storage game = games[gameId];
        require(game.status == Status.Initiated, "Game not in initial state");
        require(winner == game.player1 || winner == game.player2, "Winner address is not a participant");
        require(game.player1Paid && game.player2Paid, "Cannot update final state when payments were incomplete");
        game.status = Status.Completed;
        game.winner = winner;
    }

    function claimWinnerMoney(string calldata gameId) external checkGameExists(gameId) {
        Game storage game = games[gameId];
        require(game.status == Status.Completed, "Game not in completed state");
        require(!game.winnerClaimed, "Winner money already claimed");
        game.winnerClaimed = true;
        uint256 totalGamePrize = 2 * game.deposit;
        uint256 platFeeAmt = (totalGamePrize * game.platFee) / 10000;
        token.safeTransfer(game.winner, totalGamePrize - platFeeAmt);
        token.safeTransfer(feeWallet, platFeeAmt);
    }

    // End game with mutual quit
    function markGameForMutualQuit(string calldata gameId) external onlyOwner checkGameExists(gameId) {
        Game storage game = games[gameId];
        require(game.status == Status.Initiated, "Game not in initial state");
        require(game.player1Paid && game.player2Paid, "Cannot update final state when payments were incomplete");
        game.status = Status.Aborted;
    }

    // Claim money f

    // Set value for platform fees
    function setPlatfee(uint256 _platFee) external onlyOwner {
        platFee = _platFee;
    }

    // Set address for fee wallet
    function setFeeWallet(address _feeWallet) external onlyOwner {
        feeWallet = _feeWallet;
    }
}
