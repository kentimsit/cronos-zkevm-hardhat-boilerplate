// Run with:
// npx ts-node scripts/bridge_cronos_zkevm.ts

// The main script deposits ERC20 tokens from to L1 (Ethereum Sepolia) to L2 (zkSync Era Sepolia)

import * as dotenv from "dotenv";
dotenv.config();

import {
    Wallet as ZkWallet,
    Provider as ZkProvider,
    utils as Zkutils,
    types as ZkTypes,
} from "zksync-ethers";
import { ethers } from "ethers";
import { l2 } from "../typechain-types/@matterlabs/zksync-contracts";

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
    l2CroAddress: string;
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
    // The L2 address can be derived from the L1 address using getL2AddressofL1Token in the basic scripts file
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
    // Test CRO token on Ethereum Sepolia Testnet
    const l1CroContract = new ethers.Contract(
        CRO_L1_ADDRESS,
        CRO_L1_TOKEN_abi,
        l1wallet
    );
    // Test ERC20 token on Ethereum Sepolia Testnet (any ERC20 created by user)
    const l1Erc20Contract = new ethers.Contract(
        ERC20_L1_ADDRESS,
        ERC20_L1_TOKEN_abi,
        l1wallet
    );
    // Test ERC20 token on Cronos zkEVM L2 Testnet
    // This token is only created by the bridge after the first token has been deposited from L1 to L2
    let l2Erc20Contract: ethers.Contract | null = null;
    if (ERC20_L2_ADDRESS) {
        l2Erc20Contract = new ethers.Contract(
            ERC20_L2_ADDRESS,
            ERC20_L1_TOKEN_abi,
            l2wallet
        );
    }
    // L1/L2 Bridge contract for ERC20 on L1
    const l1Erc20BridgeContract = new ethers.Contract(
        BRIDGE_ERC20_L1_PROXY_ADDRESS,
        L1ERC20Bridge_abi,
        l1wallet
    );
    // ZkSync Diamond Proxy contract on L1
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
        l2CroAddress: process.env.CRO_L2_ADDRESS!,
        l1Erc20Contract,
        l2Erc20Contract,
        l1Erc20BridgeContract,
        l1ZkSyncDiamondProxyContract,
    };
}

/**
 * Retrieves the balances of CRO and ERC20 tokens on both L1 and L2 networks.
 * @param {SharedObject} shareObject - The shared object containing the necessary providers, wallets, and contract instances.
 * @returns {Promise<void>} A promise that resolves once the balances are retrieved and logged.
 */
async function getBalances(shareObject: SharedObject): Promise<void> {
    if (
        shareObject.l1wallet &&
        shareObject.l2wallet &&
        shareObject.l1CroContract &&
        shareObject.l2Provider &&
        shareObject.l1Erc20Contract
    ) {
        const l1CROBalance = await shareObject.l1CroContract.balanceOf(
            shareObject.l1wallet.address
        );
        console.log(
            "Current CRO balance on l1: ",
            ethers.formatEther(l1CROBalance),
            "CRO"
        );
        const l2CRObalance = await shareObject.l2Provider.getBalance(
            shareObject.l2wallet.address
        );
        console.log(
            "Current CRO balance on l2: ",
            ethers.formatEther(l2CRObalance)
        );
        const l1Erc20Balance = await shareObject.l1Erc20Contract.balanceOf(
            shareObject.l1wallet.address
        );
        console.log(
            "Current ERC20 balance on l1: ",
            ethers.formatEther(l1Erc20Balance)
        );
        if (shareObject.l2Erc20Contract) {
            const l2Erc20Balance = await shareObject.l2Erc20Contract.balanceOf(
                shareObject.l2wallet.address
            );
            console.log(
                "Current ERC20 balance on l2: ",
                ethers.formatEther(l2Erc20Balance)
            );
        }
    }
}

/**
 * Deposits ERC20 tokens from Layer 1 to Layer 2.
 * The wallet must have the necessary Test CRO tokens on L1 (to pay for gas on L2), and ERC20 tokens on L1.
 * To obtain TCRO tokens on L1, please ask in Discord.
 * If this script does not work, try again
 * @param sharedObject - The shared object containing the necessary contracts and wallets.
 * @param amountTransferred - The amount of tokens to be transferred.
 * @returns A promise that resolves to the transaction receipt of the deposit.
 */
