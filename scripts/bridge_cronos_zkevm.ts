// Run with:
// npx ts-node scripts/bridge_cronos_zkevm.ts

// The main script deposits ERC20 tokens from to L1 (Ethereum Sepolia) to L2 (zkSync Era Sepolia)

import * as dotenv from "dotenv";
dotenv.config();

import {
    Wallet as ZkWallet,
    Provider as ZkProvider,
    utils as Zkutils,
} from "zksync-ethers";
import { ethers } from "ethers";

// Import JSON ABIs
const CRONOS_L1_TOKEN_abi = require("./artifacts-era/Cronos.json").abi;
const ERC20_L1_TOKEN_abi =
    require("../artifacts/contracts/erc20/MyERC20Token.sol/MyERC20Token.json").abi;
const L1ERC20Bridge_abi = require("./artifacts-era/L1ERC20Bridge.json").abi;

// Constants
const CRO_L1_TOKEN_ADDRESS = process.env.CONTRACTS_L1_CRO_TOKEN_ADDRESS!;
const ERC20_L1_TOKEN_ADDRESS = process.env.ERC20_L1_TOKEN_ADDRESS!;
const CONTRACTS_L1_ERC20_BRIDGE_PROXY_ADDR =
    process.env.CONTRACTS_L1_ERC20_BRIDGE_PROXY_ADDR!;
const ZKSYNC_ADDRESS = process.env.CONTRACTS_DIAMOND_PROXY_ADDR!;

// UNUSED
const CRO_ADDRESS = process.env.CONTRACTS_L1_CRO_TOKEN_ADDR!;
const MNEMONIC = process.env.MNEMONIC!;
const MAILBOX_ADDRESS = process.env.CONTRACTS_MAILBOX_FACET_ADDR!;
const ALLOW_LIST_ADDRESS = process.env.CONTRACTS_L1_ALLOW_LIST_ADDR!;
const L2ETH_ADDRESS = "0x000000000000000000000000000000000000800a";

async function withdraw_cro_l2_to_l1() {
    // Set up
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
        ? process.env.WALLET_PRIVATE_KEY
        : "";

    const l1Provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_SEPOLIA_URL
    );
    const l2Provider = new ZkProvider("https://rpc-hyperchain-t0.cronos.org");
    const l1wallet = new ethers.Wallet(PRIVATE_KEY, l1Provider);
    const l2wallet = new ZkWallet(PRIVATE_KEY, l2Provider, l1Provider);
    console.log("Using wallet address : ", l1wallet.address);
    // Contract instances
    const CRO = new ethers.Contract(
        CRO_L1_TOKEN_ADDRESS,
        CRONOS_L1_TOKEN_abi,
        l1wallet
    );
    console.log("L1 CRO contract address", await CRO.getAddress());
    let l1CROBalance = await CRO.balanceOf(l1wallet.address);
    console.log(
        "Current CRO balance on l1: ",
        ethers.formatEther(l1CROBalance),
        "CRO"
    );
    let l2CRObalance = await l2Provider.getBalance(l2wallet.address);
    console.log(
        "Current CRO balance on l2: ",
        ethers.formatEther(l2CRObalance)
    );

    // Amount to be bridged
    const amountTransferred = "1";

    // Withdraw CRO from L2 to L1 and wait for the batch to be finalized
    console.log("withdrawing CRO....");
    const withdrawL2 = await l2wallet.withdraw({
        token: L2ETH_ADDRESS,
        amount: ethers.parseEther(amountTransferred),
        to: l1wallet.address,
    });

    const receipt = await withdrawL2.wait();
    console.log("Transaction hash on L2: ", receipt.hash);
    console.log("Waiting for withdrawal to be included in a batch on L1...");
    let includedInBatch = false;
    while (!includedInBatch) {
        const updatedReceipt = await l2Provider.getTransactionReceipt(
            receipt.hash
        );
        console.log(updatedReceipt);
        if (updatedReceipt.l1BatchNumber) {
            includedInBatch = true;
            console.log("For transaction hash: ", receipt.hash);
            console.log(
                "Withdrawal included in batch: ",
                updatedReceipt.l1BatchNumber
            );
            return receipt.hash;
        } else {
            // Wait 3 minutes
            await new Promise((resolve) => setTimeout(resolve, 180000));
        }
    }
}

