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
const landingPage = document.getElementById("landingPage");
const mainPage = document.getElementById("mainPage");
const connectWalletLandingBtn = document.getElementById("connectWalletLanding");

const topButtons = {
    myNFTs: document.getElementById("btnMyNFTs"),
    collections: document.getElementById("btnCollections"),
    mint: document.getElementById("btnMint")
};
const topBarWallet = document.getElementById("topBarWallet");

const mintModal = document.getElementById("mintModal");
const openMintBtn = document.getElementById("mintNFT") || topButtons.mint;
const confirmMintBtn = document.getElementById("confirmMint");
const imageInput = document.getElementById("nftImage");
const nameInput = document.getElementById("nftName");
const descInput = document.getElementById("nftDescription");
const preview = document.getElementById("imagePreview");

const detailModal = document.getElementById("detailModal");
const detailImage = document.getElementById("detailImage");
const detailName = document.getElementById("detailName");
const detailDescription = document.getElementById("detailDescription");
const detailTokenId = document.getElementById("detailTokenId");
const detailPrice = document.getElementById("detailPrice");
const detailCreator = document.getElementById("detailCreator");
const detailOwner = document.getElementById("detailOwner");
const detailDate = document.getElementById("detailDate");
const closeDetailBtn = document.getElementById("closeDetailBtn");

/* =============================
   INIT
============================= */
window.onload = () => {
    // Landing connect wallet
    if(connectWalletLandingBtn) {
        connectWalletLandingBtn.onclick = async () => {
            await connectWallet();
            landingPage.style.display = "none";
            mainPage.style.display = "block";
        }
    }

    // Top bar buttons
    if(topButtons.myNFTs) topButtons.myNFTs.onclick = () => document.getElementById("myNFTs").scrollIntoView({behavior:"smooth"});
    if(topButtons.collections) topButtons.collections.onclick = () => document.getElementById("collections").scrollIntoView({behavior:"smooth"});
    if(topButtons.mint) topButtons.mint.onclick = () => openMintModal();

    // Mint modal button
    if(openMintBtn) openMintBtn.onclick = openMintModal;
    if(closeDetailBtn) closeDetailBtn.onclick = closeDetailModal;
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

    topBarWallet.innerText = `Connected: ${userAddress}`;

    await displayMyNFTs();
    await displayCollections();
}

/* =============================
   MODALS
============================= */
function openMintModal() { mintModal.style.display = "block"; }
function closeMintModal() { mintModal.style.display = "none"; }
function closeDetailModal() { detailModal.style.display = "none"; }

imageInput.onchange = () => {
    const file = imageInput.files[0];
    if(!file) return;
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
};

/* =============================
   IPFS
============================= */
async function uploadToIPFS(fileOrBlob) {
    const formData = new FormData();
    formData.append("file", fileOrBlob);
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: `Bearer ${PINATA_JWT}` },
        body: formData
    });
    const data = await res.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}

/* =============================
   MINT NFT
============================= */
confirmMintBtn.onclick = async () => {
    try {
        const file = imageInput.files[0];
        const name = nameInput.value.trim();
        const description = descInput.value.trim();
        if(!file || !name || !description) return alert("Fill all fields");

        const imageURL = await uploadToIPFS(file);
        const metadata = { name, description, image: imageURL };
        const metadataBlob = new Blob([JSON.stringify(metadata)], {type:"application/json"});
        const tokenURI = await uploadToIPFS(metadataBlob);

        await (await contract.mintNFT(tokenURI)).wait();
        alert("NFT Minted!");

        closeMintModal();
        imageInput.value = ""; nameInput.value = ""; descInput.value = ""; preview.style.display = "none";

        await displayMyNFTs();
        await displayCollections();
    } catch(e) { console.error(e); alert("Mint failed"); }
};

/* =============================
   MARKET ACTIONS
============================= */
async function sellNFT(tokenId) { const price = prompt("Enter price in ETH:"); if(!price) return; await (await contract.sellNFT(tokenId, ethers.parseEther(price))).wait(); await displayMyNFTs(); await displayCollections();}
async function cancelSale(tokenId) { await (await contract.cancelSale(tokenId)).wait(); await displayMyNFTs(); await displayCollections();}
async function buyNFT(tokenId, price) { await (await contract.buyNFT(tokenId, { value: price })).wait(); await displayMyNFTs(); await displayCollections();}
async function sendNFT(tokenId) { const to = prompt("Recipient address:"); if(!to) return; await (await contract.sendNFT(tokenId, to)).wait(); await displayMyNFTs(); await displayCollections();}