async function deposit_erc20_l1_to_l2(
    sharedObject: SharedObject,
    amountTransferred: number
): Promise<string> {
    if (
        sharedObject.l1Erc20Contract &&
        sharedObject.l1Erc20BridgeContract &&
        sharedObject.l1wallet
    ) {
        // Approve the bridge to spend ERC20 tokens
        console.log(
            "ERC20 token address on L1:",
            await sharedObject.l1Erc20Contract.getAddress()
        );
        console.log("Approving Bridge for spending ERC20 token on L1...");
        let tx = await sharedObject.l1Erc20Contract.approve(
            await sharedObject.l1Erc20BridgeContract.getAddress(),
            ethers.parseEther(amountTransferred.toString())
        );
        await tx.wait();
        // Check allowance
        let allowance = await sharedObject.l1Erc20Contract.allowance(
            sharedObject.l1wallet.address,
            await sharedObject.l1Erc20BridgeContract.getAddress()
        );
        console.log(
            "ERC20 allowance: ",
            ethers.formatEther(allowance),
            "token"
        );

        // Estimate the cost of the deposit transaction on L2
        const DEPOSIT_L2_GAS_LIMIT = 10_000_000;
        const DEPOSIT_GAS_PER_PUBDATA_LIMIT = 800;
        const feeData = await sharedObject.l1Provider.getFeeData();
        const gasPrice = feeData.gasPrice ? feeData.gasPrice : 0;
        console.log(
            "Current gas price on L1: ",
            ethers.formatUnits(gasPrice, "gwei"),
            "Gwei"
        );
        let expectedCost =
            await sharedObject.l1ZkSyncDiamondProxyContract.l2TransactionBaseCost(
                gasPrice,
                DEPOSIT_L2_GAS_LIMIT,
                DEPOSIT_GAS_PER_PUBDATA_LIMIT
            );

        console.log(
            "Expected cost of deposit transaction on L2: ",
            ethers.formatEther(expectedCost),
            "CRO"
        );
        // Gross up expectedCost by 20%
        expectedCost = (expectedCost * BigInt(120)) / BigInt(100);
        // Approve zksync to spend gas token on L1
        console.log("Approve ZKSync for spending gas token on L1...");
        tx = await sharedObject.l1CroContract.approve(
            await sharedObject.l1ZkSyncDiamondProxyContract.getAddress(),
            ethers.parseEther("9999999999")
        );
        await tx.wait();
        // Check allowance
        allowance = await sharedObject.l1CroContract.allowance(
            sharedObject.l1wallet.address,
            await sharedObject.l1ZkSyncDiamondProxyContract.getAddress()
        );
        console.log(
            "Gas token allowance allowance: ",
            ethers.formatEther(allowance),
            "CRO"
        );

        // Call the bridge's deposit function
        // See bridge contract: https://github.com/cronos-labs/era-contracts/blob/custom-gas-token/ethereum/contracts/bridge/L1ERC20Bridge.sol
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
        console.log("Destination address: ", sharedObject.l2wallet.address);
        console.log("Amount: ", amountTransferred.toString(), "ERC20 tokens");
        tx = await sharedObject.l1Erc20BridgeContract[
            "deposit(address,address,uint256,uint256,uint256,address,uint256)"
        ](
            sharedObject.l2wallet.address,
            await sharedObject.l1Erc20Contract.getAddress(),
            ethers.parseEther(amountTransferred.toString()),
            DEPOSIT_L2_GAS_LIMIT,
            DEPOSIT_GAS_PER_PUBDATA_LIMIT,
            sharedObject.l2wallet.address,
            expectedCost,
            {
                gasLimit: 410000,
            }
        );

        let receipt = await tx.wait();
        console.log("Deposit transaction hash: ", receipt.hash);
        return receipt.hash;
    }
    return "";
}

