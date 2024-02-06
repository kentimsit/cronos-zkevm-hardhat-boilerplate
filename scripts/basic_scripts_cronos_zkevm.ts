// Run with:
// npx ts-node scripts/basic_scripts_cronos_zkevm.ts

// Basic functions to check transactions, blocks and batches status on L1 and L2 network

import * as dotenv from "dotenv";
dotenv.config();

import {
    Wallet as ZkWallet,
    Provider as ZkProvider,
    utils as Zkutils,
} from "zksync-ethers";
import { ethers } from "ethers";

// Import JSON ABIs
const CRO_L1_TOKEN_abi = require("./artifacts-era/Cronos.json").abi;
const ERC20_L1_TOKEN_abi =
    require("../artifacts/contracts/erc20/MyERC20Token.sol/MyERC20Token.json").abi;
const L1ERC20Bridge_abi = require("./artifacts-era/L1ERC20Bridge.json").abi;

// Define the type of shared object
type SharedObject = {
    l1Provider: ethers.JsonRpcProvider;
    l2Provider: ZkProvider;
    l1wallet: ethers.Wallet;
    l2wallet: ZkWallet;
    l1CroContract: ethers.Contract;
    l1Erc20Contract: ethers.Contract;
    l2Erc20Contract: ethers.Contract | null;
    l1Erc20BridgeContract: ethers.Contract;
    l1ZkSyncDiamondProxyContract: ethers.Contract;
};

/**
 * Retrieves the shared object containing various providers, wallets, and contract instances.
 * @returns {Promise<SharedObject>} The shared object.
 */
async function getSharedObject(): Promise<SharedObject> {
    // Constants
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY!;
    const CRO_L1_ADDRESS = process.env.CRO_L1_ADDRESS!;
    const ERC20_L1_ADDRESS = process.env.ERC20_L1_ADDRESS!;
    // The address of the ERC20 token on L2 may be empty string,
    // since it is only created by the bridge after the first token has been deposited from L1 to L2
    const ERC20_L2_ADDRESS = process.env.ERC20_L2_ADDRESS;
    const BRIDGE_ERC20_L1_PROXY_ADDRESS =
        process.env.BRIDGE_ERC20_L1_PROXY_ADDRESS!;
    const ZKSYNC_DIAMOND_PROXY_ADDRESS =
        process.env.ZKSYNC_DIAMOND_PROXY_ADDRESS!;

    // Web3 providers and wallets
    const l1Provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_SEPOLIA_URL
    );
    const l2Provider = new ZkProvider(process.env.CRONOS_ZKEVM_URL!);
    const l1wallet = new ethers.Wallet(PRIVATE_KEY, l1Provider);
    const l2wallet = new ZkWallet(PRIVATE_KEY, l2Provider, l1Provider);
    console.log("Using wallet address : ", l1wallet.address);

    // Contract instances
    const l1CroContract = new ethers.Contract(
        CRO_L1_ADDRESS,
        CRO_L1_TOKEN_abi,
        l1wallet
    );
    const l1Erc20Contract = new ethers.Contract(
        ERC20_L1_ADDRESS,
        ERC20_L1_TOKEN_abi,
        l1wallet
    );
    let l2Erc20Contract: ethers.Contract | null = null;
    if (ERC20_L2_ADDRESS) {
        l2Erc20Contract = new ethers.Contract(
            ERC20_L2_ADDRESS,
            ERC20_L1_TOKEN_abi,
            l2wallet
        );
    }
    const l1Erc20BridgeContract = new ethers.Contract(
        BRIDGE_ERC20_L1_PROXY_ADDRESS,
        L1ERC20Bridge_abi,
        l1wallet
    );
    const l1ZkSyncDiamondProxyContract = new ethers.Contract(
        ZKSYNC_DIAMOND_PROXY_ADDRESS,
        Zkutils.ZKSYNC_MAIN_ABI,
        l1wallet
    );

    return {
        l1Provider,
        l2Provider,
        l1wallet,
        l2wallet,
        l1CroContract,
        l1Erc20Contract,
        l2Erc20Contract,
        l1Erc20BridgeContract,
        l1ZkSyncDiamondProxyContract,
    };
}

/**
 * Checks the status of an L2 transaction.
 * @param sharedObject - The shared object containing the L2 provider.
 * @param hash - The hash of the transaction to check.
 * @returns {Promise<void>} - A promise that resolves once the status of the transaction has been checked.
 * The transaction statuses on L2 are: Pending, Included (in a block on L2), Verified (proven on L1), Failed
 * It can take up to 24 hours for a transaction to be proven on L1.
 */
async function checkL2TransactionStatus(
    sharedObject: SharedObject,
    hash: string
) {
    console.log("Transaction hash: ", hash);
    const l2Transaction = await sharedObject.l2Provider.getTransaction(hash);
    console.log("Block number: ", l2Transaction.blockNumber);

    const l2TransactionReceipt =
        await sharedObject.l2Provider.getTransactionReceipt(hash);
    console.log("Batch number: ", l2TransactionReceipt.l1BatchNumber);
    const l2TransactionDetails =
        await sharedObject.l2Provider.getTransactionDetails(hash);
    console.log("L2 transaction status: ", l2TransactionDetails.status);
    console.log(
        "L1 commit transaction hash: ",
        l2TransactionDetails.ethCommitTxHash
    );
    console.log(
        "L1 prove transaction hash: ",
        l2TransactionDetails.ethProveTxHash
    );
    console.log(
        "L2 execute transaction hash: ",
        l2TransactionDetails.ethExecuteTxHash
    );
}

async function getL2AddressofL1Token(
    sharedObject: SharedObject,
    l1TokenAddress: string
) {
    const tokenL2Address = await sharedObject.l2Provider.l2TokenAddress(
        l1TokenAddress
    );
    console.log("Token L2 address: ", tokenL2Address);
    return tokenL2Address;
}

// Main script
async function main() {
    const hash =
        "0xbf78bd9b655325c5c752e32c00e4851aa68b7160f07d270da60f3f3279065a0c";

    const sharedObject = await getSharedObject().catch(console.error);
    if (sharedObject) {
        // await getL2AddressofL1Token(
        //     sharedObject,
        //     process.env.ERC20_L1_ADDRESS!
        // );
        await checkL2TransactionStatus(sharedObject, hash).catch(console.error);
    }
}

main().catch(console.error);
