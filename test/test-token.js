const { expect } = require("chai");
const { ethers } = require("hardhat");

const Errors = {
    nonOwner: "Ownable: caller is not the owner",
};

describe("PLS Token Tests", function () {
    let token;
    let accounts;
    let taxWallet;
    before(async () => {
        const Token = await ethers.getContractFactory("PLS");
        token = await Token.deploy();
        await token.deployed();

        accounts = await ethers.getSigners();
    });

    it("Should be able to retrieve name, symbol, decimals", async () => {
        const name = await token.name();
        const symbol = await token.symbol();
        const decimal = await token.decimals();
        expect(name).eq("Planet League Stars");
        expect(symbol).eq("PLS");
        expect(decimal).eq(18);
    });

    it("Should be able to set tax percentage (10%)", async () => {
        const tx = await token.setTaxPercent("1000");
        await tx.wait();
        const perc = await token.taxPerc();
        expect(perc).eq("1000");
    });

    it("Non owners should not be able to set tax percentage (10%)", async () => {
        const tx = token.connect(accounts[1]).setTaxPercent("1000");
        await expect(tx).revertedWith(Errors.nonOwner);
        // const perc = await token.taxPerc();
        // expect(perc).eq("1000");
    });

    it("Should be able to set tax wallet (accounts[1])", async () => {
        const tx = await token.setTaxWallet(accounts[1].address);
        await tx.wait();
        const perc = await token.taxWallet();
        taxWallet = perc;
        expect(perc).eq(accounts[1].address);
    });

    it("Non owners should not be able to set tax wallet (accounts[1])", async () => {
        const tx = token.connect(accounts[1]).setTaxWallet(accounts[1].address);
        await expect(tx).revertedWith(Errors.nonOwner);
        // const perc = await token.taxWallet();
        // taxWallet = perc;
        // expect(perc).eq(accounts[1].address);
    });

    it("Should be able to whitelist wallets (accounts 5,6,7)", async () => {
        const tx = await token.whitelistAddress([accounts[5].address, accounts[6].address, accounts[7].address]);
        await tx.wait();
        const isExcluded5 = await token.isExcluded(accounts[5].address);
        const isExcluded6 = await token.isExcluded(accounts[6].address);
        const isExcluded7 = await token.isExcluded(accounts[7].address);
        const isExcluded8 = await token.isExcluded(accounts[8].address);
        const isExcluded9 = await token.isExcluded(accounts[9].address);
        expect(isExcluded5).eq(true);
        expect(isExcluded6).eq(true);
        expect(isExcluded7).eq(true);
        expect(isExcluded8).eq(!true);
        expect(isExcluded9).eq(!true);
    });

    it("Non owners should be able to whitelist wallets (accounts 5,6,7)", async () => {
        const tx = token
            .connect(accounts[1])
            .whitelistAddress([accounts[5].address, accounts[6].address, accounts[7].address]);
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Should be able to un-whitelist wallets (accounts 7)", async () => {
        const tx = await token.unWhitelistAddress([accounts[7].address]);
        await tx.wait();
        const isExcluded5 = await token.isExcluded(accounts[5].address);
        const isExcluded6 = await token.isExcluded(accounts[6].address);
        const isExcluded7 = await token.isExcluded(accounts[7].address);
        const isExcluded8 = await token.isExcluded(accounts[8].address);
        const isExcluded9 = await token.isExcluded(accounts[9].address);
        expect(isExcluded5).eq(true);
        expect(isExcluded6).eq(true);
        expect(isExcluded7).eq(!true);
        expect(isExcluded8).eq(!true);
        expect(isExcluded9).eq(!true);
    });

    it("Non Owners should not  be able to un-whitelist wallets (accounts 7)", async () => {
        const tx = token.connect(accounts[2]).unWhitelistAddress([accounts[7].address]);
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Transfer to whitelisted wallets (2->5) should not charge tax", async () => {
        let tx = await token.transfer(accounts[2].address, "1000");
        await tx.wait();

        const balAcc5bef = await token.balanceOf(accounts[5].address);
        const balTaxWalBef = await token.balanceOf(taxWallet);
        tx = await token.connect(accounts[2]).transfer(accounts[5].address, "1000");
        await tx.wait();
        const balAcc5 = await token.balanceOf(accounts[5].address);
        const balTaxWal = await token.balanceOf(taxWallet);

        expect(balAcc5.sub(balAcc5bef)).eq("1000");
        expect(balTaxWal.sub(balTaxWalBef)).eq("0");
    });

    it("Transfer from whitelisted wallets (5->2) should not charge tax", async () => {
        let tx = await token.transfer(accounts[5].address, "1000");
        await tx.wait();

        const balAcc2bef = await token.balanceOf(accounts[2].address);
        const balTaxWalBef = await token.balanceOf(taxWallet);
        tx = await token.connect(accounts[5]).transfer(accounts[2].address, "1000");
        await tx.wait();
        const balAcc2 = await token.balanceOf(accounts[5].address);
        const balTaxWal = await token.balanceOf(taxWallet);

        expect(balAcc2.sub(balAcc2bef)).eq("1000");
        expect(balTaxWal.sub(balTaxWalBef)).eq("0");
    });

    it("Transfer b/w normal wallets (2->3) should charge tax", async () => {
        let tx = await token.transfer(accounts[2].address, "1000");
        await tx.wait();

        const balAcc3bef = await token.balanceOf(accounts[3].address);
        const balTaxWalBef = await token.balanceOf(taxWallet);
        tx = await token.connect(accounts[2]).transfer(accounts[3].address, "1000");
        await tx.wait();
        const balAcc3 = await token.balanceOf(accounts[3].address);
        const balTaxWal = await token.balanceOf(taxWallet);

        expect(balAcc3.sub(balAcc3bef)).eq("900");
        expect(balTaxWal.sub(balTaxWalBef)).eq("100");
    });

    it("TransferFrom to whitelisted wallets (2->5) should not charge tax", async () => {
        let tx = await token.connect(accounts[2]).approve(accounts[11].address, "1000");
        await tx.wait();

        const balAcc5bef = await token.balanceOf(accounts[5].address);
        const balTaxWalBef = await token.balanceOf(taxWallet);
        tx = await token.connect(accounts[11]).transferFrom(accounts[2].address, accounts[5].address, "1000");
        await tx.wait();
        const balAcc5 = await token.balanceOf(accounts[5].address);
        const balTaxWal = await token.balanceOf(taxWallet);

        expect(balAcc5.sub(balAcc5bef)).eq("1000");
        expect(balTaxWal.sub(balTaxWalBef)).eq("0");
    });

    it("TransferFrom from whitelisted wallets (5->2) should not charge tax", async () => {
        let tx = await token.connect(accounts[5]).approve(accounts[11].address, "1000");
        await tx.wait();

        const balAcc2bef = await token.balanceOf(accounts[2].address);
        const balTaxWalBef = await token.balanceOf(taxWallet);
        tx = await token.connect(accounts[11]).transferFrom(accounts[5].address, accounts[2].address, "1000");
        await tx.wait();
        const balAcc2 = await token.balanceOf(accounts[5].address);
        const balTaxWal = await token.balanceOf(taxWallet);

        expect(balAcc2.sub(balAcc2bef)).eq("1000");
        expect(balTaxWal.sub(balTaxWalBef)).eq("0");
    });

    it("TransferFrom b/w normal wallets (2->3) should charge tax", async () => {
        let tx = await token.connect(accounts[2]).approve(accounts[11].address, "1000");
        await tx.wait();

        const balAcc3bef = await token.balanceOf(accounts[3].address);
        const balTaxWalBef = await token.balanceOf(taxWallet);
        tx = await token.connect(accounts[11]).transferFrom(accounts[2].address, accounts[3].address, "1000");
        await tx.wait();
        const balAcc3 = await token.balanceOf(accounts[3].address);
        const balTaxWal = await token.balanceOf(taxWallet);

        expect(balAcc3.sub(balAcc3bef)).eq("900");
        expect(balTaxWal.sub(balTaxWalBef)).eq("100");
    });
});