async function get_l2tx_from_l1tx(
    sharedObject: SharedObject,
    hash: string
): Promise<string> {
    const l1TxResponse = await sharedObject.l1Provider.getTransaction(hash);
    if (l1TxResponse) {
        const l2TxResponse =
            await sharedObject.l2Provider.getL2TransactionFromPriorityOp(
                l1TxResponse
            );
        console.log("l2TxResponse hash: ", l2TxResponse.hash);
        return l2TxResponse.hash;
    }
    return "";
}

async function withdraw_erc20_l2_to_l1(
    sharedObject: SharedObject,
    amountTransferred: number
) {
    // Withdraw ERC20 from L2 to L1
    console.log("withdrawing ERC20....");
    const l2Erc20Address = await sharedObject.l2Erc20Contract?.getAddress();
    console.log("ERC20 address on L2:", l2Erc20Address);
    if (l2Erc20Address) {
        console.log("Recipient:", sharedObject.l1wallet.address);
        const withdrawL2 = await sharedObject.l2wallet.withdraw({
            token: l2Erc20Address,
            amount: ethers.parseEther(amountTransferred.toString()),
            to: sharedObject.l1wallet.address,
        });

        const receipt = await withdrawL2.wait();
        console.log("Transaction hash on L2: ", receipt.hash);
        return receipt.hash;
        // TODO: Finalize withdrawal on L1
    }
    return "";
}

async function deposit_cro_l1_to_l2(
    sharedObject: SharedObject,
    amountTransferred: number
): Promise<string> {
    if (
        sharedObject.l1Erc20Contract &&
        sharedObject.l1Erc20BridgeContract &&
        sharedObject.l1wallet
    ) {
        // Estimate the cost of the deposit transaction on L2
        const DEPOSIT_L2_GAS_LIMIT = 10_000_000;
        const feeData = await sharedObject.l1Provider.getFeeData();
        const gasPrice = feeData.gasPrice ? feeData.gasPrice : 0;
        console.log(
            "Current gas price on L1: ",
            ethers.formatUnits(gasPrice, "gwei"),
            "Gwei"
        );
        let expectedCost =
            await sharedObject.l1ZkSyncDiamondProxyContract.l2TransactionBaseCost(
                gasPrice,
                DEPOSIT_L2_GAS_LIMIT,
                Zkutils.DEFAULT_GAS_PER_PUBDATA_LIMIT
            );

        console.log(
            "Expected cost of deposit transaction on L2: ",
            ethers.formatEther(expectedCost),
            "CRO"
        );

        // Approve the bridge to spend CRO tokens
        // THe amount to approve is the sum of amount to be transferred plus 120% of the expected cost
        const amountToApprove =
            ethers.parseEther(amountTransferred.toString()) +
            (expectedCost * BigInt(120)) / BigInt(100);
        console.log(
            "CRO token address on L1:",
            await sharedObject.l1CroContract.getAddress()
        );
        console.log("Approving zkSync for spending CRO token on L1...");
        let tx = await sharedObject.l1CroContract.approve(
            await sharedObject.l1ZkSyncDiamondProxyContract.getAddress(),
            amountToApprove
        );
        await tx.wait();
        // Check allowance
        let allowance = await sharedObject.l1CroContract.allowance(
            sharedObject.l1wallet.address,
            await sharedObject.l1ZkSyncDiamondProxyContract.getAddress()
        );
        console.log("CRO allowance: ", ethers.formatEther(allowance), "CRO");

        // Making the deposit
        // function requestL2Transaction(
        //     L2Transaction memory _l2tx,
        //     bytes calldata _calldata,
        //     bytes[] calldata _factoryDeps,
        //     address _refundRecipient,
        //     uint256 _baseAmount
        // ) external payable nonReentrant senderCanCallFunction(s.allowList) returns (bytes32 canonicalTxHash) {
        console.log("Calling deposit function...");
        console.log("Destination address: ", sharedObject.l2wallet.address);
        console.log("Amount: ", amountTransferred.toString(), "CRO");
        console.log("L2 transaction request", {
            l2Contract: sharedObject.l2wallet.address,
            l2Value: 0,
            l2GasLimit: 1_000_000,
            l2GasPerPubdataByteLimit: 800,
        });
        tx =
            await sharedObject.l1ZkSyncDiamondProxyContract.requestL2Transaction(
                {
                    l2Contract: sharedObject.l2wallet.address,
                    l2Value: 0,
                    l2GasLimit: 1_000_000,
                    l2GasPerPubdataByteLimit: 800,
                },
                "0x",
                [],
                sharedObject.l2wallet.address,
                ethers.parseEther(amountTransferred.toString()),
                {
                    gasLimit: 210000,
                }
            );

        let receipt = await tx.wait();
        console.log("Deposit transaction hash: ", receipt.hash);
        return receipt.hash;
    }
    return "";
}

