// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ImpKeepsV2} from "../contracts/ImpKeepsV2.sol";

interface Vm {
    function envUint(string calldata key) external view returns (uint256);
    function envOr(string calldata key, address defaultValue) external view returns (address);
    function envOr(string calldata key, string calldata defaultValue) external view returns (string memory);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployImpKeepsV2 {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address public constant CREATOR = 0x53391bf6931E3a8d829029b2a7640f3213cF6C94;
    address public constant DEFAULT_MINT_SIGNER = 0x50f7838FA05B3B53722BdA926b84bB9cA6EDF791;
    address public constant V1_KEEP = 0x639061b01ab4261b4283a0AC9D3bB8B99013Bad4;
    address public constant IMPLINGZ = 0x81D2D1f0e92285CdD22Aa3cbc6956B6E1724d029;

    event ImpKeepsV2Deployed(address keep, address mintSigner, address royaltyReceiver);

    function run() external returns (address keep) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address signer = vm.envOr("MINT_SIGNER", DEFAULT_MINT_SIGNER);
        string memory baseURI = vm.envOr("DUNGEON_BASE_URI", "https://j00ba.xyz/api/keep-v2/");
        string memory collectionURI = vm.envOr("DUNGEON_CONTRACT_URI", "https://j00ba.xyz/api/keep-v2-collection");

        uint256[9] memory allow = [
            0xfffffffffffffffffffffffffffffefffffffffffffffffffffffffffffffffe,
            0xfffffffffffffffffffffffffffffffffffffffffeffffffffffffffffffffff,
            0xfffffffffffffffffffffffffffffffffffffffffffffffff7ff7fffffffffff,
            0xffffffffffffffffffeffffffffff7ffffffffffffffffffffffffffffffffff,
            0x27100a90518a04328525092448626408744d04d152112032a010a89014daefbf,
            0x800008413024901c8442048270054156122098cacd324106351a7159d4218796,
            0xaebb55fffefff8302b4a99636504a693989b2095aa0098893021092480101084,
            0xeeefbddbb5ef6ef76f6edbeef4ef77ddfbdebbbbbdeb77fffffffffffffffffd,
            0x3730c10200901835edf5df3dfbbd7c8ccd6ef7bb6f7
        ];

        vm.startBroadcast(deployerKey);
        ImpKeepsV2 deployed = new ImpKeepsV2(
            signer,
            CREATOR,
            800,
            baseURI,
            collectionURI,
            V1_KEEP,
            IMPLINGZ,
            allow
        );
        vm.stopBroadcast();

        keep = address(deployed);
        emit ImpKeepsV2Deployed(keep, signer, CREATOR);
    }
}
