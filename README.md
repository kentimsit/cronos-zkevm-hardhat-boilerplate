# Cronos zkEVM Hardhat project template

## Overview

This project is based on [Welcome | Welcome to our Docs | zkSync Era Docs](https://era.zksync.io/docs/dev/), customized for Cronos zkEVM Testnet.

If you are planning to deploy a ERC20 token on Cronos zkEVM, keep in mind that there are two ways to do this:

-   Deploy directly on the L2: this approach is simple to implement, but in that case, the ERC20 token won’t be supported natively by the hyperbridge between L1 and L2, and between hyperchains. A custom bridge will be required to withdraw or transfer tokens from the L2.
-   Deploy first on the L1, then deposit to the L2: this approach requires several steps, but its advantage is that the tokens will be natively supported by the hyperbridge between L1 and L2. They can be deposited into the L2, or withdrawn from the L2, at will.

In this repository, both approaches are demonstrated.

## Installation

```bash
nvm use 18
```

This project was created by creating a standard hardhat project, and then migrating it to be compatible with ZK Stack using the instructions described in the ZK Sync documentation.

If you are using a project already created like this one, you can install it with `npm install`.

To write smart contracts, use the OpenZeppelin version supported by the dependencies ("@openzeppelin/contracts": "^4.9.2”) and compiler. OpenZeppelin V5 is not supported.

## Compile and test contracts

The frequently used shell commands are:

```bash
# Compile all smart contracts
npx hardhat compile
# Run tests
npx hardhat test
# Check test coverage (this may throw errors)
npx hardhat coverage
```

## Deploy a smart contract directly on L2 (Cronos zkEVM Testnet)

To deploy a smart contract to Cronos zkEVM Testnet, select `cronosZkevmSepoliaTestnet` as the `defaultNetwork` in `hardhat.config.ts`.

The frequently used shell commands are:

```bash
# Deploy on Cronos zkEVM Testnet
npx hardhat deploy-zksync --network cronosZkevmSepoliaTestnet --script erc20/deploy.ts
```

The deployment script performs the contract verification so that the smart contract's code and read/write interfaces can be seen on the https://zkevm-t0.cronos.org/explorer/address/0xAddress#contract block explorer web page.

## Deploy a token on Ethereum and deposit tokens to L2

Deploy the token to Ethereum Sepolia

```bash

# Deploy on Ethereum Sepolia
npx hardhat run deploy/erc20/deploy_l1.ts --network ethereumSepoliaTestnet

# Deposit from L1 to L2
npx ts-node scripts/bridge_cronos_zkevm.ts
```

Note 1: Before depositing from Ethereum Sepolia to Cronos zkEVM Testnet, you need to have a sufficient amount of TCRO on your wallet on Ethereum Sepolia, in order to pay for gas on Cronos zkEVM Testnet during the deposit.

Note 2: The script used to deposit ERC20 from L1 to Cronos zkEVM L2 differs somewhat from the documentation provided by zkSync to deposit ERC20 from L1 to zkSync Era. This is because Cronos zkEVM uses a custom protocol token (Testnet CRO instead of ETH), which means that some of the wrapping functions provided by zkSync do not work. Hence we are going below the highest level of abstraction and calling smart contract functions directly.
