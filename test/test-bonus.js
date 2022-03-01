const { expect } = require("chai");
const { ethers } = require("hardhat");

const Errors = {
    nonOwner: "Ownable: caller is not the owner",
    unequalArray: "Invalid Data: Unequal arrays",
    maxBonus: "Bonus amount exceeds max permissable bonus",
    noBonus: "No bonus for user",
};

describe("PLS Bonus Tests", function () {
    let bonus;
    let token;
    let accounts;
    before(async () => {
        const Token = await ethers.getContractFactory("PLS");
        token = await Token.deploy();
        await token.deployed();

        const Bonus = await ethers.getContractFactory("PLS_Bonus");
        bonus = await Bonus.deploy(token.address, "100");
        await bonus.deployed();

        let tx = await token.whitelistAddress([bonus.address]);
        await tx.wait();

        tx = await token.transfer(bonus.address, "1000000000");
        await tx.wait();

        accounts = await ethers.getSigners();
    });

    it("Should be able to set max bonus", async () => {
        const tx = await bonus.setMaxBonus("10000");
        await tx.wait();
        const maxBonus = await bonus.maxBonus();
        expect(maxBonus).eq("10000");
    });

    it("Should be able to set max bonus from non-owner account", async () => {
        const tx = bonus.connect(accounts[1]).setMaxBonus("10000");
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Non owners should not be able to add bonuses", async () => {
        const tx = bonus
            .connect(accounts[15])
            .addBonusForUsers(
                [accounts[11].address, accounts[12].address, accounts[13].address],
                ["1000", "1000", "1000"]
            );
        await expect(tx).revertedWith(Errors.nonOwner);
    });

    it("Should not be able to add bonuses with unequal arrays for address & bonus", async () => {
        const tx = bonus.addBonusForUsers(
            [accounts[11].address, accounts[12].address, accounts[13].address],
            ["1000", "1000"]
        );
        await expect(tx).revertedWith(Errors.unequalArray);
    });

    it("Should not be able to add bonuses with bonus more than max bonus", async () => {
        const tx = bonus.addBonusForUsers(
            [accounts[11].address, accounts[12].address, accounts[13].address],
            ["1000", "1000", "11000"]
        );
        await expect(tx).revertedWith(Errors.maxBonus);
    });

    it("Should be able to add bonus for users", async () => {
        let tx = await bonus.addBonusForUsers(
            [accounts[11].address, accounts[12].address, accounts[13].address],
            ["1000", "1000", "1000"]
        );
        await tx.wait();
        tx = await bonus.addBonusForUsers(
            [accounts[11].address, accounts[12].address, accounts[13].address],
            ["1000", "1000", "1000"]
        );
        await tx.wait();
        const token11 = await bonus.userBonus(accounts[11].address);
        const token12 = await bonus.userBonus(accounts[12].address);
        const token13 = await bonus.userBonus(accounts[13].address);
        const token14 = await bonus.userBonus(accounts[14].address);
        expect(token11).eq("2000");
        expect(token12).eq("2000");
        expect(token13).eq("2000");
        expect(token14).eq("0");
    });

    it("Should be able to claim bonus", async () => {
        const balbef = await token.balanceOf(accounts[11].address);
        const tx = await bonus.connect(accounts[11]).claimBonus();
        await tx.wait();
        const bal = await token.balanceOf(accounts[11].address);
        expect(bal.sub(balbef)).eq("2000");
        const bonus11C = await bonus.userBonus(accounts[11].address);
        expect(bonus11C).eq("0");
    });

    it("Should not be able to claim when bonus is 0", async () => {
        const tx = bonus.connect(accounts[11]).claimBonus();
        await expect(tx).revertedWith(Errors.noBonus);
    });

    it("Should be able to withdraw token from contract", async () => {
        const tokenBal = await token.balanceOf(bonus.address);
        const balBef = await token.balanceOf(accounts[0].address);
        const tx = await bonus.withdrawAllToken(token.address);
        await tx.wait();
        const bal = await token.balanceOf(accounts[0].address);
        expect(bal.sub(balBef)).eq(tokenBal);
    });
});
