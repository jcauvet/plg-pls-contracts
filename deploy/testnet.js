module.exports = async ({ getNamedAccounts, deployments, ethers, run }) => {
    const { deploy } = deployments;
    // const { } = await getNamedAccounts();

    const accounts = await ethers.getSigners();
    const deployer = accounts[0].address;

    await deploy("PLS", {
        from: deployer,
        args: [],
        log: true,
    });
    const pls = await ethers.getContract("PLS", deployer);

    await deploy("PLS_Bonus", {
        from: deployer,
        args: [pls.address, "100"],
        log: true,
    });
    const bonus = await ethers.getContract("PLS_Bonus", deployer);

    await deploy("PLSGame", {
        from: deployer,
        args: [pls.address, bonus.address],
        log: true,
    });
    const game = await ethers.getContract("PLSGame", deployer);

    // let tx = await bonus.setPlsGameAdd(game.address);
    // await tx.wait();
    // console.log("=> Game address set in bonus contract");

    // tx = await pls.whitelistAddress([game.address, bonus.address]);
    // await tx.wait();
    // console.log("=> Whitelisted game & bonus addresses");

    try {
        await run("verify:verify", {
            address: pls.address,
            constructorArguments: [],
        });
    } catch (e) {
        console.log("Error verifying token", e.toString());
    }

    try {
        await run("verify:verify", {
            address: bonus.address,
            constructorArguments: [pls.address, "100"],
        });
    } catch (e) {
        console.log("Error verifying bonus", e.toString());
    }

    try {
        await run("verify:verify", {
            address: game.address,
            constructorArguments: [pls.address, bonus.address],
        });
    } catch (e) {
        console.log("Error verifying game", e.toString());
    }
};
module.exports.tags = ["testnet"];
