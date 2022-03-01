const { expect } = require("chai");
const { ethers } = require("hardhat");

const Errors = {
    nonOwner: "Ownable: caller is not the owner",
};

describe("PLS Game Tests", function () {
    let game;
    let token;
    let accounts;
    let feeWallet;
    before(async () => {
        const Token = await ethers.getContractFactory("PLS");
        token = await Token.deploy();
        await token.deployed();

        const PLSGame = await ethers.getContractFactory("PLSGame");
        game = await PLSGame.deploy(token.address);
        await game.deployed();

        const tx = await token.whitelistAddress([game.address]);
        await tx.wait();

        accounts = await ethers.getSigners();
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

    // Game Start
    it("Non owner should not be able to start game", async () => {
        const tx = game.connect(accounts[1]).addGame("1", accounts[1].address, accounts[2].address, "100");
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it.skip("Should be able to start game");

    it.skip("Should not be able to start game with same game id again");

    // DEPOSIT MONEY
    it.skip("Non players should not be able to deposit money");

    it.skip("Should be able to deposit money by both players");

    it.skip("Should not be able to deposit money again");

    // MARK GAME AS COMPLETE
    it.skip("Non owner should not be able to mark game as complete");

    it.skip("Should not be able to mark non-player as a winner");

    it.skip("Should be able to mark game as complete");

    it.skip("Should not be able to mark game as complete again once done");

    it.skip("Winner should be able to claim his money");
});
