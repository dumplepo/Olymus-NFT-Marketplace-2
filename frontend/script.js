let provider;
let signer;
let contract;

// Replace with your deployed contract address
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// ABI extracted from GreekMythNFT.sol (minimal version for web interaction)
const CONTRACT_ABI = [
    "function mintNFT(string memory tokenURI) external",
    "function sellNFT(uint256 tokenId, uint256 price) external",
    "function buyNFT(uint256 tokenId) external payable",
    "function sendNFT(uint256 tokenId, address to) external",
    "function getMyNFTs(address user) external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])",
    "function getCollections() external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])"
];

async function connectWallet() {
    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        document.getElementById("walletAddress").innerText = await signer.getAddress();

        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        alert("Wallet connected!");
    } else {
        alert("Please install MetaMask!");
    }
}

async function mintNFT() {
    const uri = document.getElementById("mintURI").value;
    const tx = await contract.mintNFT(uri);
    await tx.wait();
    alert("NFT minted!");
}

async function sellNFT() {
    const tokenId = document.getElementById("sellTokenId").value;
    const price = ethers.parseEther(document.getElementById("sellPrice").value);
    const tx = await contract.sellNFT(tokenId, price);
    await tx.wait();
    alert("NFT listed for sale!");
}

async function buyNFT() {
    const tokenId = document.getElementById("buyTokenId").value;

    // Fetch collections to get price
    const collections = await contract.getCollections();
    const item = collections.find(i => i.tokenId == tokenId);
    if (!item) return alert("NFT not found in collections");
    const price = item.price;

    const tx = await contract.buyNFT(tokenId, { value: price });
    await tx.wait();
    alert("NFT purchased!");
}

async function sendNFT() {
    const tokenId = document.getElementById("sendTokenId").value;
    const to = document.getElementById("sendTo").value;
    const tx = await contract.sendNFT(tokenId, to);
    await tx.wait();
    alert("NFT sent!");
}

async function getMyNFTs() {
    const address = await signer.getAddress();
    const nfts = await contract.getMyNFTs(address);
    document.getElementById("myNFTs").innerText = JSON.stringify(nfts, null, 2);
}

async function getCollections() {
    const nfts = await contract.getCollections();
    document.getElementById("collections").innerText = JSON.stringify(nfts, null, 2);
}

// Event listeners
document.getElementById("connectWallet").onclick = connectWallet;
document.getElementById("mintNFT").onclick = mintNFT;
document.getElementById("sellNFT").onclick = sellNFT;
document.getElementById("buyNFT").onclick = buyNFT;
document.getElementById("sendNFT").onclick = sendNFT;
document.getElementById("getMyNFTs").onclick = getMyNFTs;
document.getElementById("getCollections").onclick = getCollections;
