let provider;
let signer;
let contract;

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // replace with your deployed contract
const CONTRACT_ABI = [
    "function mintNFT(string memory tokenURI) external",
    "function sellNFT(uint256 tokenId, uint256 price) external",
    "function buyNFT(uint256 tokenId) external payable",
    "function sendNFT(uint256 tokenId, address to) external",
    "function getMyNFTs(address user) external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])",
    "function getCollections() external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])",
    "function ownerOf(uint256 tokenId) view returns (address)"
];

let userAddress;

window.onload = () => {
    document.getElementById("connectWallet").onclick = connectWallet;
    document.getElementById("mintNFT").onclick = mintNFT;
};

// Connect wallet
async function connectWallet() {
    if (typeof ethers === "undefined") {
        alert("Ethers.js not loaded! Check your CDN.");
        return;
    }

    if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        document.getElementById("walletAddress").innerText = `Connected: ${userAddress}`;
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        await displayMyNFTs();
        await displayCollections();
    } else {
        alert("Please install MetaMask!");
    }
}

// Mint NFT
async function mintNFT() {
    const uri = document.getElementById("mintURI").value;
    if (!uri) return alert("Enter Token URI!");
    const tx = await contract.mintNFT(uri);
    await tx.wait();
    alert("NFT minted!");
    await displayMyNFTs();
    await displayCollections();
}

// Buy NFT
async function buyNFT(tokenId, price) {
    const tx = await contract.buyNFT(tokenId, { value: price });
    await tx.wait();
    alert("NFT purchased!");
    await displayCollections();
    await displayMyNFTs();
}

// Send NFT
async function sendNFT(tokenId) {
    const to = prompt("Enter recipient address:");
    if (!to) return;
    const tx = await contract.sendNFT(tokenId, to);
    await tx.wait();
    alert("NFT sent!");
    await displayMyNFTs();
    await displayCollections();
}

// Sell NFT
async function sellNFT(tokenId) {
    const price = prompt("Enter price in ETH:");
    if (!price) return;
    const tx = await contract.sellNFT(tokenId, ethers.parseEther(price));
    await tx.wait();
    alert("NFT listed for sale!");
    await displayMyNFTs();
    await displayCollections();
}

// Render NFT card
function createNFTCard(nft, isOwnerView = false) {
    const card = document.createElement("div");
    card.className = "nft-card";

    if (nft.owner.toLowerCase() === userAddress.toLowerCase()) {
        card.style.border = "2px solid #4CAF50";
    }

    card.innerHTML = `
        <img src="${nft.tokenURI || ''}" alt="NFT Image">
        <p><strong>Token ID:</strong> ${nft.tokenId}</p>
        <p><strong>Creator:</strong> ${nft.creator}</p>
        <p><strong>Owner:</strong> ${nft.owner}</p>
        <p><strong>Price:</strong> ${nft.forSale ? ethers.formatEther(nft.price) + ' ETH' : 'Not for sale'}</p>
    `;

    if (isOwnerView) {
        const sellBtn = document.createElement("button");
        sellBtn.innerText = "Sell";
        sellBtn.onclick = () => sellNFT(nft.tokenId);
        card.appendChild(sellBtn);

        const sendBtn = document.createElement("button");
        sendBtn.innerText = "Send";
        sendBtn.onclick = () => sendNFT(nft.tokenId);
        card.appendChild(sendBtn);
    } else if (nft.forSale) {
        const buyBtn = document.createElement("button");
        buyBtn.innerText = "Buy";
        buyBtn.onclick = () => buyNFT(nft.tokenId, nft.price);
        card.appendChild(buyBtn);
    }

    return card;
}

// Display user's NFTs
async function displayMyNFTs() {
    const container = document.getElementById("myNFTs");
    container.innerHTML = "";
    const nfts = await contract.getMyNFTs(userAddress);
    nfts.forEach(nft => container.appendChild(createNFTCard(nft, true)));
}

// Display collection
async function displayCollections() {
    const container = document.getElementById("collections");
    container.innerHTML = "";
    const nfts = await contract.getCollections();
    nfts.forEach(nft => container.appendChild(createNFTCard(nft, false)));
}
