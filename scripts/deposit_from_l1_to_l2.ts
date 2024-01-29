// WORK IN PROGRESS
// Run with:
// npm run deposit_l1_to_l2

import * as dotenv from "dotenv";
dotenv.config();

import { Wallet, Provider, utils } from "zksync-ethers";
import { ethers } from "ethers";

const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
    ? process.env.WALLET_PRIVATE_KEY
    : "";

// For zkSync Era:
// const zkSyncProvider = new Provider("https://sepolia.era.zksync.dev");
// For Cronos zkEVM:
const zkSyncProvider = new Provider("https://rpc-hyperchain-t0.cronos.org");
const ethereumProvider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_SEPOLIA_URL
);
const wallet = new Wallet(PRIVATE_KEY, zkSyncProvider, ethereumProvider);

const ERC20_L1_TOKEN_ADDRESS = process.env.ERC20_L1_TOKEN_ADDRESS
    ? process.env.ERC20_L1_TOKEN_ADDRESS
    : "";

async function main() {
    // Depositing tokens to L2
    console.log("Depositing ERC20 tokens...");
    const depositHandle = await wallet.deposit({
        token: ERC20_L1_TOKEN_ADDRESS,
        amount: "1000000000000000000",
        approveERC20: true,
    });
    console.log("Tx hash: ", depositHandle.hash);
    console.log("Waiting for deposit transaction to be processed on L1");
    let waitForReceipt = true;
    while (waitForReceipt) {
        const receipt = await ethereumProvider.getTransactionReceipt(
            depositHandle.hash
        );
        console.log(receipt);
        if (receipt && receipt.blockNumber) {
            waitForReceipt = false;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    console.log("Waiting for deposit to be processed on L2");
    const committed = await depositHandle.wait();
    console.log(committed);
    console.log("Deposit committed");
}

main().catch(console.error);
