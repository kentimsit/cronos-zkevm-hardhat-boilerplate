# Cronos zkEVM Tethys Testnet Demo (May 2024)

The goal of this repository is to demonstrate basic use of the Tethys release of the Cronos zkEVM testnet network (as of
May 2024).

# Set-up

This repository uses Node 20 with Typescript and the following packages:

- zksync-ethers (v6.7.1) and ethers (v6) (see https://docs.zksync.io/build/sdks/js/zksync-ethers/getting-started.html)
- hardhat (see https://docs.zksync.io/build/tooling/hardhat/migrating-to-zksync.html)

It was created using a standard hardhat project (https://hardhat.org/hardhat-runner/docs/guides/project-setup), and then migrated to be compatible with ZK Stack using the instructions
described in the ZK Sync documentation ("migration guide"). See `package.json`  for the full list of dependencies.

# Basic blockchain reading and writing operations

You can find the Cronos zkEVM testnet blockchain explorer at: https://explorer.zkevm.cronos.org/testnet/.

The corresponding scripts are in the /scripts_basic folder:

* s01_read_blockchain.ts: read wallet balances, blocks and transactions.



# Hardhat config

The settings for the Cronos zkEVM testnet network are as follows: 

```json lines
{
    cronosZkEvmTestnet: {
      url: "https://testnet.zkevm.cronos.org",
      ethNetwork: "sepolia", // or a Sepolia RPC endpoint from Infura/Alchemy/Chainstack etc.
      zksync: true,
      verifyURL: "https://testnet.zkevm.cronos.org/contract_verification",
    }
}
```

# Smart contracts

The smart contracts in this repository are written in Solidity and are based on the OpenZeppelin library. Considering that `@matterlabs/hardhat-zksync-upgradable` does not currently support OpenZeppelin libraries above v4.9.5, we are only using `@openzeppelin/contracts-upgradeable@4.9.5` and `@openzeppelin/contracts@4.9.5`.

# Basic blockchain reading and writing operations

