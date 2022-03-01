// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract PLS is ERC20, Ownable {
    uint256 public taxPerc = 1500; // 15%
    address public taxWallet;
    mapping(address => bool) public isExcluded;

    constructor() ERC20("Planet League Stars", "PLS") {
        _mint(msg.sender, 100_000_000_000 * 10**decimals());
        taxWallet = msg.sender;
        isExcluded[msg.sender] = true;
    }

    // Overide transfer to account for tax
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address owner = _msgSender();

        (uint256 taxAmt, uint256 amtAfterTax) = calcTaxAndAmt(owner, to, amount);
        if (taxAmt != 0) {
            _transfer(owner, taxWallet, taxAmt);
        }
        _transfer(owner, to, amtAfterTax);
        return true;
    }

    // Overide transferFrom to account for tax
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        (uint256 taxAmt, uint256 amtAfterTax) = calcTaxAndAmt(from, to, amount);
        if (taxAmt != 0) {
            _transfer(from, taxWallet, taxAmt);
        }
        _transfer(from, to, amtAfterTax);
        // _transfer(from, to, amount);
        return true;
    }

    // Calculate tax and the amount remainaing after tax
    // Transfers to/from excluded wallets do not pay tax
    function calcTaxAndAmt(
        address from,
        address to,
        uint256 amount
    ) public view returns (uint256, uint256) {
        uint256 taxAmt = (amount * taxPerc) / 10000;
        // Excluded addresses don't pay tax
        if (isExcluded[from] || isExcluded[to]) {
            taxAmt = 0;
        }
        uint256 amtAfterTax = amount - taxAmt;
        return (taxAmt, amtAfterTax);
    }

    //
    // ADMIN ONLY FUNCTIONS
    //

    // Set Tax Percentage. 15% => 1500
    function setTaxPercent(uint256 _taxPerc) external onlyOwner {
        taxPerc = _taxPerc;
    }

    // Set Tax Wallet
    function setTaxWallet(address _taxWallet) external onlyOwner {
        taxWallet = _taxWallet;
    }

    // Whitelist addresses from tax
    function whitelistAddress(address[] calldata adds) external onlyOwner {
        for (uint256 i = 0; i < adds.length; i++) {
            isExcluded[adds[i]] = true;
        }
    }

    // Remove from whitelist, thus pay tax
    function unWhitelistAddress(address[] calldata adds) external onlyOwner {
        for (uint256 i = 0; i < adds.length; i++) {
            isExcluded[adds[i]] = false;
        }
    }
}
