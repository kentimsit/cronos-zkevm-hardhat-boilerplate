import * as dotenv from "dotenv";
dotenv.config();

import { HardhatUserConfig } from "hardhat/config";

import "@matterlabs/hardhat-zksync-node";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
    networks: {
        zkSyncMainnet: {
            url: "https://mainnet.era.zksync.io",
            ethNetwork: "mainnet",
            zksync: true,
            verifyURL:
                "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
        },
        zkSyncSepoliaTestnet: {
            url: "https://sepolia.era.zksync.dev",
            ethNetwork: "sepolia",
            zksync: true,
            verifyURL:
                "https://explorer.sepolia.era.zksync.dev/contract_verification",
        },
        cronosZkevmSepoliaTestnet: {
            url: "https://rpc-zkevm-t0.cronos.org",
            ethNetwork: "sepolia",
            zksync: true,
            verifyURL: "https://zkevm-t0.cronos.org/contract_verification",
        },
        ethereumSepoliaTestnet: {
            url: process.env.ETHEREUM_SEPOLIA_URL,
            chainId: 11155111,
            accounts: [<string>process.env.WALLET_PRIVATE_KEY],
        },
        dockerizedNode: {
            url: "http://localhost:3050",
            ethNetwork: "http://localhost:8545",
            zksync: true,
        },
        inMemoryNode: {
            url: "http://127.0.0.1:8011",
            ethNetwork: "", // in-memory node doesn't support eth node; removing this line will cause an error
            zksync: true,
        },
        hardhat: {
            zksync: true,
        },
    },
    zksolc: {
        // For Cronos zkEVM, currently only supports zksolc versionn up to 1.3.19
        version: "1.3.19",
        settings: {
            // find all available options in the official documentation
            // https://era.zksync.io/docs/tools/hardhat/hardhat-zksync-solc.html#configuration
        },
    },
    solidity: {
        // For Cronos zkEVM, currently only supports solidity versionn up to 0.8.23
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
            viaIR: true,
        },
    },
};

export default config;
