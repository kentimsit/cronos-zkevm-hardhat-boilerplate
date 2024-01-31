// WORK IN PROGRESS
// Run with:
// ts-node scripts/deposit_from_l1_to_l2_cronos_zkevm.ts

import * as dotenv from "dotenv";
dotenv.config();

import {
    Wallet as ZkWallet,
    Provider as ZkProvider,
    utils as Zkutils,
} from "zksync-ethers";
import { ethers } from "ethers";

import { MyERC20Token__factory as ERC20_L1_TOKENFactory} from "../typechain-types";
// Import JSON ABIs
const CRONOS_L1_TOKEN_abi = require("./artifacts-era/Cronos.json").abi;
const ERC20_L1_TOKEN_abi = require("../artifacts/contracts/erc20/MyERC20Token.sol/MyERC20Token.json").abi;
const L1ERC20Bridge_abi = require("./artifacts-era/L1ERC20Bridge.json").abi;


// Constants
const CRO_L1_TOKEN_ADDRESS = process.env.CONTRACTS_L1_CRO_TOKEN_ADDRESS!;
const ERC20_L1_TOKEN_ADDRESS = process.env.ERC20_L1_TOKEN_ADDRESS!
const L1_ERC20_BRIDGE_ADDRESS =
    process.env.CONTRACTS_L1_ERC20_BRIDGE_IMPL_ADDR!;
const ZKSYNC_ADDRESS = process.env.CONTRACTS_DIAMOND_PROXY_ADDR!;

// UNUSED
const CRO_ADDRESS = process.env.CONTRACTS_L1_CRO_TOKEN_ADDR!;
const MNEMONIC = process.env.MNEMONIC!;
const MAILBOX_ADDRESS = process.env.CONTRACTS_MAILBOX_FACET_ADDR!;
const ALLOW_LIST_ADDRESS = process.env.CONTRACTS_L1_ALLOW_LIST_ADDR!;
const L2ETH_ADDRESS = "0x000000000000000000000000000000000000800a";


async function main() {
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
    const ERC20_L1_TOKEN = new ethers.Contract(ERC20_L1_TOKEN_ADDRESS, ERC20_L1_TOKEN_abi, l1wallet);
    console.log("Current ERC20 wallet balance on L1: ", ethers.formatEther(await ERC20_L1_TOKEN.balanceOf(l1wallet.address)));
    const L1ERC20Bridge = new ethers.Contract(L1_ERC20_BRIDGE_ADDRESS, L1ERC20Bridge_abi, l1wallet);
    console.log("L1 ERC20 Bridge contract address", await L1ERC20Bridge.getAddress());

    // Approve the bridge to spend ERC20 tokens
    console.log("Approving Bridge for spending ERC20 token on L1...");
    const amountTransferred = "1"
    let tx = await ERC20_L1_TOKEN.approve(await L1ERC20Bridge.getAddress(), ethers.parseEther(amountTransferred));
    await tx.wait();
    let allowance = await ERC20_L1_TOKEN.allowance(l1wallet.address, await L1ERC20Bridge.getAddress());
    console.log("ERC20 allowance: ", ethers.formatEther(allowance), "token");

    // Approve zksync to spend gas token
    console.log("Approve ZKSync for spending gas token on L1...");
    // const ZKSYNC_DIAMOND_PROXY = new ethers.Contract(ZKSYNC_ADDRESS, Zkutils.ZKSYNC_MAIN_ABI, l1wallet);
    const CRO = new ethers.Contract(CRO_L1_TOKEN_ADDRESS, CRONOS_L1_TOKEN_abi, l1wallet);
    tx = await CRO.approve(ZKSYNC_ADDRESS, ethers.parseEther("9999999999"));
    await tx.wait();
    allowance = await CRO.allowance(l1wallet.address, ZKSYNC_ADDRESS);
    console.log("Gas token allowance allowance: ", ethers.formatEther(allowance), "CRO");

    // Estimate the cost of the deposit transaction on L2
    const DEPOSIT_L2_GAS_LIMIT = 10_000_000;
    const gasPrice = await l2Provider.getGasPrice();
    console.log("Current gas price on L2: ", ethers.formatUnits(gasPrice, "gwei"), "Gwei");
    const ZKSYNC_DIAMOND_PROXY = new ethers.Contract(ZKSYNC_ADDRESS, Zkutils.ZKSYNC_MAIN_ABI, l1wallet);
    const expectedCost = await ZKSYNC_DIAMOND_PROXY.l2TransactionBaseCost(
        gasPrice,
        DEPOSIT_L2_GAS_LIMIT,
        Zkutils.DEFAULT_GAS_PER_PUBDATA_LIMIT
    );

    console.log("Expected cost of deposit transaction on L2: ", ethers.formatEther(expectedCost) , "ETH");

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
    tx = await L1ERC20Bridge["deposit(address,address,uint256,uint256,uint256,address,uint256)"](
        l2wallet.address,
        ERC20_L1_TOKEN_ADDRESS,
        ethers.parseEther("100"),
        10_000_000,
        800,
        l2wallet.address,
        ethers.parseEther(amountTransferred),
        {
            gasLimit: 410000,
        },
    )

    let receipt = await tx.wait();
    console.log("Deposit transaction receipt: ", receipt);
}

main().catch(console.error);
