// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {DungeonKeep} from "../contracts/DungeonKeep.sol";

interface Vm {
    function envUint(string calldata key) external view returns (uint256);
    function envOr(string calldata key, address defaultValue) external view returns (address);
    function envOr(string calldata key, string calldata defaultValue) external view returns (string memory);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

/// Deploy Imp Keeps only. Does not touch DerpRewards / KeepMarket.
contract DeployDungeonKeep {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    address public constant CREATOR = 0x53391bf6931E3a8d829029b2a7640f3213cF6C94;
    address public constant DEFAULT_MINT_SIGNER = 0x50f7838FA05B3B53722BdA926b84bB9cA6EDF791;

    event DungeonKeepDeployed(address keep, address mintSigner, address royaltyReceiver);

    function run() external returns (address keep) {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address signer = vm.envOr("MINT_SIGNER", DEFAULT_MINT_SIGNER);
        string memory baseURI = vm.envOr("DUNGEON_BASE_URI", "https://j00ba.xyz/api/keep/");
        string memory collectionURI = vm.envOr("DUNGEON_CONTRACT_URI", "https://j00ba.xyz/api/keep-collection");

        vm.startBroadcast(deployerKey);
        DungeonKeep deployed = new DungeonKeep(signer, CREATOR, 800, baseURI, collectionURI);
        vm.stopBroadcast();

        keep = address(deployed);
        emit DungeonKeepDeployed(keep, signer, CREATOR);
    }
}
