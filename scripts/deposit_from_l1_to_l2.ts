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

const zkSyncProvider = new Provider("https://sepolia.era.zksync.dev");
const ethereumProvider = new ethers.providers.JsonRpcProvider(
    process.env.ETHEREUM_SEPOLIA_URL
);
const wallet = new Wallet(PRIVATE_KEY, zkSyncProvider, ethereumProvider);

const ERC20_L1_TOKEN_ADDRESS = process.env.ERC20_L1_TOKEN_ADDRESS
    ? process.env.ERC20_L1_TOKEN_ADDRESS
    : "";

async function main() {
    // Bridging ERC20 tokens from Ethereum requires approving the tokens to the zkSync Ethereum smart contract.
    console.log("Approving ERC20 tokens...");
    const txHandle = await wallet.approveERC20(
        ERC20_L1_TOKEN_ADDRESS,
        "1000000000000000000" // 18 decimals
    );
    console.log("Tx hash: ", txHandle.hash);
    let waitForReceipt = true;
    while (waitForReceipt) {
        const receipt = await ethereumProvider.getTransactionReceipt(
            txHandle.hash
        );
        console.log(receipt);
        if (receipt && receipt.blockNumber) {
            waitForReceipt = false;
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    console.log("Tx approved");
    // Depositing tokens to zkSync
    console.log("Depositing ERC20 tokens...");
    const depositHandle = await wallet.deposit({
        token: ERC20_L1_TOKEN_ADDRESS,
        amount: "1000000000000000000",
        approveERC20: true,
    });
    console.log("Tx hash: ", depositHandle.hash);
    console.log("Waiting for deposit transaction to be processed");
    waitForReceipt = true;
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
    //  wait or the transaction to be processed on L1
    console.log("Waiting for deposit to be processed on L1");
    const processed = await depositHandle.waitL1Commit();
    console.log(processed);
    console.log("Deposit processed on L1");
    // Note that we wait not only for the L1 transaction to complete but also for it to be
    // processed by zkSync. If we want to wait only for the transaction to be processed on L1,
    // we can use `await usdcDepositHandle.waitL1Commit()`
    console.log("Waiting for deposit to be committed");
    const committed = await depositHandle.wait();
    console.log(committed);
    console.log("Deposit committed");
}

main().catch(console.error);
