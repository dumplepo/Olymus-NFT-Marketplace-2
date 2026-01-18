async function main() {
  const NFT = await ethers.getContractFactory("GreekMythNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();

  console.log("GreekMythNFT deployed to:", await nft.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
