// To run:
// npx hardhat deploy-zksync --script deployMyERC20Token.ts --network cronosZkEvmTestnet

import * as dotenv from "dotenv";
import { Provider as ZkProvider, Wallet as ZkWallet } from "zksync-ethers";
import { ethers } from "ethers";

import { HardhatRuntimeEnvironment } from "hardhat/types";
// import {Deployer} from "@matterlabs/hardhat-zksync-deploy";
import { Deployer } from "@matterlabs/hardhat-zksync";

dotenv.config();

export default async function (hre: HardhatRuntimeEnvironment) {
  console.log(`Running deploy script`);
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

  // Create deployer object and load the artifact of the contract we want to deploy.
  const l2Deployer = new Deployer(hre, l2Wallet);

  // Load contract
  const artifact = await l2Deployer.loadArtifact("MyERC20Token");

  // Estimate contract deployment fee
  let deploymentFeeWei = await l2Deployer.estimateDeployFee(
    artifact,
    constructorArguments
  );

  // Gross up deploymentFee Bigint by a multiplier, if needed to avoid "out of gas" errors. The result must be a bigint
  deploymentFeeWei = (deploymentFeeWei * BigInt(100)) / BigInt(100);

  console.log(
    `Estimated deployment cost: ${ethers.formatEther(deploymentFeeWei)} ZKCRO`
  );

  // Check if the wallet has enough balance
  const balance = await l2Wallet.getBalance();
  if (balance < deploymentFeeWei)
    throw `Wallet balance is too low! Required ${ethers.formatEther(
      deploymentFeeWei
    )} ETH, but current ${l2Wallet.address} balance is ${ethers.formatEther(
      balance
    )} ETH`;

  // Deploy this contract. The returned object will be of a `Contract` type,
  // similar to the ones in `ethers`.
  const l2Contract = await l2Deployer.deploy(artifact, constructorArguments);
  const address = await l2Contract.getAddress();
  const constructorArgs =
    l2Contract.interface.encodeDeploy(constructorArguments);
  const fullContractSource = `${artifact.sourceName}:${artifact.contractName}`;

  // Display contract deployment info
  console.log(`\n"${artifact.contractName}" was successfully deployed:`);
  console.log(` - Contract address: ${address}`);
  console.log(` - Contract source: ${fullContractSource}`);
  console.log(` - Encoded constructor arguments: ${constructorArgs}\n`);

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
