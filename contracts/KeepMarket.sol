// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Unused for the OpenSea ETH route. Keep this file for a later $DERP shop only if needed.
// Do not deploy it alongside DungeonKeep or OpenSea will be competing with a locked market.

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IDungeonKeep {
    function ownerOf(uint256 tokenId) external view returns (address);
    function transferFrom(address from, address to, uint256 tokenId) external;
}

contract KeepMarket {
    IERC20 public immutable derp;
    IDungeonKeep public immutable keeps;
    address public owner;
    address public creator;
    address public derpPot;
    uint16 public creatorBps;
    uint16 public potBps;

    struct Listing {
        address seller;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;

    event Listed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event Delisted(uint256 indexed tokenId);
    event Sold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 creatorFee, uint256 potFee);
    event SplitUpdated(address creator, address derpPot, uint16 creatorBps, uint16 potBps);

    error NotOwner();
    error NotSeller();
    error NotListed();
    error InvalidPrice();
    error InvalidSplit();
    error TransferFailed();

    constructor(address derpToken, address keepToken, address creatorWallet, address pot) {
        derp = IERC20(derpToken);
        keeps = IDungeonKeep(keepToken);
        owner = msg.sender;
        creator = creatorWallet;
        derpPot = pot;
        creatorBps = 400;
        potBps = 400;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setSplit(address creatorWallet, address pot, uint16 nextCreatorBps, uint16 nextPotBps) external onlyOwner {
        if (nextCreatorBps + nextPotBps > 1000) revert InvalidSplit();
        creator = creatorWallet;
        derpPot = pot;
        creatorBps = nextCreatorBps;
        potBps = nextPotBps;
        emit SplitUpdated(creatorWallet, pot, nextCreatorBps, nextPotBps);
    }

    function list(uint256 tokenId, uint256 price) external {
        if (price == 0) revert InvalidPrice();
        if (keeps.ownerOf(tokenId) != msg.sender) revert NotSeller();
        listings[tokenId] = Listing({ seller: msg.sender, price: price });
        emit Listed(tokenId, msg.sender, price);
    }

    function delist(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        if (listing.seller == address(0)) revert NotListed();
        if (listing.seller != msg.sender && msg.sender != owner) revert NotSeller();
        delete listings[tokenId];
        emit Delisted(tokenId);
    }

    function buy(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        if (listing.seller == address(0) || listing.price == 0) revert NotListed();
        if (keeps.ownerOf(tokenId) != listing.seller) revert NotSeller();

        uint256 creatorFee = (listing.price * creatorBps) / 10_000;
        uint256 potFee = (listing.price * potBps) / 10_000;
        uint256 sellerProceeds = listing.price - creatorFee - potFee;

        delete listings[tokenId];

        if (!derp.transferFrom(msg.sender, listing.seller, sellerProceeds)) revert TransferFailed();
        if (creatorFee > 0 && !derp.transferFrom(msg.sender, creator, creatorFee)) revert TransferFailed();
        if (potFee > 0 && !derp.transferFrom(msg.sender, derpPot, potFee)) revert TransferFailed();

        keeps.transferFrom(listing.seller, msg.sender, tokenId);
        emit Sold(tokenId, listing.seller, msg.sender, listing.price, creatorFee, potFee);
    }
}
