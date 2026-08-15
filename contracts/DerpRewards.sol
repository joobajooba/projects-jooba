// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DerpRewards {
    IERC20 public immutable derp;
    address public owner;
    mapping(address => bool) public operators;

    event OperatorUpdated(address indexed operator, bool allowed);
    event Drip(address indexed to, uint256 amount);
    event Funded(address indexed from, uint256 amount);

    error NotOwner();
    error NotOperator();
    error TransferFailed();

    constructor(address derpToken) {
        derp = IERC20(derpToken);
        owner = msg.sender;
        operators[msg.sender] = true;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender]) revert NotOperator();
        _;
    }

    function setOperator(address operator, bool allowed) external onlyOwner {
        operators[operator] = allowed;
        emit OperatorUpdated(operator, allowed);
    }

    function fund(uint256 amount) external {
        if (!derp.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        emit Funded(msg.sender, amount);
    }

    function drip(address to, uint256 amount) external onlyOperator {
        if (!derp.transfer(to, amount)) revert TransferFailed();
        emit Drip(to, amount);
    }

    function potBalance() external view returns (uint256) {
        return derp.balanceOf(address(this));
    }
}
