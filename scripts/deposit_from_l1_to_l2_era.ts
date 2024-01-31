// WORK IN PROGRESS
// Run with:
// npm run deposit_l1_to_l2

import * as dotenv from "dotenv";
dotenv.config();

import {
    Wallet as ZkWallet,
    Provider as ZkProvider,
    utils as Zkutils,
} from "zksync-ethers";
import { ethers } from "ethers";

async function main() {
    // Set up
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
        ? process.env.WALLET_PRIVATE_KEY
        : "";
    const l1Provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_SEPOLIA_URL
    );
    const l2Provider = new ZkProvider("https://sepolia.era.zksync.dev");
    const wallet = new ZkWallet(PRIVATE_KEY, l2Provider, l1Provider);
    const ERC20_L1_TOKEN_ADDRESS = process.env.ERC20_L1_TOKEN_ADDRESS
        ? process.env.ERC20_L1_TOKEN_ADDRESS
        : "";
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
        const receipt = await l1Provider.getTransactionReceipt(
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
