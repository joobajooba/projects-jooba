pragma solidity ^0.8.24;

import {DerpRewards} from "../contracts/DerpRewards.sol";

interface Vm {
    function envUint(string calldata key) external view returns (uint256);
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
}

contract DeployDerpRewards {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    address constant DERP_TOKEN = 0x6543b7746ca744c4bb2198191e71f40ff04c41b9;
    address constant HOT_WALLET = 0x50f7838FA05B3B53722BdA926b84bB9cA6EDF791;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerKey);
        DerpRewards rewards = new DerpRewards(DERP_TOKEN);
        rewards.setOperator(HOT_WALLET, true);
        vm.stopBroadcast();
    }
}
