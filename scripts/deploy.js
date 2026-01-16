const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const GreekMythNFT = await hre.ethers.getContractFactory("GreekMythNFT");
  const nft = await GreekMythNFT.deploy();

  // ethers v6 style
  await nft.waitForDeployment();

  console.log("GreekMythNFT deployed to:", nft.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
