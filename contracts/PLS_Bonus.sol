// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PLS_Bonus is Ownable {
    using SafeERC20 for ERC20;

    ERC20 public bonusToken;
    uint256 public maxBonus;
    uint public tokenDebt;
    mapping(address => uint256) public userBonus;

    constructor(address _bonusToken, uint256 _maxBonus) {
        bonusToken = ERC20(_bonusToken);
        setMaxBonus(_maxBonus);
    }

    // Allows a user to claim their bonus
    function claimBonus() external {
        require(userBonus[msg.sender] != 0, "No bonus for user");
        uint256 claimAmt = userBonus[msg.sender];
        userBonus[msg.sender] = 0;
        tokenDebt -= claimAmt;
        bonusToken.safeTransfer(msg.sender, claimAmt);
    }

    //
    // ADMIN ONLY FUNCTIONS
    //
    function setMaxBonus(uint256 _maxBonus) public onlyOwner {
        maxBonus = _maxBonus;
    }

    // Add bonuses for users. New bonuses get added to old bonuses if any
    function addBonusForUsers(address[] calldata accs, uint256[] calldata bonus) external onlyOwner {
        require(accs.length == bonus.length, "Invalid Data: Unequal arrays");
        for (uint256 i = 0; i < accs.length; i++) {
            require(bonus[i] <= maxBonus, "Bonus amount exceeds max permissable bonus");
            userBonus[accs[i]] += bonus[i];
            tokenDebt += bonus[i];
        }
    }

    // Withdraw a certain amount of a token
    function withdrawToken(address token, uint256 amt) public onlyOwner {
        ERC20(token).safeTransfer(owner(), amt);
    }

    // Withdraw complete amount of a token
    function withdrawAllToken(address token) external onlyOwner {
        uint256 bal = ERC20(token).balanceOf(address(this));
        withdrawToken(token, bal);
    }
}