// It may take a while before the withdrawal can be finalized on L1
// TCRO contract on L1: https://sepolia.etherscan.io/token/0x1c815aca8daacdf46805fbFB9F08abD1D614773D
async function finalize_withdrawal_cro_l2_to_l1() {
    const hash =
        "0xe9874d99980f4acb6439648e42efdb9597020f81a5e87c81e8eeb3f5654cf6e7";
    // Set up
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
        ? process.env.WALLET_PRIVATE_KEY
        : "";

    const l1Provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_SEPOLIA_URL
    );
    const l2Provider = new ZkProvider("https://rpc-hyperchain-t0.cronos.org");
    const l1wallet = new ethers.Wallet(PRIVATE_KEY, l1Provider);
    const l2wallet = new ZkWallet(PRIVATE_KEY, l2Provider, l1Provider);
    console.log("Using wallet address : ", l1wallet.address);
    // Contract instances
    const ERC20_L1_TOKEN = new ethers.Contract(
        ERC20_L1_TOKEN_ADDRESS,
        ERC20_L1_TOKEN_abi,
        l1wallet
    );
    console.log(
        "Current ERC20 wallet balance on L1: ",
        ethers.formatEther(await ERC20_L1_TOKEN.balanceOf(l1wallet.address))
    );
    const L1ERC20Bridge = new ethers.Contract(
        CONTRACTS_L1_ERC20_BRIDGE_PROXY_ADDR,
        L1ERC20Bridge_abi,
        l1wallet
    );
    console.log(
        "L1 ERC20 Bridge contract address",
        await L1ERC20Bridge.getAddress()
    );
    const CRO = new ethers.Contract(
        CRO_L1_TOKEN_ADDRESS,
        CRONOS_L1_TOKEN_abi,
        l1wallet
    );
    console.log("L1 CRO contract address", await CRO.getAddress());
    const ZKSYNC_DIAMOND_PROXY = new ethers.Contract(
        ZKSYNC_ADDRESS,
        Zkutils.ZKSYNC_MAIN_ABI,
        l1wallet
    );
    console.log(
        "ZKSync Diamond Proxy contract address",
        await ZKSYNC_DIAMOND_PROXY.getAddress()
    );

    // Get the details of the batch on L1
    const {
        l1BatchNumber,
        l2MessageIndex,
        l2TxNumberInBlock,
        message,
        sender,
        proof,
    } = await l2wallet.finalizeWithdrawalParams(hash, 0);
    console.log("l1BatchNumber: ", l1BatchNumber);
    console.log("l2MessageIndex: ", l2MessageIndex);
    console.log("l2TxNumberInBlock: ", l2TxNumberInBlock);
    console.log("message: ", message);
    console.log("sender: ", sender);
    console.log("proof: ", proof);
    // Finalize the withdrawal
    console.log("Finalize withdrawal...");
    let tx = await ZKSYNC_DIAMOND_PROXY.finalizeEthWithdrawal(
        l1BatchNumber,
        l2MessageIndex,
        l2TxNumberInBlock,
        message,
        proof,
        {
            gasLimit: 410000,
        }
    );
    const finalizedReceipt = await tx.wait();
    console.log("L1 receipt", finalizedReceipt);

    // Check the balances
    console.log(
        "Current CRO balance on l1: ",
        ethers.formatEther(await CRO.balanceOf(l1wallet.address)),
        "CRO"
    );
    console.log(
        "Current CRO balance on l2: ",
        ethers.formatEther(await l2Provider.getBalance(l2wallet.address))
    );
}

