pragma solidity ^0.8.24;

import {DungeonKeep} from "../contracts/DungeonKeep.sol";
import {DerpRewards} from "../contracts/DerpRewards.sol";

interface Vm {
    function envUint(string calldata key) external view returns (uint256);
    function envAddress(string calldata key) external view returns (address);
    function envString(string calldata key) external view returns (string memory);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract Deploy {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address signer = vm.envAddress("MINT_SIGNER");
        address derp = vm.envAddress("DERP_TOKEN");
        address creator = vm.envAddress("CREATOR_WALLET");
        string memory baseURI = vm.envString("DUNGEON_BASE_URI");
        string memory collectionURI = vm.envString("DUNGEON_CONTRACT_URI");

        vm.startBroadcast(deployerKey);
        DungeonKeep keep = new DungeonKeep(signer, creator, 800, baseURI, collectionURI);
        DerpRewards rewards = new DerpRewards(derp);
        vm.stopBroadcast();

        keep;
        rewards;
    }
}
