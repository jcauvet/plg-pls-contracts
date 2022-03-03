const { expect } = require("chai");
const { ethers } = require("hardhat");

const Errors = {
    nonOwner: "Ownable: caller is not the owner",
    repeatGameId: "Repeated Game ID",
    notParticipant: "Winner address is not a participant",
    gameInitialState: "Game not in initial state",
    gameNotExist: "Game does not exist",
    lowBal: "Insufficient Balance",
    lowBalPl1: "Insufficient Balance:Player 1",
    lowBalPl2: "Insufficient Balance:Player 2",
    notBonusAcc: "Caller not bonus contract",
};

describe("PLS Game Tests", function () {
    let game;
    let bonus;
    let token;
    let accounts;
    let feeWallet;
    before(async () => {
        const Token = await ethers.getContractFactory("PLS");
        token = await Token.deploy();
        await token.deployed();

        const Bonus = await ethers.getContractFactory("PLS_Bonus");
        bonus = await Bonus.deploy(token.address, "100");
        await bonus.deployed();

        const PLSGame = await ethers.getContractFactory("PLSGame");
        game = await PLSGame.deploy(token.address, bonus.address);
        await game.deployed();

        let tx = await token.whitelistAddress([game.address]);
        await tx.wait();

        accounts = await ethers.getSigners();

        for (let i = 2; i <= 10; i++) {
            tx = await token.transfer(accounts[i].address, "1000000000");
            await tx.wait();

            tx = await token.connect(accounts[i]).approve(game.address, "100000000000000000");
            await tx.wait();
        }

        // tx = await token.transfer(accounts[2].address, "1000000000");
        // await tx.wait();

        // tx = await token.connect(accounts[2]).approve(game.address, "100000000000000000");
        // await tx.wait();
    });

    // Set Platform Fee
    it("Should be able to set platform fee (5%)", async () => {
        const tx = await game.setPlatfee("500");
        await tx.wait();
        const platFee = await game.platFee();
        expect(platFee).eq("500");
    });

    it("Non Owner should not be able to set platform fee (5%)", async () => {
        const tx = game.connect(accounts[1]).setPlatfee("500");
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    // Set fee wallet
    it("Should be able to set feeWallet (account[1])", async () => {
        const tx = await game.setFeeWallet(accounts[1].address);
        await tx.wait();
        const feeWalletC = await game.feeWallet();
        feeWallet = feeWalletC;
        expect(feeWallet).eq(accounts[1].address);
    });

    it("Non Owner should not be able to set feeWallet fee", async () => {
        const tx = game.connect(accounts[1]).setFeeWallet(accounts[1].address);
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    // Set Bonus Contract Address
    it("Non Owner should not be able to set bonus contract address", async () => {
        const tx = game.connect(accounts[1]).setBonusAddress(accounts[1].address);
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Should be able to set address for bonus contract", async () => {
        let tx = await game.setBonusAddress(accounts[2].address);
        await tx.wait();
        const setAdd = await game.plsBonus();
        expect(setAdd).eq(accounts[2].address);
        tx = await game.setBonusAddress(bonus.address);
        await tx.wait();
    });

    // Deposit Bonus For User
    it("Should not allow other addresses to call depositBonusForUser", async () => {
        const tx = game.depositBonusForUser(accounts[1].address, "10000");
        await expect(tx).revertedWith(Errors.notBonusAcc);
    });

    // Deposit / Withdraw Money
    it("Should be able to deposit money", async () => {
        const balBef = await game.wallet(accounts[2].address);
        const tx = await game.connect(accounts[2]).depositToken("10000");
        await tx.wait();
        const bal = await game.wallet(accounts[2].address);
        expect(bal.sub(balBef)).eq("10000");
    });

    it("Should be able to withdraw money", async () => {
        const balBefVir = await game.wallet(accounts[2].address);
        const balBefMain = await token.balanceOf(accounts[2].address);
        const tx = await game.connect(accounts[2]).withdrawToken("100");
        await tx.wait();
        const balVir = await game.wallet(accounts[2].address);
        const balMain = await token.balanceOf(accounts[2].address);
        expect(balBefVir.sub(balVir)).eq("100");
        expect(balMain.sub(balBefMain)).eq("100");
    });

    it("Should not be able to withdraw more than balance", async () => {
        const amt = await game.wallet(accounts[2].address);
        const tx = game.withdrawToken(amt.add("1"));
        await expect(tx).revertedWith(Errors.lowBal);
    });

    // Game Start
    it("Non owner should not be able to start game", async () => {
        const tx = game.connect(accounts[1]).addGame("1", accounts[1].address, accounts[2].address, "100");
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Should be able to start game", async () => {
        let tx = await game.connect(accounts[5]).depositToken("100000");
        await tx.wait();
        tx = await game.connect(accounts[6]).depositToken("100000");
        await tx.wait();

        const player1 = accounts[5].address;
        const player2 = accounts[6].address;
        const deposit = "100000";
        const gameId = "game1";
        const player1WallOld = await game.wallet(player1);
        const player2WallOld = await game.wallet(player2);

        tx = await game.addGame(gameId, player1, player2, deposit);
        await tx.wait();

        const player1Wall = await game.wallet(player1);
        const player2Wall = await game.wallet(player2);

        expect(player1WallOld.sub(player1Wall)).eq("100000");
        expect(player2WallOld.sub(player2Wall)).eq("100000");
    });

    it("Should not be able to start game with same game id again", async () => {
        const player1 = accounts[5].address;
        const player2 = accounts[6].address;
        const deposit = "100000";
        const gameId = "game1";

        const tx = game.addGame(gameId, player1, player2, deposit);
        await expect(tx).revertedWith(Errors.repeatGameId);
    });

    it("Should not be able to start game if user accounts don't have balances", async () => {
        let tx = await game.connect(accounts[5]).depositToken("1000000");
        await tx.wait();
        tx = await game.connect(accounts[6]).depositToken("100000");
        await tx.wait();
        const player1 = accounts[5].address;
        const player2 = accounts[6].address;
        const gameId = "gameBals";
        const player1WallOld = await game.wallet(player1);
        const player2WallOld = await game.wallet(player2);

        tx = game.addGame(gameId, player1, player2, player1WallOld.add("1"));
        await expect(tx).revertedWith(Errors.lowBalPl1);

        tx = game.addGame(gameId, player1, player2, player2WallOld.add("1"));
        await expect(tx).revertedWith(Errors.lowBalPl2);
    });

    // MARK GAME AS COMPLETE
    it("Non owner should not be able to mark game as complete", async () => {
        const tx = game.connect(accounts[1]).markGameComplete("game1", accounts[1].address);
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Should not be able to mark game as complete if gameId was invalid", async () => {
        const tx = game.markGameComplete("game23456765432", accounts[1].address);
        await expect(tx).revertedWith(Errors.gameNotExist);
    });

    it("Should not be able to mark non-player as a winner", async () => {
        const tx = game.markGameComplete("game1", accounts[1].address);
        await expect(tx).revertedWith(Errors.notParticipant);
    });

    it("Should be able to mark game as complete", async () => {
        const feeWalletBalOld = await token.balanceOf(feeWallet);
        const player1WallOld = await game.wallet(accounts[5].address);
        const tx = await game.markGameComplete("game1", accounts[5].address);
        await tx.wait();
        const player1Wall = await game.wallet(accounts[5].address);
        const feeWalletBal = await token.balanceOf(feeWallet);

        const { winner, platFee, deposit, status } = await game.games("game1");
        expect(winner).eq(accounts[5].address);
        expect(player1Wall.sub(player1WallOld)).eq(
            deposit
                .mul(10000 - platFee)
                .mul(2)
                .div(10000)
        );
        expect(status).eq(1);
        expect(feeWalletBal.sub(feeWalletBalOld)).eq(deposit.mul(platFee).mul(2).div(10000));
    });

    it("Should not be able to mark game as complete again once done", async () => {
        const tx = game.markGameComplete("game1", accounts[5].address);
        await expect(tx).revertedWith(Errors.gameInitialState);
    });

    // MUTUAL QUIT

    it("Non owner should not be able to mark game as mutualquit", async () => {
        const tx = game.connect(accounts[1]).markGameForMutualQuit("game1");
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Should not be able to mark game as mutualquit if gameId was invalid", async () => {
        const tx = game.markGameForMutualQuit("game98765");
        await expect(tx).revertedWith(Errors.gameNotExist);
    });

    it("Should not be able to mark game as mutualquit if it was completed before", async () => {
        const tx = game.markGameForMutualQuit("game1");
        await expect(tx).revertedWith(Errors.gameInitialState);
    });

    it("Should be able to mark a game for mutual quit", async () => {
        let tx = await game.connect(accounts[5]).depositToken("100000");
        await tx.wait();
        tx = await game.connect(accounts[6]).depositToken("100000");
        await tx.wait();

        const player1 = accounts[5].address;
        const player2 = accounts[6].address;
        const deposit = "100000";
        const gameId = "gameMutualQuit";
        const player1WallOld = await game.wallet(player1);
        const player2WallOld = await game.wallet(player2);

        tx = await game.addGame(gameId, player1, player2, deposit);
        await tx.wait();

        tx = await game.markGameForMutualQuit(gameId);
        await tx.wait();

        const player1Wall = await game.wallet(player1);
        const player2Wall = await game.wallet(player2);
        const { status } = await game.games("gameMutualQuit");
        expect(status).eq(2);
        expect(player1WallOld.sub(player1Wall)).eq("0");
        expect(player2WallOld.sub(player2Wall)).eq("0");
    });
});
