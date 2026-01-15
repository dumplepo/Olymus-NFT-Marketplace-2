async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const GreekMythNFT = await ethers.getContractFactory("GreekMythNFT");
    const nft = await GreekMythNFT.deploy();
    await nft.deployed();

    console.log("GreekMythNFT deployed to:", nft.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
