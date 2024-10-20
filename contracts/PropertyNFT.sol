//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract PropertyNFT is ERC721URIStorage {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    event PropertyAddedToChain(
        uint256 indexed tokenId,
        address indexed owner,
        string tokenURI,
        string name,
        string propertyAddress,
        string description,
        string image,
        uint256 purchasePrice,
        string residenceType,
        uint256 bedrooms,
        uint256 bathrooms,
        uint256 squareFeet,
        uint256 yearBuilt,
        uint256 timestamp
    );

    constructor() ERC721("Property NFT", "PRP") {}

    function mint(
        string memory tokenURI,
        string memory name,
        string memory propertyAddress,
        string memory description,
        string memory image,
        uint256 purchasePrice,
        string memory residenceType,
        uint256 bedrooms,
        uint256 bathrooms,
        uint256 squareFeet,
        uint256 yearBuilt
    ) public returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
        _setTokenURI(newItemId, tokenURI);

        emit PropertyAddedToChain(
            newItemId,
            msg.sender,
            tokenURI,
            name,
            propertyAddress,
            description,
            image,
            purchasePrice,
            residenceType,
            bedrooms,
            bathrooms,
            squareFeet,
            yearBuilt,
            block.timestamp
        );
        return newItemId;
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIds.current();
    }
}