async function withdraw_cro_l2_to_l1(
    sharedObject: SharedObject,
    amountTransferred: number
) {
    // Withdraw CRO from L2 to L1
    console.log("withdrawing CRO....");
    console.log("CRO address on L2:", sharedObject.l2CroAddress);
    console.log("Recipient:", sharedObject.l1wallet.address);
    const withdrawL2 = await sharedObject.l2wallet.withdraw({
        token: sharedObject.l2CroAddress,
        amount: ethers.parseEther(amountTransferred.toString()),
        to: sharedObject.l1wallet.address,
    });

    const receipt = await withdrawL2.wait();
    console.log("Transaction hash on L2: ", receipt.hash);
    return receipt.hash;
}

// It may take a while before the withdrawal can be finalized on L1
// Use the basic script to check the status of the withdrawal transaction on L2
// In transactionDetails, the status must be 'verified' before the withdrawal can be finalized on L1
// TCRO contract on L1: https://sepolia.etherscan.io/token/0x1c815aca8daacdf46805fbFB9F08abD1D614773D
async function finalize_withdrawal_cro_l2_to_l1(
    sharedObject: SharedObject,
    hash: string
) {
    // Get the details of the batch on L1
    const {
        l1BatchNumber,
        l2MessageIndex,
        l2TxNumberInBlock,
        message,
        sender,
        proof,
    } = await sharedObject.l2wallet.finalizeWithdrawalParams(hash, 0);
    console.log("l1BatchNumber: ", l1BatchNumber);
    console.log("l2MessageIndex: ", l2MessageIndex);
    console.log("l2TxNumberInBlock: ", l2TxNumberInBlock);
    console.log("message: ", message);
    console.log("sender: ", sender);
    console.log("proof: ", proof);
    // Finalize the withdrawal
    console.log("Finalize withdrawal on L1...");
    let tx =
        await sharedObject.l1ZkSyncDiamondProxyContract.finalizeEthWithdrawal(
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
}

// Main script
async function main() {
    // User inputs
    const amountTransferred = 1;
    const sharedObject = await getSharedObject().catch(console.error);
    if (sharedObject) {
        await getBalances(sharedObject).catch(console.error);
        const l1hash = await deposit_erc20_l1_to_l2(
            sharedObject,
            amountTransferred
        ).catch(console.error);
        if (l1hash) {
            await get_l2tx_from_l1tx(sharedObject, l1hash).catch(console.error);
        }
        await getBalances(sharedObject).catch(console.error);
    }
}

async function main_dev() {
    // User inputs
    const amountTransferred = 1;
    const hash =
        "0xbf78bd9b655325c5c752e32c00e4851aa68b7160f07d270da60f3f3279065a0c";

    // Scripts
    const sharedObject = await getSharedObject().catch(console.error);
    if (sharedObject) {
        await getBalances(sharedObject).catch(console.error);
        // Select the function to run here
        // await deposit_erc20_l1_to_l2(sharedObject, amountTransferred).catch(
        //     console.error
        // );
        // await get_l2tx_from_l1tx(sharedObject, hash).catch(console.error);
        // const l2txhash = await withdraw_erc20_l2_to_l1(
        //     sharedObject,
        //     amountTransferred
        // ).catch(console.error);
        const l1txhash = await deposit_cro_l1_to_l2(
            sharedObject,
            amountTransferred
        ).catch(console.error);
        // await withdraw_cro_l2_to_l1(sharedObject, amountTransferred).catch(
        //     console.error
        // );
        // await finalize_withdrawal_cro_l2_to_l1(sharedObject, hash).catch(
        //     console.error
        // );
        await getBalances(sharedObject).catch(console.error);
    }
}

main_dev().catch(console.error);