async function deposit_erc20_l1_to_l2() {
    // Set up
    const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY
        ? process.env.WALLET_PRIVATE_KEY
        : "";

    const l1Provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_SEPOLIA_URL
    );
    const l2Provider = new ZkProvider("https://rpc-hyperchain-t0.cronos.org");
    const l1wallet = new ethers.Wallet(PRIVATE_KEY, l1Provider);
    const l2wallet = new ZkWallet(PRIVATE_KEY, l2Provider, l1Provider);
    console.log("Using wallet address : ", l1wallet.address);
    // Contract instances
    const ERC20_L1_TOKEN = new ethers.Contract(
        ERC20_L1_TOKEN_ADDRESS,
        ERC20_L1_TOKEN_abi,
        l1wallet
    );
    console.log(
        "Current ERC20 wallet balance on L1: ",
        ethers.formatEther(await ERC20_L1_TOKEN.balanceOf(l1wallet.address))
    );
    const L1ERC20Bridge = new ethers.Contract(
        CONTRACTS_L1_ERC20_BRIDGE_PROXY_ADDR,
        L1ERC20Bridge_abi,
        l1wallet
    );
    console.log(
        "L1 ERC20 Bridge contract address",
        await L1ERC20Bridge.getAddress()
    );
    const CRO = new ethers.Contract(
        CRO_L1_TOKEN_ADDRESS,
        CRONOS_L1_TOKEN_abi,
        l1wallet
    );
    console.log("L1 CRO contract address", await CRO.getAddress());
    const ZKSYNC_DIAMOND_PROXY = new ethers.Contract(
        ZKSYNC_ADDRESS,
        Zkutils.ZKSYNC_MAIN_ABI,
        l1wallet
    );
    console.log(
        "ZKSync Diamond Proxy contract address",
        await ZKSYNC_DIAMOND_PROXY.getAddress()
    );

    // Amount to be bridged
    const amountTransferred = "1";

    // Approve the bridge to spend ERC20 tokens
    console.log("Approving Bridge for spending ERC20 token on L1...");

    let tx = await ERC20_L1_TOKEN.approve(
        await L1ERC20Bridge.getAddress(),
        ethers.parseEther(amountTransferred)
    );
    await tx.wait();
    let allowance = await ERC20_L1_TOKEN.allowance(
        l1wallet.address,
        await L1ERC20Bridge.getAddress()
    );
    console.log("ERC20 allowance: ", ethers.formatEther(allowance), "token");

    // Approve zksync to spend gas token
    console.log("Approve ZKSync for spending gas token on L1...");
    console.log(
        "Current CRO balance on L1: ",
        ethers.formatEther(await CRO.balanceOf(l1wallet.address))
    );
    tx = await CRO.approve(ZKSYNC_ADDRESS, ethers.parseEther("9999999999"));
    await tx.wait();
    allowance = await CRO.allowance(l1wallet.address, ZKSYNC_ADDRESS);
    console.log(
        "Gas token allowance allowance: ",
        ethers.formatEther(allowance),
        "CRO"
    );

    // Estimate the cost of the deposit transaction on L2
    const DEPOSIT_L2_GAS_LIMIT = 10_000_000;
    const DEPOSIT_GAS_PER_PUBDATA_LIMIT = 800;
    const feeData = await l1Provider.getFeeData();
    const gasPrice = feeData.gasPrice ? feeData.gasPrice : 0;
    console.log(
        "Current gas price on L1: ",
        ethers.formatUnits(gasPrice, "gwei"),
        "Gwei"
    );

    const expectedCost = await ZKSYNC_DIAMOND_PROXY.l2TransactionBaseCost(
        gasPrice,
        DEPOSIT_L2_GAS_LIMIT,
        DEPOSIT_GAS_PER_PUBDATA_LIMIT
    );

    console.log(
        "Expected cost of deposit transaction on L2: ",
        ethers.formatEther(expectedCost),
        "ETH"
    );

    // Call the bridge's deposit function
    //     function deposit(
    //         address _l2Receiver,
    //         address _l1Token,
    //         uint256 _amount,
    //         uint256 _l2TxGasLimit,
    //         uint256 _l2TxGasPerPubdataByte,
    //         address _refundRecipient,
    //         uint256 _l1Amount
    // ) public nonReentrant senderCanCallFunction(allowList) returns (bytes32 l2TxHash)
    // Making the deposit
    console.log("Calling deposit function...");
    console.log("Destination address: ", l2wallet.address);
    tx = await L1ERC20Bridge[
        "deposit(address,address,uint256,uint256,uint256,address,uint256)"
    ](
        l2wallet.address,
        ERC20_L1_TOKEN_ADDRESS,
        ethers.parseEther(amountTransferred),
        DEPOSIT_L2_GAS_LIMIT,
        DEPOSIT_GAS_PER_PUBDATA_LIMIT,
        l2wallet.address,
        expectedCost,
        {
            gasLimit: 410000,
        }
    );

    let receipt = await tx.wait();
    console.log("Deposit transaction receipt: ", receipt);
}

// Select the function to run here

// deposit_erc20_l1_to_l2().catch(console.error);
// withdraw_cro_l2_to_l1().catch(console.error);
finalize_withdrawal_cro_l2_to_l1().catch(console.error);
