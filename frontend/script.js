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
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJmMDczMGExNy03NTQyLTQ3ZDUtOTcyNi1lOTVkOWI5ZjBkZTAiLCJlbWFpbCI6ImR1bXBsZS5wb0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZTRiNDdmN2E0NTk2NWVmYzJkZWYiLCJzY29wZWRLZXlTZWNyZXQiOiJlOGRhZjgyYTkwYmZhMzlkNzUxYWQyZTg4YmY3ZTFhOGQxMjU2MDg4M2FmOTgzYTNmYzkxYWJmZGQyZTUwNWU1IiwiZXhwIjoxNzk5OTIxMzgxfQ.2UScG7_nIMQih8Hs5klcXsoTKHX99RvpUJd8ya4uj2k";

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

/* =============================
   NFT CARD UPGRADES
}
