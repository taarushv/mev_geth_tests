
const { ethers, ContractFactory } = require("ethers");
const solc = require('solc')
const Web3 = require('web3');

const nodeRPC = "http://localhost:1112/"

const web3Client = new Web3(new Web3.providers.HttpProvider(nodeRPC))
const ethersProvider = new ethers.providers.JsonRpcProvider(nodeRPC);
const FAUCET_PK = "0x133be114715e5fe528a1b8adf36792160601a2d63ab59d1fd454275b31328791"
const FAUCET_ADDR = "0xd912AeCb07E9F4e1eA8E6b4779e7Fb6Aa1c3e4D8"
const TEST_PK = "0xc75f361a52bb1725fb6f8e927d78860223b232d9139eb5eedad5860cb2f4f2ab"
const TEST_ADDR = "0xc0E63d899D44C2F5C3F4169d737E622DF6C66d9f"
// random wallet
const user = ethers.Wallet.createRandom().connect(ethersProvider)

const testCases = ["accurateBaseFee", "accurateBaseFeeWithPriorityFee", "underpricedBaseFee"]



const delay = 20

const CONTRACT = `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
contract Bribe {
    function bribe() payable public {
        block.coinbase.transfer(msg.value);
    }
}
`
const INPUT = {
    language: 'Solidity',
    sources: {
      'Bribe.sol': {
        content: CONTRACT
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      }
    }
  }
const OUTPUT = JSON.parse(solc.compile(JSON.stringify(INPUT)))
const COMPILED = OUTPUT.contracts['Bribe.sol']
const ABI = COMPILED.Bribe.abi
const bytecode = '0x' + COMPILED.Bribe.evm.bytecode.object

const main = async() => {
    const blk = await ethersProvider.getBlockNumber()
    console.log(blk)
}
const getLatestBaseFee = async() => {
    const block = await web3Client.eth.getBlock("latest")
    return parseInt(block.baseFeePerGas)
}

const deployContract = async() => {
    //console.log(BIN)
    //console.log(await user.getFeeData())
    const baseFeePerGas = await getLatestBaseFee()
    const maxPriorityFeePerGas = 0
    const maxFeePerGas = maxPriorityFeePerGas + baseFeePerGas // anything extra is refunded anyway
    const deployContractTx = {
        value: 0,
        from: FAUCET_ADDR,
        data: bytecode,
        gasLimit: 200000,
        maxFeePerGas,
        maxPriorityFeePerGas
    }
    const faucetWallet = new ethers.Wallet(FAUCET_PK, ethersProvider)
    const deployTxSend = await faucetWallet.sendTransaction(deployContractTx)
    console.log('TX hash: ' + deployTxSend.hash)

    console.log('status: ')
    // const testHash = "0xffc8a107ecf4ef27ad912d1a1659f206bb33404fe781daef3355704f720332ae"
    // console.log(await ethersProvider.getTransaction(testHash))
}


const fundTestWallet = async() => {
    //console.log(await getLatestBaseFee())
    const baseFeePerGas = await getLatestBaseFee()
    const maxPriorityFeePerGas = 0
    const maxFeePerGas = maxPriorityFeePerGas + baseFeePerGas
    const faucetWallet = new ethers.Wallet(FAUCET_PK, ethersProvider)
    tx = {
        to: TEST_ADDR,
        value: ethers.utils.parseEther("10.0"),
        maxPriorityFeePerGas,
        maxFeePerGas
    }
      
    //console.log(faucetWallet)
    const balance = await ethersProvider.getBalance(TEST_ADDR);
    //console.log(balance.toString())
    const testHash = "0xffc8a107ecf4ef27ad912d1a1659f206bb33404fe781daef3355704f720332ae"
    console.log(await ethersProvider.getTransaction(testHash))
    //console.log(ethers.utils.parseUnits(balance.toString(), "ether").toString())
    //const txSend = await faucetWallet.sendTransaction(tx)
    //console.log(txSend)

}

const getFeeData = async () => {
    const feeData = await user.getFeeData()
    //console.log('priority', feeData.maxPriorityFeePerGas.toNumber())
    //console.log(user._signingKey())
    //console.log(await getLatestBaseFee())
    console.log(testCases[Math.floor(Math.random() * testCases.length)])
}
//setInterval(fundTestWallet, 1000)

try{
    //deployContract()
}catch(err){
    console.log(err)
}
