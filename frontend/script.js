let provider;
let signer;
let contract;
let userAddress;

/* =============================
   CONTRACT
============================= */
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONTRACT_ABI = [
    "function mintNFT(string tokenURI) external",
    "function sellNFT(uint256 tokenId, uint256 price) external",
    "function buyNFT(uint256 tokenId) external payable",
    "function sendNFT(uint256 tokenId, address to) external",
    "function cancelSale(uint256 tokenId) external",
    "function getMyNFTs(address user) external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])",
    "function getCollections() external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])"
];

/* =============================
   MINT MODAL ELEMENTS
============================= */
const mintModal = document.getElementById("mintModal");
const openMintBtn = document.getElementById("mintNFT");
const closeMintBtn = document.getElementById("closeMintModal");
const confirmMintBtn = document.getElementById("confirmMint");

const imageInput = document.getElementById("mintImage");
const nameInput = document.getElementById("mintName");
const descInput = document.getElementById("mintDescription");
const preview = document.getElementById("mintPreview");

/* =============================
   PINATA (IPFS)
============================= */
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMDczMGExNy03NTQyLTQ3ZDUtOTcyNi1lOTVkOWI5ZjBkZTAiLCJlbWFpbCI6ImR1bXBsZS5wb0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZTRiNDdmN2E0NTk2NWVmYzJkZWYiLCJzY29wZWRLZXlTZWNyZXQiOiJlOGRhZjgyYTkwYmZhMzlkNzUxYWQyZTg4YmY3ZTFhOGQxMjU2MDg4M2FmOTgzYTNmYzkxYWJmZGQyZTUwNWU1IiwiZXhwIjoxNzk5OTIxMzgxfQ.2UScG7_nIMQih8Hs5klcXsoTKHX99RvpUJd8ya4uj2k";

/* =============================
   INIT
============================= */
window.onload = () => {
    document.getElementById("connectWallet").onclick = connectWallet;
};

/* =============================
   WALLET
============================= */
async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask");

    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    document.getElementById("walletAddress").innerText =
        `Connected: ${userAddress}`;

    await displayMyNFTs();
    await displayCollections();
}

/* =============================
   MINT MODAL LOGIC
============================= */
openMintBtn.onclick = () => mintModal.style.display = "block";
closeMintBtn.onclick = () => mintModal.style.display = "none";

imageInput.onchange = () => {
    const file = imageInput.files[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
};

/* =============================
   IPFS UPLOAD
============================= */
async function uploadToIPFS(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PINATA_JWT}`
            },
            body: formData
        }
    );

    const data = await res.json();
    return `ipfs://${data.IpfsHash}`;
}

/* =============================
   CONFIRM MINT
============================= */
confirmMintBtn.onclick = async () => {
    try {
        const file = imageInput.files[0];
        const name = nameInput.value.trim();
        const description = descInput.value.trim();

        if (!file || !name || !description) {
            alert("Fill all fields");
            return;
        }

        const imageURI = await uploadToIPFS(file);

        const metadata = {
            name,
            description,
            image: imageURI
        };

        const blob = new Blob(
            [JSON.stringify(metadata)],
            { type: "application/json" }
        );

        const metadataURI = await uploadToIPFS(blob);

        const tx = await contract.mintNFT(metadataURI);
        await tx.wait();

        alert("NFT Minted!");

        mintModal.style.display = "none";
        imageInput.value = "";
        nameInput.value = "";
        descInput.value = "";
        preview.style.display = "none";

        await displayMyNFTs();
        await displayCollections();

    } catch (err) {
        console.error(err);
        alert("Mint failed");
    }
};

/* =============================
   MARKET ACTIONS
============================= */
async function sellNFT(tokenId) {
    const price = prompt("Enter price in ETH:");
    if (!price) return;

    await (await contract.sellNFT(
        tokenId,
        ethers.parseEther(price)
    )).wait();

    await displayMyNFTs();
    await displayCollections();
}

async function cancelSale(tokenId) {
    await (await contract.cancelSale(tokenId)).wait();
    await displayMyNFTs();
    await displayCollections();
}

async function buyNFT(tokenId, price) {
    await (await contract.buyNFT(tokenId, { value: price })).wait();
    await displayMyNFTs();
    await displayCollections();
}

async function sendNFT(tokenId) {
    const to = prompt("Recipient address:");
    if (!to) return;

    await (await contract.sendNFT(tokenId, to)).wait();
    await displayMyNFTs();
    await displayCollections();
}

/* =============================
   NFT CARD
============================= */
function createNFTCard(nft, isOwnerView) {
    const card = document.createElement("div");
    card.className = "nft-card";

    const isOwner = nft.owner.toLowerCase() === userAddress.toLowerCase();

    card.innerHTML = `
        <p><strong>ID:</strong> ${nft.tokenId}</p>
        <p><strong>Status:</strong>
            ${nft.forSale
                ? `For Sale (${ethers.formatEther(nft.price)} ETH)`
                : "Not for sale"}
        </p>
    `;

    if (isOwnerView) {
        if (!nft.forSale) {
            addButton(card, "Sell", () => sellNFT(nft.tokenId));
        }
        addButton(card, "Send", () => sendNFT(nft.tokenId));
    } else if (nft.forSale) {
        if (isOwner) {
            addButton(card, "Cancel", () => cancelSale(nft.tokenId));
        } else {
            addButton(card, "Buy", () => buyNFT(nft.tokenId, nft.price));
        }
    }

    return card;
}

function addButton(card, text, action) {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.onclick = action;
    card.appendChild(btn);
}

/* =============================
   DISPLAY
============================= */
async function displayMyNFTs() {
    const container = document.getElementById("myNFTs");
    container.innerHTML = "";

    const nfts = await contract.getMyNFTs(userAddress);

    const visible = nfts.filter(n => !n.forSale);

    if (visible.length === 0) {
        container.innerHTML = "<p>No NFTs (listed NFTs are in Collections)</p>";
        return;
    }

    visible.forEach(nft =>
        container.appendChild(createNFTCard(nft, true))
    );
}

async function displayCollections() {
    const container = document.getElementById("collections");
    container.innerHTML = "";

    const nfts = await contract.getCollections();
    nfts.forEach(nft =>
        container.appendChild(createNFTCard(nft, false))
    );
}
