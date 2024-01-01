// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Croquemonsieur is ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    constructor() ERC20("Croquemonsieur", "CROK") {
        // Default initial supply of 1 million tokens (with 18 decimals)
        uint256 initialSupply = 1_000_000 * (10 ** 18);

        // The initial supply is minted to the deployer's address
        _mint(msg.sender, initialSupply);

        // The deployer is granted the default admin role and the minter role
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CONTROLLER_ROLE, msg.sender);
    }

    // Additional functions or overrides can be added here if needed.
    function forceTransfer(
        address from,
        address to,
        uint256 amount
    ) public virtual onlyRole(CONTROLLER_ROLE) {
        _transfer(from, to, amount);
    }

    function pause() public onlyRole(CONTROLLER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(CONTROLLER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyRole(CONTROLLER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @dev Internal functions
     */

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
