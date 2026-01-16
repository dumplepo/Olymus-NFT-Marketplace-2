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
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function tokenURI(uint256 tokenId) view returns (string)",
    "function getMyNFTs(address user) external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])",
    "function getCollections() external view returns (tuple(uint256 tokenId,address creator,address owner,uint256 price,bool forSale,uint256 createdAt)[])"
];

/* =============================
   PINATA JWT
============================= */
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMDczMGExNy03NTQyLTQ3ZDUtOTcyNi1lOTVkOWI5ZjBkZTAiLCJlbWFpbCI6ImR1bXBsZS5wb0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZTRiNDdmN2E0NTk2NWVmYzJkZWYiLCJzY29wZWRLZXlTZWNyZXQiOiJlOGRhZjgyYTkwYmZhMzlkNzUxYWQyZTg4YmY3ZTFhOGQxMjU2MDg4M2FmOTgzYTNmYzkxYWJmZGQyZTUwNWU1IiwiZXhwIjoxNzk5OTIxMzgxfQ.2UScG7_nIMQih8Hs5klcXsoTKHX99RvpUJd8ya4uj2k";

/* =============================
   ELEMENTS
============================= */
const mintModal = document.getElementById("mintModal");
const openMintBtn = document.getElementById("mintNFT");
const confirmMintBtn = document.getElementById("confirmMint");

const imageInput = document.getElementById("nftImage");
const nameInput = document.getElementById("nftName");
const descInput = document.getElementById("nftDescription");
const preview = document.getElementById("imagePreview");

//   detailed NFT modal
const detailModal = document.getElementById("detailModal");

const detailImage = document.getElementById("detailImage");
const detailName = document.getElementById("detailName");
const detailDescription = document.getElementById("detailDescription");
const detailTokenId = document.getElementById("detailTokenId");
const detailPrice = document.getElementById("detailPrice");
const detailCreator = document.getElementById("detailCreator");
const detailOwner = document.getElementById("detailOwner");
const detailDate = document.getElementById("detailDate");





/* =============================
   INIT
============================= */
window.onload = () => {
    document.getElementById("connectWallet").onclick = connectWallet;
    openMintBtn.onclick = openMintModal;
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
   MODAL
============================= */
function openMintModal() {
    mintModal.style.display = "block";
}

function closeMintModal() {
    mintModal.style.display = "none";
}

imageInput.onchange = () => {
    const file = imageInput.files[0];
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
};

/* =============================
   IPFS
============================= */
async function uploadToIPFS(fileOrBlob) {
    const formData = new FormData();
    formData.append("file", fileOrBlob);

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
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
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

        // Upload image
        const imageURL = await uploadToIPFS(file);

        // Metadata
        const metadata = {
            name,
            description,
            image: imageURL
        };

        const metadataBlob = new Blob(
            [JSON.stringify(metadata)],
            { type: "application/json" }
        );

        const tokenURI = await uploadToIPFS(metadataBlob);

        const tx = await contract.mintNFT(tokenURI);
        await tx.wait();

        alert("NFT Minted!");

        closeMintModal();
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
    await (await contract.sellNFT(tokenId, ethers.parseEther(price))).wait();
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
   CARD
============================= */
async function createNFTCard(nft, section) {
    const card = document.createElement("div");
    card.className = "nft-card";

    const meta = await loadMetadata(nft.tokenId);
    const isOwner = nft.owner.toLowerCase() === userAddress.toLowerCase();

    // CARD CLICK → DETAIL MODAL
    card.onclick = () => openDetailModal(nft, meta);

    // Stop propagation for buttons so modal doesn't open
    function stop(e) { e.stopPropagation(); }

    // DIFFERENT LAYOUTS
    if (section === "myNFTs") {
        // My NFTs: image, name, ID, price + buttons
        card.innerHTML = `
            <img src="${meta?.image || ''}">
            <h3>${meta?.name || 'Unnamed NFT'}</h3>
            <p><strong>Token ID:</strong> ${nft.tokenId}</p>
            <p><strong>Price:</strong> ${
                nft.forSale ? `${ethers.formatEther(nft.price)} ETH` : "Not for sale"
            }</p>
        `;

        if (!nft.forSale) addBtn(card, "Sell", (e) => { stop(e); sellNFT(nft.tokenId); });
        else addBtn(card, "Cancel", (e) => { stop(e); cancelSale(nft.tokenId); });
        addBtn(card, "Send", (e) => { stop(e); sendNFT(nft.tokenId); });

    } else if (section === "collections") {
        // Collections: image, name, ID, owner, price + button
        card.innerHTML = `
            <img src="${meta?.image || ''}">
            <h3>${meta?.name || 'Unnamed NFT'}</h3>
            <p><strong>Token ID:</strong> ${nft.tokenId}</p>
            <p><strong>Owner:</strong> ${nft.owner}</p>
            <p><strong>Price:</strong> ${
                nft.forSale ? `${ethers.formatEther(nft.price)} ETH` : "Not for sale"
            }</p>
        `;

        if (isOwner && nft.forSale) addBtn(card, "Cancel", (e) => { stop(e); cancelSale(nft.tokenId); });
        else if (!isOwner && nft.forSale) addBtn(card, "Buy", (e) => { stop(e); buyNFT(nft.tokenId, nft.price); });
    }

    return card;
}

/* =============================
   DISPLAY
============================= */
async function displayMyNFTs() {
    const container = document.getElementById("myNFTs");
    container.innerHTML = "";

    const nfts = await contract.getMyNFTs(userAddress);
    const visible = nfts.filter(n => !n.forSale);

    if (!visible.length) {
        container.innerHTML = "<p>No NFTs</p>";
        return;
    }

    for (const nft of visible) {
        container.appendChild(await createNFTCard(nft, "myNFTs"));
    }
}

async function displayCollections() {
    const container = document.getElementById("collections");
    container.innerHTML = "";

    const nfts = await contract.getCollections();
    for (const nft of nfts) {
        if (nft.forSale) {
            container.appendChild(await createNFTCard(nft, "collections"));
        }
    }
}

async function loadMetadata(tokenId) {
    try {
        const uri = await contract.tokenURI(tokenId);
        const res = await fetch(uri);
        return await res.json();
    } catch {
        return null;
    }
}

function addBtn(card, text, fn) {
    const btn = document.createElement("button");
    btn.innerText = text;
    btn.onclick = fn;
    card.appendChild(btn);
}

function openDetailModal(nft, meta) {
    detailImage.src = meta?.image || "";
    detailName.innerText = meta?.name || "Unnamed NFT";
    detailDescription.innerText = meta?.description || "";
    detailTokenId.innerText = nft.tokenId;
    detailPrice.innerText = nft.forSale
        ? `${ethers.formatEther(nft.price)} ETH`
        : "Not for sale";
    detailCreator.innerText = nft.creator;
    detailOwner.innerText = nft.owner;
    detailDate.innerText = new Date(
        Number(nft.createdAt) * 1000
    ).toLocaleString();

    detailModal.style.display = "block";
}

function closeDetailModal() {
    detailModal.style.display = "none";
}