/* =============================
   CREATE NFT CARD
============================= */
async function createNFTCard(nft, section) {
    const card = document.createElement("div");
    card.className = "nft-card";

    const meta = await loadMetadata(nft.tokenId);
    const isOwner = nft.owner.toLowerCase() === userAddress.toLowerCase();
    card.onclick = () => openDetailModal(nft, meta);

    function stop(e) { e.stopPropagation(); }

    if(section==="myNFTs") {
        card.innerHTML = `
            <img src="${meta?.image||''}">
            <h3>${meta?.name||'Unnamed NFT'}</h3>
            <p><strong>Token ID:</strong> ${nft.tokenId}</p>
            <p><strong>Price:</strong>${nft.forSale?`${ethers.formatEther(nft.price)} ETH`:"Not for sale"}</p>
        `;
        if(!nft.forSale)addBtn(card,"Sell",(e)=>{stop(e);sellNFT(nft.tokenId);});
        else addBtn(card,"Cancel",(e)=>{stop(e);cancelSale(nft.tokenId);});
        addBtn(card,"Send",(e)=>{stop(e);sendNFT(nft.tokenId);});
    }
    else if(section==="collections") {
        card.innerHTML = `
            <img src="${meta?.image||''}">
            <h3>${meta?.name||'Unnamed NFT'}</h3>
            <p><strong>Token ID:</strong> ${nft.tokenId}</p>
            <p><strong>Owner:</strong> ${nft.owner}</p>
            <p><strong>Price:</strong>${nft.forSale?`${ethers.formatEther(nft.price)} ETH`:"Not for sale"}</p>
        `;
        if(isOwner && nft.forSale)addBtn(card,"Cancel",(e)=>{stop(e);cancelSale(nft.tokenId);});
        else if(!isOwner && nft.forSale)addBtn(card,"Buy",(e)=>{stop(e);buyNFT(nft.tokenId,nft.price);});
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
    if(!visible.length){container.innerHTML="<p>No NFTs</p>"; return;}
    for(const nft of visible){container.appendChild(await createNFTCard(nft,"myNFTs"));}
}

async function displayCollections() {
    const container = document.getElementById("collections");
    container.innerHTML = "";
    const nfts = await contract.getCollections();
    for(const nft of nfts){if(nft.forSale){container.appendChild(await createNFTCard(nft,"collections"));}}
}

async function loadMetadata(tokenId){
    try{const uri=await contract.tokenURI(tokenId); const res=await fetch(uri); return await res.json();}
    catch{return null;}
}

function addBtn(card,text,fn){const btn=document.createElement("button"); btn.innerText=text; btn.onclick=fn; card.appendChild(btn);}

function openDetailModal(nft,meta){
    detailImage.src = meta?.image||"";
    detailName.innerText = meta?.name||"Unnamed NFT";
    detailDescription.innerText = meta?.description||"";
    detailTokenId.innerText = nft.tokenId;
    detailPrice.innerText = nft.forSale?`${ethers.formatEther(nft.price)} ETH`:"Not for sale";
    detailCreator.innerText = nft.creator;
    detailOwner.innerText = nft.owner;
    detailDate.innerText = new Date(Number(nft.createdAt)*1000).toLocaleString();
    detailModal.style.display="block";
}

/* =============================
   ACCOUNT CHANGE
============================= */
if(window.ethereum){
    window.ethereum.on("accountsChanged", async (accounts)=>{
        if(accounts.length===0){
            userAddress=null;
            topBarWallet.innerText="Not Connected";
            document.getElementById("myNFTs").innerHTML="";
            document.getElementById("collections").innerHTML="";
        }else{
            userAddress = accounts[0];
            signer = await provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            topBarWallet.innerText = `Connected: ${userAddress}`;
            await displayMyNFTs();
            await displayCollections();
        }
    });

    window.ethereum.on("chainChanged", ()=>window.location.reload());
}
