const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("./getWeth");


async function main() {
  await getWeth();
  const { deployer } = await getNamedAccounts();
  const impersonatedSigner = await ethers.getImpersonatedSigner(deployer);
  const lendingPool = await getLendingPool(impersonatedSigner)
  const wethTokenAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
  console.log('lendingPool.target :>> ', lendingPool.target);
  await approveERC20Token(wethTokenAddress, lendingPool.target, impersonatedSigner, AMOUNT)
  console.log("Depositing WETH...")
  await lendingPool.deposit(wethTokenAddress, AMOUNT, impersonatedSigner, 0)
  console.log("Desposited!")
  const { totalDebtETH, availableBorrowsETH } = await getBorrowUserData(lendingPool, impersonatedSigner)
  // We want to borrow DAI token so, to know how much DAI token we can buy using weth we need to use chainink pricefeeds here
  // we are using DAI/ETH price feed deployed at address 0x773616E4d11A78F511299002da57A0a94577F1f4
  // This pricefeed will give how much ETH is 1 DAI
  const daiPrice = await getDaiPrice()
  const amountDaiToBorrow = availableBorrowsETH.toString() * (1 / daiPrice.toString()) * 0.75
  console.log(`You can borrow ${amountDaiToBorrow} DAI using ${availableBorrowsETH} available eth weth deposits`);
  const amountDaiToBorrowWei = ethers.parseEther(amountDaiToBorrow.toString())
  const daiTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  await borrowDai(daiTokenAddress,lendingPool,impersonatedSigner,amountDaiToBorrowWei)
  await getBorrowUserData(lendingPool,impersonatedSigner)
  await repay(lendingPool,daiTokenAddress,impersonatedSigner,amountDaiToBorrowWei)
  await getBorrowUserData(lendingPool,impersonatedSigner)
}

const getLendingPool = async (account) => {
  const lendingPoolAddressProvider = await ethers.getContractAt('ILendingPoolAddressesProvider', '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5', account)
  const lendingPoolAddress = await lendingPoolAddressProvider.getLendingPool()
  const lendingPool = await ethers.getContractAt('ILendingPool', lendingPoolAddress, account)
  return lendingPool
}

const approveERC20Token = async (wethTokenAddress, spender, signer, amount) => {
  const erc20Token = await ethers.getContractAt('IWeth', wethTokenAddress, signer)
  const transaction = await erc20Token.approve(spender, amount)
  await transaction.wait(1)
  console.log('Approved');
}

const getBorrowUserData = async (lendingPool, account) => {
  const [totalCollateralETH, totalDebtETH, availableBorrowsETH] = await lendingPool.getUserAccountData(account)
  console.log(`You have ${totalCollateralETH.toString()} worth of ETH deposited`);
  console.log(`You have borrowed ${totalDebtETH.toString()} worth of ETH`);
  console.log(`You have ${availableBorrowsETH.toString()} worth of ETH available to borrow`);
  return { totalDebtETH, availableBorrowsETH }
}

const getDaiPrice = async () => {
  const daiPriceFeed = await ethers.getContractAt('AggregatorV3Interface', "0x773616E4d11A78F511299002da57A0a94577F1f4")
  const price = (await daiPriceFeed.latestRoundData())[1]
  console.log(`DAI/ETH price is ${price.toString()}`);
  return price
}

// const borrowDai = async (lendingPool, daiTokenAddress, amountDaiToBorrowWei, impersonatedSigner) => {
//   const borrowTx = await lendingPool.borrow(daiTokenAddress, amountDaiToBorrowWei, 1, 0, impersonatedSigner)
//   await borrowTx.wait(1)
//     console.log('Borrowed DAI successfully!');
// }
async function borrowDai(daiAddress, lendingPool,account,amountDaiToBorrow) {
  const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrow, 2, 0, account)
  await borrowTx.wait(1)
  console.log("You've borrowed!")
}


const repay = async (lendingPool, daiTokenAddress,account,amount) => {
  // To repay dai, we need to lending pool to withdraw DAI token from account 
  await approveERC20Token(daiTokenAddress,lendingPool.target,account,amount)
  const repayTx = await lendingPool.repay(daiTokenAddress,amount,2,account)
  await repayTx.wait(1)
  console.log('Repaid!!')
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });