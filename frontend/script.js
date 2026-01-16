let provider, signer, contract, userAddress;
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
const PINATA_JWT = "YOUR_PINATA_JWT_HERE";

/* Elements */
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

const actionModal = document.getElementById("actionModal");
const actionTitle = document.getElementById("actionTitle");
const actionImage = document.getElementById("actionImage");
const actionPrice = document.getElementById("actionPrice");
const actionInput = document.getElementById("actionInput");
const actionConfirmBtn = document.getElementById("actionConfirmBtn");

function setActiveTab(activeBtn) {
    Object.values(topButtons).forEach(btn => btn.classList.remove("active"));
    activeBtn.classList.add("active");
}


/* Init */
window.onload = () => {
    connectWalletLandingBtn.onclick = async () => {
        await connectWallet();
        landingPage.style.display = "none";
        mainPage.style.display = "block";
        requestAnimationFrame(() => mainPage.classList.add("active"));
    };
    function scrollToSection(id) {
        const el = document.getElementById(id);
        const yOffset = -120; // height of top bar
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
    }
    topButtons.myNFTs.onclick = () => {
        setActiveTab(topButtons.myNFTs);
        scrollToSection("myNFTs");
    };

    topButtons.collections.onclick = () => {
        setActiveTab(topButtons.collections);
        scrollToSection("collections");
    };

    topButtons.mint.onclick = () => {
        setActiveTab(topButtons.mint);
        openMintModal();
    };

    topButtons.mint.onclick = openMintModal;
    if(openMintBtn) openMintBtn.onclick = openMintModal;
    if(closeDetailBtn) closeDetailBtn.onclick = closeDetailModal;
};

/* Wallet */
async function connectWallet() {
    if(!window.ethereum) return alert("Install MetaMask");
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts",[]);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
    contract = new ethers.Contract(CONTRACT_ADDRESS,CONTRACT_ABI,signer);
    topBarWallet.innerText = `Connected: ${userAddress}`;
    await displayMyNFTs();
    await displayCollections();
}

/* Modals */
function openMintModal(){ mintModal.style.display="block"; }
function closeMintModal(){ mintModal.style.display="none"; }
function openActionModal(){ actionModal.style.display="block"; }
function closeActionModal(){ actionModal.style.display="none"; }
function closeDetailModal(){ detailModal.style.display="none"; }

imageInput.onchange = ()=>{
    const file=imageInput.files[0]; if(!file) return;
    preview.src=URL.createObjectURL(file); preview.style.display="block";
};

/* IPFS */
async function uploadToIPFS(fileOrBlob){
    const fd=new FormData(); fd.append("file",fileOrBlob);
    const res=await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS",{
        method:"POST",
        headers:{Authorization:`Bearer ${PINATA_JWT}`},
        body:fd
    });
    const data=await res.json();
    return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
}

/* Mint */
confirmMintBtn.onclick=async()=>{
    try{
        const file=imageInput.files[0]; const name=nameInput.value.trim(); const desc=descInput.value.trim();
        if(!file||!name||!desc) return alert("Fill all fields");
        const imageURL=await uploadToIPFS(file);
        const metadata={name,description:desc,image:imageURL};
        const tokenURI=await uploadToIPFS(new Blob([JSON.stringify(metadata)],{type:"application/json"}));
        await (await contract.mintNFT(tokenURI)).wait();
        alert("NFT Minted!");
        closeMintModal(); imageInput.value=""; nameInput.value=""; descInput.value=""; preview.style.display="none";
        await displayMyNFTs(); await displayCollections();
    }catch(e){console.error(e); alert("Mint failed");}
};

/* Market Actions */
async function sellNFT(tokenId, image){
    actionTitle.innerText="Sell NFT"; actionImage.src=image; actionPrice.innerText="";
    actionInput.placeholder="Enter price in ETH"; actionInput.value="";
    actionConfirmBtn.innerText="Sell";
    openActionModal();
    actionConfirmBtn.onclick=async()=>{
        const price=actionInput.value; if(!price) return alert("Enter price");
        await (await contract.sellNFT(tokenId,ethers.parseEther(price))).wait();
        closeActionModal(); await displayMyNFTs(); await displayCollections();
    };
}
async function buyNFT(tokenId, price, image){
    actionTitle.innerText="Buy NFT"; actionImage.src=image; actionPrice.innerText=`Price: ${ethers.formatEther(price)} ETH`;
    actionInput.style.display="none"; actionConfirmBtn.innerText="Buy"; openActionModal();
    actionConfirmBtn.onclick=async()=>{ await (await contract.buyNFT(tokenId,{value:price})).wait(); closeActionModal(); await displayMyNFTs(); await displayCollections();};
}
async function sendNFT(tokenId, image){
    actionTitle.innerText="Send NFT"; actionImage.src=image; actionPrice.innerText="";
    actionInput.placeholder="Recipient address"; actionInput.value=""; actionInput.style.display="block"; actionConfirmBtn.innerText="Send"; openActionModal();
    actionConfirmBtn.onclick=async()=>{
        const to=actionInput.value; if(!to) return alert("Enter address");
        await (await contract.sendNFT(tokenId,to)).wait(); closeActionModal(); await displayMyNFTs(); await displayCollections();
    };
}
async function cancelSale(tokenId){ await (await contract.cancelSale(tokenId)).wait(); await displayMyNFTs(); await displayCollections(); }

/* NFT Cards */
async function createNFTCard(nft,section){
    const card=document.createElement("div"); card.className="nft-card";
    const meta=await loadMetadata(nft.tokenId); const isOwner=nft.owner.toLowerCase()===userAddress.toLowerCase();
    card.onclick=()=>openDetailModal(nft,meta);
    function stop(e){e.stopPropagation();}
    if(section==="myNFTs"){
        card.innerHTML=`<img src="${meta?.image||''}"><h3>${meta?.name||'Unnamed NFT'}</h3>
        <p><strong>Token ID:</strong>${nft.tokenId}</p>
        <p><strong>Price:</strong>${nft.forSale?`${ethers.formatEther(nft.price)} ETH`:"Not for sale"}</p>`;
        if(!nft.forSale) addBtn(card,"Sell",(e)=>{stop(e);sellNFT(nft.tokenId,meta?.image);});
        else addBtn(card,"Cancel",(e)=>{stop(e);cancelSale(nft.tokenId);});
        addBtn(card,"Send",(e)=>{stop(e);sendNFT(nft.tokenId,meta?.image);});
    } else if(section==="collections"){
        card.innerHTML=`<img src="${meta?.image||''}"><h3>${meta?.name||'Unnamed NFT'}</h3>
        <p><strong>Token ID:</strong>${nft.tokenId}</p>
        
        <p><strong>Price:</strong>${nft.forSale?`${ethers.formatEther(nft.price)} ETH`:"Not for sale"}</p>`;
        if(isOwner && nft.forSale) addBtn(card,"Cancel",(e)=>{stop(e);cancelSale(nft.tokenId);});
        else if(!isOwner && nft.forSale) addBtn(card,"Buy",(e)=>{stop(e);buyNFT(nft.tokenId,nft.price,meta?.image);});
    }
    return card;
}

/* Display */
async function displayMyNFTs() {
    const container = document.getElementById("myNFTs");
    showSkeletons(container);

    const nfts = await contract.getMyNFTs(userAddress);
    const visible = nfts.filter(n => !n.forSale);

    container.innerHTML = "";
    if (!visible.length) {
        showEmpty(container, "You don’t own any NFTs yet");
        return;
    }

    for (const nft of visible) {
        container.appendChild(await createNFTCard(nft, "myNFTs"));
    }
}

async function displayCollections() {
    const container = document.getElementById("collections");
    showSkeletons(container);

    const nfts = await contract.getCollections();
    const listed = nfts.filter(n => n.forSale);

    container.innerHTML = "";
    if (!listed.length) {
        showEmpty(container, "No NFTs for sale right now");
        return;
    }

    for (const nft of listed) {
        container.appendChild(await createNFTCard(nft, "collections"));
    }
}
async function loadMetadata(tokenId){try{const uri=await contract.tokenURI(tokenId); const res=await fetch(uri); return await res.json();}catch{return null;}}

function addBtn(card,text,fn){const btn=document.createElement("button"); btn.innerText=text; btn.onclick=fn; card.appendChild(btn);}

function openDetailModal(nft,meta){
    detailImage.src=meta?.image||""; detailName.innerText=meta?.name||"Unnamed NFT"; detailDescription.innerText=meta?.description||"";
    detailTokenId.innerText=nft.tokenId; detailPrice.innerText=nft.forSale?`${ethers.formatEther(nft.price)} ETH`:"Not for sale";
    detailCreator.innerText=nft.creator; detailOwner.innerText=nft.owner; detailDate.innerText=new Date(Number(nft.createdAt)*1000).toLocaleString();
    detailModal.style.display="block";
}

/* =============================
   Account Change
============================= */
if(window.ethereum){
    window.ethereum.on("accountsChanged",async(accounts)=>{
        if(accounts.length===0){userAddress=null; topBarWallet.innerText="Not Connected"; document.getElementById("myNFTs").innerHTML=""; document.getElementById("collections").innerHTML="";}
        else{userAddress=accounts[0]; signer=await provider.getSigner(); contract=new ethers.Contract(CONTRACT_ADDRESS,CONTRACT_ABI,signer); topBarWallet.innerText=`Connected: ${userAddress}`; 
        await displayMyNFTs(); 
        await displayCollections();
        setActiveTab(topButtons.collections);
    }
    });
    window.ethereum.on("chainChanged",()=>window.location.reload());
}

window.addEventListener("scroll", () => {
    const myNFTs = document.getElementById("myNFTs").getBoundingClientRect().top;
    const collections = document.getElementById("collections").getBoundingClientRect().top;

    if (myNFTs <= 120 && collections > 120) {
        setActiveTab(topButtons.myNFTs);
    } else if (collections <= 120) {
        setActiveTab(topButtons.collections);
    }
});

/* =============================
   FADE-IN OBSERVER
============================= */
const fadeObserver = new IntersectionObserver(
    entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    },
    { threshold: 0.15 }
);

document.querySelectorAll(".fade-section").forEach(el => {
    fadeObserver.observe(el);
});
function showSkeletons(container, count = 4) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
        const sk = document.createElement("div");
        sk.className = "skeleton";
        container.appendChild(sk);
    }
}

function showEmpty(container, text) {
    container.innerHTML = `
        <div class="empty-state">
            🖼️ <br><br>
            ${text}
        </div>
    `;
}
