// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DungeonKeep {
    string public constant name = "Imp Keeps";
    string public constant symbol = "KEEP";
    uint256 public constant MAX_SUPPLY = 2222;
    bytes4 private constant IERC165 = 0x01ffc9a7;
    bytes4 private constant IERC721 = 0x80ac58cd;
    bytes4 private constant IERC721_METADATA = 0x5b5e139f;
    bytes4 private constant IERC2981 = 0x2a55205a;

    address public owner;
    address public mintSigner;
    address public royaltyReceiver;
    uint16 public royaltyBps;
    string public baseURI;
    string public contractURI;
    uint256 public totalSupply;

    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => address) private _tokenApprovals;
    mapping(uint256 => uint256) public seedOf;
    mapping(uint256 => bool) public seedUsed;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event KeepMinted(address indexed to, uint256 indexed tokenId, uint256 seed);

    error NotOwner();
    error SoldOut();
    error SeedUsed();
    error Expired();
    error BadSignature();
    error NotTokenOwner();
    error InvalidReceiver();

    constructor(
        address signer,
        address royaltyOwner,
        uint16 royaltyAmountBps,
        string memory initialBaseURI,
        string memory initialContractURI
    ) {
        owner = msg.sender;
        mintSigner = signer;
        royaltyReceiver = royaltyOwner;
        royaltyBps = royaltyAmountBps;
        baseURI = initialBaseURI;
        contractURI = initialContractURI;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setMintSigner(address signer) external onlyOwner {
        mintSigner = signer;
    }

    function setBaseURI(string calldata nextBaseURI) external onlyOwner {
        baseURI = nextBaseURI;
    }

    function setContractURI(string calldata nextContractURI) external onlyOwner {
        contractURI = nextContractURI;
    }

    function setRoyalty(address receiver, uint16 bps) external onlyOwner {
        royaltyReceiver = receiver;
        royaltyBps = bps;
    }

    function mint(uint256 seed, uint256 deadline, bytes calldata signature) external {
        if (totalSupply >= MAX_SUPPLY) revert SoldOut();
        if (block.timestamp > deadline) revert Expired();
        if (seedUsed[seed]) revert SeedUsed();
        if (!_validSignature(msg.sender, seed, deadline, signature)) revert BadSignature();

        seedUsed[seed] = true;
        uint256 tokenId = totalSupply + 1;
        totalSupply = tokenId;
        seedOf[tokenId] = seed;
        _mint(msg.sender, tokenId);
        emit KeepMinted(msg.sender, tokenId, seed);
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        if (_owners[tokenId] == address(0)) revert NotTokenOwner();
        return string.concat(baseURI, _toString(tokenId));
    }

    function royaltyInfo(uint256, uint256 salePrice) external view returns (address, uint256) {
        return (royaltyReceiver, (salePrice * royaltyBps) / 10_000);
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _owners[tokenId];
        if (tokenOwner == address(0)) revert NotTokenOwner();
        return tokenOwner;
    }

    function balanceOf(address account) public view returns (uint256) {
        if (account == address(0)) revert InvalidReceiver();
        return _balances[account];
    }

    function approve(address spender, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (msg.sender != tokenOwner && !_operatorApprovals[tokenOwner][msg.sender]) revert NotTokenOwner();
        _tokenApprovals[tokenId] = spender;
        emit Approval(tokenOwner, spender, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        if (_owners[tokenId] == address(0)) revert NotTokenOwner();
        return _tokenApprovals[tokenId];
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        if (to == address(0)) revert InvalidReceiver();
        address tokenOwner = ownerOf(tokenId);
        if (from != tokenOwner) revert NotTokenOwner();
        if (
            msg.sender != tokenOwner &&
            msg.sender != _tokenApprovals[tokenId] &&
            !_operatorApprovals[tokenOwner][msg.sender]
        ) revert NotTokenOwner();

        delete _tokenApprovals[tokenId];
        _balances[from] -= 1;
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        transferFrom(from, to, tokenId);
        _checkOnERC721Received(from, to, tokenId, data);
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == IERC165 ||
            interfaceId == IERC721 ||
            interfaceId == IERC721_METADATA ||
            interfaceId == IERC2981;
    }

    function _mint(address to, uint256 tokenId) internal {
        if (to == address(0)) revert InvalidReceiver();
        _owners[tokenId] = to;
        _balances[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data) internal {
        if (to.code.length == 0) return;
        (bool success, bytes memory returndata) = to.call(
            abi.encodeWithSelector(bytes4(0x150b7a02), msg.sender, from, tokenId, data)
        );
        if (!success || returndata.length < 32) revert InvalidReceiver();
        if (abi.decode(returndata, (bytes4)) != bytes4(0x150b7a02)) revert InvalidReceiver();
    }

    function _validSignature(address to, uint256 seed, uint256 deadline, bytes calldata signature)
        internal
        view
        returns (bool)
    {
        if (signature.length != 65) return false;
        bytes memory message = abi.encodePacked(
            "IMPLINGz Dungeon Mint\n",
            _toHexAddress(to),
            "\n0x",
            _toHex(bytes32(seed)),
            "\n",
            _toString(deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n", _toString(message.length), message)
        );
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) v += 27;
        return ecrecover(digest, v, r, s) == mintSigner;
    }

    function _toHexAddress(address account) internal pure returns (string memory) {
        bytes20 data = bytes20(account);
        bytes memory hexChars = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = hexChars[uint8(data[i] >> 4)];
            str[3 + i * 2] = hexChars[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    function _toHex(bytes32 value) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            str[i * 2] = hexChars[uint8(value[i] >> 4)];
            str[i * 2 + 1] = hexChars[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
