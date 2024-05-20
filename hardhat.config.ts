import {HardhatUserConfig} from "hardhat/config";

import "@nomicfoundation/hardhat-toolbox";
import "@matterlabs/hardhat-zksync-node";
import "@matterlabs/hardhat-zksync-deploy";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-verify";

import * as dotenv from "dotenv";

dotenv.config();


const config: HardhatUserConfig = {
    defaultNetwork: "cronosZkEvmTestnet",
    networks: {
        hardhat: {
            zksync: false,
        },
        zkSyncMainnet: {
            url: "https://mainnet.era.zksync.io",
            ethNetwork: "mainnet",
            zksync: true,
            verifyURL:
                "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
        },
        cronosZkEvmTestnet: {
            url: "https://testnet.zkevm.cronos.org",
            ethNetwork: "sepolia", // or a Sepolia RPC endpoint from Infura/Alchemy/Chainstack etc.
            zksync: true,
            verifyURL: "https://explorer.zkevm.cronos.org/contract_verification",

        }
    },
    zksolc: {
        // For Cronos zkEVM, currently only supports zksolc version up to 1.4.1 for contract verification
        version: "1.4.1",
        settings: {
            // find all available options in the official documentation
            // https://era.zksync.io/docs/tools/hardhat/hardhat-zksync-solc.html#configuration
        },
    },
    solidity: {
        // For Cronos zkEVM, currently only supports solidity version up to 0.8.25 for contract verification
        version: "0.8.24",
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
