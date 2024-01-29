import { run, ethers } from "hardhat";
import hre from "hardhat";

const contractName = "MyERC20Token";

async function main() {
    await run("compile");

    const accounts = await ethers.getSigners();

    console.log(
        "Accounts:",
        accounts.map((a) => a.address)
    );

    const myContract = await hre.ethers.getContractFactory(contractName);
    const contractInstance = await myContract.deploy();

    await contractInstance.waitForDeployment();
    const tx = contractInstance.deploymentTransaction();

    console.log(
        contractName,
        "contract deployed to:",
        await contractInstance.getAddress()
    );
    if (tx) {
        console.log("with transaction hash", tx.hash);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
