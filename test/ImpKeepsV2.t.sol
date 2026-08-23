// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DungeonKeep} from "../contracts/DungeonKeep.sol";
import {ImpKeepsV2} from "../contracts/ImpKeepsV2.sol";

interface Vm {
    function addr(uint256 privateKey) external pure returns (address);
    function sign(uint256 privateKey, bytes32 digest) external pure returns (uint8 v, bytes32 r, bytes32 s);
    function prank(address msgSender) external;
    function expectRevert(bytes4 revertData) external;
}

contract MockImp {
    mapping(address => uint256) public balanceOf;

    function setBalance(address account, uint256 amount) external {
        balanceOf[account] = amount;
    }
}

contract ImpKeepsV2Test {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 internal constant SIGNER_KEY = 0xA11CE;
    uint256 internal constant USER_KEY = 0xB0B;

    DungeonKeep internal v1;
    ImpKeepsV2 internal keep;
    MockImp internal impz;
    address internal signer;
    address internal user;

    function setUp() public {
        signer = vm.addr(SIGNER_KEY);
        user = vm.addr(USER_KEY);
        v1 = new DungeonKeep(signer, address(this), 800, "https://j00ba.xyz/api/keep/", "https://j00ba.xyz/api/keep-collection");
        impz = new MockImp();

        uint256[9] memory allow;
        allow[0] = uint256(1) << 1;
        allow[0] |= uint256(1) << 2;

        keep = new ImpKeepsV2(
            signer,
            address(this),
            800,
            "https://j00ba.xyz/api/keep-v2/",
            "https://j00ba.xyz/api/keep-v2-collection",
            address(v1),
            address(impz),
            allow
        );

        uint256 deadline = block.timestamp + 15 minutes;
        bytes memory signature = signVoucher(user, 99, deadline, SIGNER_KEY);
        vm.prank(user);
        v1.mint(99, deadline, signature);
    }

    function testClaimCopiesSeedAndOwner() public {
        require(keep.isAllowed(1), "allowed");
        vm.prank(user);
        keep.claim(1);
        require(keep.ownerOf(1) == user, "owner");
        require(keep.seedOf(1) == 99, "seed");
        require(keep.claimed(1), "claimed");
        require(keep.totalSupply() == 1, "supply");
    }

    function testRejectsUnlistedToken() public {
        vm.expectRevert(ImpKeepsV2.NotEligible.selector);
        vm.prank(user);
        keep.claim(3);
    }

    function testRejectsBannedCaller() public {
        vm.expectRevert(ImpKeepsV2.Banned.selector);
        vm.prank(0x6a69c91Eab620FE31Ff6Cd30B3a00EDfb347E32B);
        keep.claim(1);
    }

    function testMintRequiresImp() public {
        uint256 deadline = block.timestamp + 15 minutes;
        bytes memory signature = signVoucher(user, 7, deadline, SIGNER_KEY);
        vm.expectRevert(ImpKeepsV2.NeedImp.selector);
        vm.prank(user);
        keep.mint(7, deadline, signature);

        impz.setBalance(user, 1);
        vm.prank(user);
        keep.mint(7, deadline, signature);
        require(keep.ownerOf(1) == user, "minted first free id");
        require(keep.totalSupply() == 1, "supply after mint");
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
