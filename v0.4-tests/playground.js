const { ethers } = require("ethers");
const nodeRPC = "http://localhost:1112/"
const ethersProvider = new ethers.providers.JsonRpcProvider(nodeRPC);
const zeroAddr = "0x0000000000000000000000000000000000000000"

const test = async () => {
    const balance = await ethersProvider.getBalance('0xfb2C208D463588C95D19526041B6E5a52d8521b7')
    console.log(balance)
}

test()
