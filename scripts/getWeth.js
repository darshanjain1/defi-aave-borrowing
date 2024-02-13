const { getNamedAccounts, ethers } = require("hardhat");

const AMOUNT = ethers.parseEther("0.02")

async function getWeth(){
    const {deployer} = await getNamedAccounts();
    // To interact with any contract we need contracts abi & adddress
    // since we are using weth9 contract which is using using ^0.4.19 solidity version due to which we have defined 
    // IWeth interface in src/interfaces/IWeth.sol
    const impersonatedSigner = await ethers.getImpersonatedSigner(deployer);
    const iWeth = await ethers.getContractAt("IWeth", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",impersonatedSigner)   
    const tx = await iWeth.deposit({value: AMOUNT})
    await tx.wait(1)
    const wethBalance = await iWeth.balanceOf(impersonatedSigner)
    console.log(`Got ${wethBalance.toString()} WETH`);
}

module.exports = {getWeth, AMOUNT}