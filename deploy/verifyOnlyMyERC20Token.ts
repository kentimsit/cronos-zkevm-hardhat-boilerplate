// To run:
// npx hardhat deploy-zksync --script verifyOnlyMyERC20Token.ts --network cronosZkEvmTestnet

import * as dotenv from "dotenv";
import { Provider as ZkProvider, Wallet as ZkWallet } from "zksync-ethers";
import { ethers } from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const CONTRACT_ARTIFACT = require("../artifacts-zk/contracts/MyERC20Token.sol/MyERC20Token.json");

dotenv.config();

export default async function (hre: HardhatRuntimeEnvironment) {
    console.log(`Running contract verification script`);
    const constructorArguments: any[] = [];

    // Initialize the wallet.
    const l1Provider = new ethers.JsonRpcProvider(
        process.env.ETHEREUM_SEPOLIA_URL
    );
    const l2Provider = new ZkProvider(process.env.CRONOS_ZKEVM_URL!);
    const l2Wallet = new ZkWallet(
        process.env.WALLET_PRIVATE_KEY!,
        l2Provider,
        l1Provider
    );

    // Contract details
    const l2Deployer = new Deployer(hre, l2Wallet);
    const artifact = await l2Deployer.loadArtifact("MyERC20Token");
    const address = "0xF2E7FE09F618E89f78b0D8067568eD7ACDf9f1cc";
    const fullContractSource = `${artifact.sourceName}:${artifact.contractName}`;
    const l2Contract = new ethers.Contract(
        address,
        CONTRACT_ARTIFACT.abi,
        l2Provider
    );
    const constructorArgs =
        l2Contract.interface.encodeDeploy(constructorArguments);

    // Display contract deployment info
    console.log(`\n"${artifact.contractName}" was successfully instantiated:`);
    console.log(` - Contract address: ${address}`);
    console.log(` - Contract source: ${fullContractSource}`);
    console.log(` - Encoded constructor arguments: ${constructorArgs}\n`);

    // Request contract verification
    console.log(`Requesting contract verification...`);
    const verificationData = {
        address,
        contract: fullContractSource,
        constructorArguments: constructorArgs,
        bytecode: artifact.bytecode,
    };
    const verificationRequestId: number = await hre.run("verify:verify", {
        ...verificationData,
        noCompile: true,
    });
    console.log("Verification request id:", verificationRequestId);
}
