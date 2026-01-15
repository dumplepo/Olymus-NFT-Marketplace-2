// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GreekMythNFT is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;

    struct MarketItem {
        uint256 tokenId;
        address creator;
        address owner;
        uint256 price;
        bool forSale;
        uint256 createdAt;
    }

    mapping(uint256 => MarketItem) public marketItems;

    constructor() ERC721("Greek Myth NFT", "GMNFT") Ownable(msg.sender) {
        tokenCounter = 1; // start token IDs at 1
    }

    // Mint function
    function mintNFT(string memory tokenURI) external {
        uint256 newTokenId = tokenCounter;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        marketItems[newTokenId] = MarketItem({
            tokenId: newTokenId,
            creator: msg.sender,
            owner: msg.sender,
            price: 0,
            forSale: false,
            createdAt: block.timestamp
        });

        tokenCounter++;
    }

    // Put NFT for sale
    function sellNFT(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        marketItems[tokenId].forSale = true;
        marketItems[tokenId].price = price;
    }

    // Buy NFT
    function buyNFT(uint256 tokenId) external payable {
        MarketItem storage item = marketItems[tokenId];
        require(item.forSale, "Not for sale");
        require(msg.value >= item.price, "Not enough ETH");

        address seller = item.owner;

        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);

        // Transfer ETH
        (bool sent, ) = payable(seller).call{value: msg.value}("");
        require(sent, "Failed to send Ether");

        // Update market item
        item.owner = msg.sender;
        item.forSale = false;
    }

    // Send NFT for free
    function sendNFT(uint256 tokenId, address to) external {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        _transfer(msg.sender, to, tokenId);
        marketItems[tokenId].owner = to;
    }

    // Get user's NFTs
    function getMyNFTs(address user) external view returns (MarketItem[] memory) {
        uint256 total = tokenCounter - 1;
        uint256 count = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (marketItems[i].owner == user) count++;
        }

        MarketItem[] memory result = new MarketItem[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (marketItems[i].owner == user) {
                result[index] = marketItems[i];
                index++;
            }
        }
        return result;
    }

    // Get NFTs for sale
    function getCollections() external view returns (MarketItem[] memory) {
        uint256 total = tokenCounter - 1;
        uint256 count = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (marketItems[i].forSale) count++;
        }

        MarketItem[] memory result = new MarketItem[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= total; i++) {
            if (marketItems[i].forSale) {
                result[index] = marketItems[i];
                index++;
            }
        }
        return result;
    }
}
