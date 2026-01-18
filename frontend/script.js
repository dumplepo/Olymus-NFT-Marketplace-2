let provider;
let signer;
let contract;

const mintURIInput = document.getElementById("mintURI");
const mintPreview = document.getElementById("mintPreview");

// Show preview when user types/pastes URI
mintURIInput.addEventListener("input", () => {
    const uri = mintURIInput.value.trim();
    if (uri) {
        mintPreview.src = uri;
        mintPreview.style.display = "block";
    } else {
        mintPreview.style.display = "none";
    }
});



const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // replace with your deployed contract
const CONTRACT_ABI = [
    "function mintNFT(string tokenURI) external",
    "function sellNFT(uint256 tokenId, uint256 price) external",
    "function buyNFT(uint256 tokenId) external payable",
    "function sendNFT(uint256 tokenId, address to) external",
    "function getMyNFTs(address user) external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])",
    "function getCollections() external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function cancelSale(uint256 tokenId) external"
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
    const uri = mintURIInput.value.trim();
    if (!uri) return alert("Please enter a Token URI (image URL)");

    try {
        // Mint NFT
        const tx = await contract.mintNFT(uri);
        await tx.wait();

        alert("NFT minted successfully!");

        // Clear input and hide preview
        mintURIInput.value = "";
        mintPreview.style.display = "none";

        // Refresh NFTs and collections
        await displayMyNFTs();
        await displayCollections();
    } catch (err) {
        console.error(err);
        alert("Failed to mint NFT. Check console for details.");
    }
}

// Buy NFT
async function buyNFT(tokenId, price) {
    try {
        const tx = await contract.buyNFT(tokenId, { value: price });
        await tx.wait();

        alert(`NFT #${tokenId} purchased successfully!`);

        // Refresh both sections
        await displayCollections();
        await displayMyNFTs();
    } catch (err) {
        console.error(err);
        alert("Failed to buy NFT. Check console for details.");
    }
}

// Send NFT
async function sendNFT(tokenId) {
    try {
        // Ask for recipient address
        const to = prompt("Enter recipient wallet address:");
        if (!to) return; // exit if cancelled

        // Call smart contract
        const tx = await contract.sendNFT(tokenId, to);
        await tx.wait();

        alert(`NFT #${tokenId} sent to ${to} successfully!`);

        // Refresh UI
        await displayMyNFTs();
        await displayCollections();
    } catch (err) {
        console.error(err);
        alert("Failed to send NFT. Check console for details.");
    }
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

// Render NFT card with enhanced Sell logic and For Sale badge
function createNFTCard(nft, isOwnerView = false) {
    const card = document.createElement("div");
    card.className = "nft-card";

    const isOwner = nft.owner.toLowerCase() === userAddress.toLowerCase();

    card.innerHTML = `
        <img src="${nft.tokenURI || ''}" alt="NFT Image">
        <p><strong>Token ID:</strong> ${nft.tokenId}</p>
        <p><strong>Creator:</strong> ${nft.creator}</p>
        <p><strong>Owner:</strong> ${nft.owner}</p>
        <p>
            <strong>Status:</strong>
            ${nft.forSale ? `For Sale (${ethers.formatEther(nft.price)} ETH)` : "Not for sale"}
        </p>
    `;

    // -------------------------
    // MY NFTs SECTION
    // -------------------------
    if (isOwnerView) {
        if (!nft.forSale) {
            const sellBtn = document.createElement("button");
            sellBtn.innerText = "Sell";
            sellBtn.onclick = () => sellNFT(nft.tokenId);
            card.appendChild(sellBtn);
        } else {
            const cancelBtn = document.createElement("button");
            cancelBtn.innerText = "Cancel";
            cancelBtn.onclick = () => cancelSale(nft.tokenId);
            card.appendChild(cancelBtn);
        }

        const sendBtn = document.createElement("button");
        sendBtn.innerText = "Send";
        sendBtn.onclick = () => sendNFT(nft.tokenId);
        card.appendChild(sendBtn);
    }

    // -------------------------
    // COLLECTION SECTION
    // -------------------------
    else if (nft.forSale) {
        if (isOwner) {
            const cancelBtn = document.createElement("button");
            cancelBtn.innerText = "Cancel";
            cancelBtn.onclick = () => cancelSale(nft.tokenId);
            card.appendChild(cancelBtn);
        } else {
            const buyBtn = document.createElement("button");
            buyBtn.innerText = "Buy";
            buyBtn.onclick = () => buyNFT(nft.tokenId, nft.price);
            card.appendChild(buyBtn);
        }
    }

    return card;
}

// Display user's NFTs
async function displayMyNFTs() {
    const container = document.getElementById("myNFTs");
    container.innerHTML = "";

    const nfts = await contract.getMyNFTs(userAddress);

    // 🔴 FILTER OUT NFTs THAT ARE FOR SALE
    const ownedNotForSale = nfts.filter(
        nft => nft.forSale === false
    );

    if (ownedNotForSale.length === 0) {
        container.innerHTML = "<p>No NFTs (listed NFTs are in Collections)</p>";
        return;
    }

    ownedNotForSale.forEach(nft => {
        container.appendChild(createNFTCard(nft, true));
    });
}

// Display collection
async function displayCollections() {
    const container = document.getElementById("collections");
    container.innerHTML = "";

    const nfts = await contract.getCollections();
    nfts.forEach(nft => {
        container.appendChild(createNFTCard(nft, false));
    });
}


async function cancelSale(tokenId) {
    try {
        const tx = await contract.cancelSale(tokenId);
        await tx.wait();

        alert("Sale canceled!");

        await displayMyNFTs();
        await displayCollections();
    } catch (err) {
        console.error(err);
        alert("Failed to cancel sale");
    }
}
