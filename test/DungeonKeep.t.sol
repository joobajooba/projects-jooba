// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DungeonKeep} from "../contracts/DungeonKeep.sol";

interface Vm {
    function addr(uint256 privateKey) external pure returns (address);
    function sign(uint256 privateKey, bytes32 digest) external pure returns (uint8 v, bytes32 r, bytes32 s);
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
    function warp(uint256 newTimestamp) external;
}

/// Matches the Adventures `mint-voucher` message and on-chain ecrecover.
contract DungeonKeepTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 internal constant SIGNER_KEY = 0xA11CE;
    uint256 internal constant USER_KEY = 0xB0B;

    DungeonKeep internal keep;
    address internal signer;
    address internal user;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        user = vm.addr(USER_KEY);
        keep = new DungeonKeep(
            signer,
            address(this),
            800,
            "https://j00ba.xyz/api/keep/",
            "https://j00ba.xyz/api/keep-collection"
        );
    }

    function testCollectionNameAndSupply() public view {
        require(keccak256(bytes(keep.name())) == keccak256("Imp Keeps"), "name");
        require(keep.MAX_SUPPLY() == 2222, "supply");
    }

    function testMintStoresSeedAndOwner() public {
        uint256 seed = uint256(keccak256("keep-seed"));
        uint256 deadline = block.timestamp + 15 minutes;
        bytes memory signature = signVoucher(user, seed, deadline, SIGNER_KEY);

        vm.prank(user);
        keep.mint(seed, deadline, signature);

        require(keep.totalSupply() == 1, "supply");
        require(keep.ownerOf(1) == user, "owner");
        require(keep.seedOf(1) == seed, "seed");
        require(keep.seedUsed(seed), "used");
        require(
            keccak256(bytes(keep.tokenURI(1))) == keccak256("https://j00ba.xyz/api/keep/1"),
            "uri"
        );
    }

    function testRejectsExpiredVoucher() public {
        uint256 seed = 1;
        uint256 deadline = block.timestamp + 60;
        bytes memory signature = signVoucher(user, seed, deadline, SIGNER_KEY);
        vm.warp(deadline + 1);
        vm.expectRevert(DungeonKeep.Expired.selector);
        vm.prank(user);
        keep.mint(seed, deadline, signature);
    }

    function testRejectsWrongSigner() public {
        uint256 seed = 2;
        uint256 deadline = block.timestamp + 60;
        bytes memory signature = signVoucher(user, seed, deadline, USER_KEY);
        vm.expectRevert(DungeonKeep.BadSignature.selector);
        vm.prank(user);
        keep.mint(seed, deadline, signature);
    }

    function testRejectsReusedSeed() public {
        uint256 seed = 3;
        uint256 deadline = block.timestamp + 60;
        bytes memory signature = signVoucher(user, seed, deadline, SIGNER_KEY);
        vm.prank(user);
        keep.mint(seed, deadline, signature);

        vm.expectRevert(DungeonKeep.SeedUsed.selector);
        vm.prank(user);
        keep.mint(seed, deadline, signature);
    }

    function testRoyaltyIsEightPercent() public {
        (address receiver, uint256 amount) = keep.royaltyInfo(1, 10_000);
        require(receiver == address(this), "receiver");
        require(amount == 800, "bps");
    }

    function signVoucher(address to, uint256 seed, uint256 deadline, uint256 key)
        internal
        view
        returns (bytes memory)
    {
        bytes memory message = abi.encodePacked(
            "IMPLINGz Dungeon Mint\n",
            toHexAddress(to),
            "\n0x",
            toHex(bytes32(seed)),
            "\n",
            toString(deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n", toString(message.length), message)
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function toHexAddress(address account) internal pure returns (string memory) {
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

    function toHex(bytes32 value) internal pure returns (string memory) {
        bytes memory hexChars = "0123456789abcdef";
        bytes memory str = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            str[i * 2] = hexChars[uint8(value[i] >> 4)];
            str[i * 2 + 1] = hexChars[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }

    function toString(uint256 value) internal pure returns (string memory) {
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
