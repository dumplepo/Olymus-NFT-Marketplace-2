const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Get contract factory
  const GreekMythNFT = await hre.ethers.getContractFactory("GreekMythNFT");

  // Deploy contract (ethers v6 style)
  const nft = await GreekMythNFT.deploy();

  // Wait for deployment to be mined
  await nft.waitForDeployment(); // ethers v6 replacement for .deployed()

  console.log("GreekMythNFT deployed to:", nft.target); // ethers v6 uses .target
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
